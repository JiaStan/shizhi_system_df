# -*- coding: utf-8 -*-
"""
任务管理服务层
处理任务的CRUD操作、状态管理、统计数据等业务逻辑
"""
from typing import Optional, Dict, Any
from decimal import Decimal
from datetime import datetime
from backend.database import query_all, query_one, execute, execute_last_id
from backend.logger import logger


TASK_TYPES = ['A', 'B', 'C', 'sporadic']
TASK_STATUSES = ['pending', 'in_progress', 'completed', 'overdue']
TASK_PRIORITIES = ['high', 'medium', 'low']
TASK_SOURCES = ['operation', 'manual', 'mes']
TRIAL_TYPES = ['骡子车', 'ET0', 'ET', 'ET1', '软模车', 'FT0', 'MT1', 'MT2', 'MT3', 'MT4', 'MT5']
ASSEMBLY_SITES = ['SZA', 'SZB', 'SZC', 'JP1', 'JP2', 'LH', 'CX1', 'CX2', 'CX', 'HM']


def _normalize_progress(data: Dict[str, Any], existing: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    根据计划/实际工时自动计算进度，除非用户手动覆盖。
    同时处理 progress_manual_override 字段。
    """
    plan = data.get('plan_work_hours', existing.get('plan_work_hours') if existing else None)
    actual = data.get('actual_work_hours', existing.get('actual_work_hours') if existing else 0)
    manual_override = data.get('progress_manual_override',
                               existing.get('progress_manual_override') if existing else 0)
    if manual_override:
        # 用户手动覆盖模式：保留传入的 progress
        return data
    # 自动计算模式
    if plan is not None and plan not in (0, 0.0, None, '') and actual is not None:
        try:
            plan_f = float(plan)
            actual_f = float(actual or 0)
            if plan_f > 0:
                auto_p = min(round(actual_f / plan_f * 100, 2), 100.0)
                data['progress'] = auto_p
        except Exception:
            pass
    elif 'progress' not in data and not existing:
        data['progress'] = 0
    return data


def get_task_list(
    page: int = 1,
    page_size: int = 20,
    task_type: Optional[str] = None,
    trial_type: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    zone_code: Optional[str] = None,
    assembly_site: Optional[str] = None,
    keyword: str = "",
) -> Dict[str, Any]:
    """
    获取任务列表（支持筛选、分页、搜索）
    """
    conditions = []
    params = []

    if task_type:
        conditions.append("t.task_type = %s")
        params.append(task_type)

    if trial_type:
        if trial_type == 'MT':
            conditions.append("t.trial_type LIKE %s")
            params.append('MT%')
        else:
            conditions.append("t.trial_type = %s")
            params.append(trial_type)

    if status:
        conditions.append("t.status = %s")
        params.append(status)

    if priority:
        conditions.append("t.priority = %s")
        params.append(priority)

    if zone_code:
        conditions.append("(t.zone_code = %s OR t.assembly_site = %s)")
        params.append(zone_code)
        params.append(zone_code)

    if assembly_site:
        conditions.append("t.assembly_site = %s")
        params.append(assembly_site)

    if keyword:
        conditions.append("""(
            t.task_code LIKE %s OR t.task_name LIKE %s OR t.project_code LIKE %s
            OR t.vehicle_code LIKE %s OR t.project_group LIKE %s OR t.planner LIKE %s
        )""")
        search_param = f"%{keyword}%"
        params.extend([search_param] * 6)

    where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""

    count_sql = f"SELECT COUNT(*) as total FROM tasks t {where_clause}"
    total_result = query_one(count_sql, params)
    total = total_result['total'] if total_result else 0

    offset = (page - 1) * page_size
    list_sql = f"""
        SELECT
            t.id, t.task_code, t.task_name, t.task_type, t.trial_type, t.project_group,
            t.project_code, t.vehicle_code, t.vehicle_model, t.priority, t.status,
            t.zone_code, t.assembly_site, t.lift_count, t.equipment_code,
            t.planner, t.pm_name, t.cve_name, t.trial_supervisor, t.process_supervisor,
            t.assembly_supervisor, t.plan_start_time, t.plan_end_time,
            t.plan_work_hours, t.actual_work_hours, t.progress, t.progress_manual_override,
            t.summer_target_count, t.summer_target_date, t.source, t.created_at, t.updated_at,
            z.zone_name, e.equipment_name
        FROM tasks t
        LEFT JOIN zones z ON t.zone_code = z.zone_code
        LEFT JOIN equipment e ON t.equipment_code = e.equipment_code
        {where_clause}
        ORDER BY t.created_at DESC, t.id DESC
        LIMIT %s OFFSET %s
    """
    list_params = params + [page_size, offset]
    data = query_all(list_sql, list_params)

    for item in data:
        for time_field in ['plan_start_time', 'plan_end_time', 'created_at', 'updated_at', 'summer_target_date']:
            v = item.get(time_field)
            if v and hasattr(v, 'strftime'):
                item[time_field] = v.strftime('%Y-%m-%d' if 'date' in time_field.lower() and 'time' not in time_field.lower() else '%Y-%m-%d %H:%M:%S')
        for dec_field in ['plan_work_hours', 'actual_work_hours', 'progress']:
            if item.get(dec_field) is not None:
                item[dec_field] = float(item[dec_field])
        for int_field in ['lift_count', 'summer_target_count', 'progress_manual_override']:
            if item.get(int_field) is not None:
                item[int_field] = int(item[int_field])

    return {
        'total': total,
        'page': page,
        'page_size': page_size,
        'data': data
    }


def get_task_by_id(task_id: int) -> Optional[Dict[str, Any]]:
    """根据任务ID获取任务详情"""
    sql = """
        SELECT t.*, z.zone_name, e.equipment_name
        FROM tasks t
        LEFT JOIN zones z ON t.zone_code = z.zone_code
        LEFT JOIN equipment e ON t.equipment_code = e.equipment_code
        WHERE t.id = %s
    """
    result = query_one(sql, (task_id,))

    if result:
        for time_field in ['plan_start_time', 'plan_end_time', 'created_at', 'updated_at']:
            v = result.get(time_field)
            if v and hasattr(v, 'strftime'):
                result[time_field] = v.strftime('%Y-%m-%d %H:%M:%S')
        if result.get('summer_target_date') and hasattr(result['summer_target_date'], 'strftime'):
            result['summer_target_date'] = result['summer_target_date'].strftime('%Y-%m-%d')
        for dec_field in ['plan_work_hours', 'actual_work_hours', 'progress']:
            if result.get(dec_field) is not None:
                result[dec_field] = float(result[dec_field])
        for int_field in ['lift_count', 'summer_target_count', 'progress_manual_override']:
            if result.get(int_field) is not None:
                result[int_field] = int(result[int_field])

    return result


def create_task(data: Dict[str, Any]) -> Dict[str, Any]:
    """创建任务"""
    exists = query_one("SELECT id FROM tasks WHERE task_code = %s", (data['task_code'],))
    if exists:
        raise ValueError(f"任务编号 {data['task_code']} 已存在")

    if data.get('task_type') and data['task_type'] not in TASK_TYPES:
        raise ValueError(f"无效的任务类型: {data['task_type']}，有效值为: {TASK_TYPES}")
    if data.get('priority') and data['priority'] not in TASK_PRIORITIES:
        raise ValueError(f"无效的优先级: {data['priority']}")
    if data.get('status') and data['status'] not in TASK_STATUSES:
        raise ValueError(f"无效的状态: {data['status']}")
    if data.get('source') and data['source'] not in TASK_SOURCES:
        raise ValueError(f"无效的数据来源: {data['source']}")

    data = _normalize_progress(data)

    insert_sql = """
        INSERT INTO tasks
        (task_code, task_name, task_type, trial_type, project_group, project_code,
         vehicle_code, vehicle_model, priority, status, zone_code, assembly_site,
         lift_count, equipment_code, planner, pm_name, cve_name, trial_supervisor,
         process_supervisor, assembly_supervisor, plan_start_time, plan_end_time,
         plan_work_hours, actual_work_hours, progress, progress_manual_override,
         summer_target_count, summer_target_date, source)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """
    new_id = execute_last_id(insert_sql, (
        data['task_code'], data['task_name'],
        data.get('task_type', 'C'),
        data.get('trial_type'),
        data.get('project_group'),
        data.get('project_code'),
        data.get('vehicle_code'),
        data.get('vehicle_model'),
        data.get('priority', 'medium'),
        data.get('status', 'pending'),
        data.get('zone_code'),
        data.get('assembly_site'),
        data.get('lift_count'),
        data.get('equipment_code'),
        data.get('planner'),
        data.get('pm_name'),
        data.get('cve_name'),
        data.get('trial_supervisor'),
        data.get('process_supervisor'),
        data.get('assembly_supervisor'),
        data.get('plan_start_time'),
        data.get('plan_end_time'),
        data.get('plan_work_hours'),
        data.get('actual_work_hours', 0),
        data.get('progress', 0),
        data.get('progress_manual_override', 0),
        data.get('summer_target_count'),
        data.get('summer_target_date'),
        data.get('source', 'manual')
    ))

    logger.info(f"创建任务成功: {data['task_code']}, ID: {new_id}")
    return get_task_by_id(new_id)


def update_task(task_id: int, data: Dict[str, Any]) -> Dict[str, Any]:
    """更新任务信息"""
    existing = get_task_by_id(task_id)
    if not existing:
        raise ValueError(f"任务 ID {task_id} 不存在")

    if 'task_type' in data and data['task_type'] not in TASK_TYPES:
        raise ValueError(f"无效的任务类型: {data['task_type']}")
    if 'status' in data and data['status'] not in TASK_STATUSES:
        raise ValueError(f"无效的状态: {data['status']}")
    if 'priority' in data and data['priority'] not in TASK_PRIORITIES:
        raise ValueError(f"无效的优先级: {data['priority']}")

    data = _normalize_progress(data, existing)

    all_fields = [
        'task_name', 'task_type', 'trial_type', 'project_group', 'project_code',
        'vehicle_code', 'vehicle_model', 'priority', 'status', 'zone_code',
        'assembly_site', 'lift_count', 'equipment_code', 'planner', 'pm_name',
        'cve_name', 'trial_supervisor', 'process_supervisor', 'assembly_supervisor',
        'plan_start_time', 'plan_end_time', 'plan_work_hours', 'actual_work_hours',
        'progress', 'progress_manual_override', 'summer_target_count', 'summer_target_date', 'source'
    ]
    update_fields = []
    update_params = []
    for field in all_fields:
        if field in data:
            update_fields.append(f"{field} = %s")
            update_params.append(data[field])

    if update_fields:
        update_fields.append("updated_at = CURRENT_TIMESTAMP")
        update_sql = f"UPDATE tasks SET {', '.join(update_fields)} WHERE id = %s"
        update_params.append(task_id)
        execute(update_sql, update_params)
        logger.info(f"更新任务信息: ID={task_id}")

    return get_task_by_id(task_id)


def delete_task(task_id: int) -> bool:
    """删除任务"""
    existing = get_task_by_id(task_id)
    if not existing:
        raise ValueError(f"任务 ID {task_id} 不存在")
    execute("DELETE FROM tasks WHERE id = %s", (task_id,))
    logger.info(f"删除任务: ID={task_id}")
    return True


def get_task_stats() -> Dict[str, Any]:
    """获取任务看板KPI统计数据"""
    status_data = query_all("SELECT status, COUNT(*) as count FROM tasks GROUP BY status")
    status_counts = {x['status']: x['count'] for x in status_data}

    priority_data = query_all("SELECT priority, COUNT(*) as count FROM tasks GROUP BY priority")
    priority_counts = {x['priority']: x['count'] for x in priority_data}

    type_data = query_all("SELECT task_type, COUNT(*) as count FROM tasks GROUP BY task_type")
    type_counts = {x['task_type']: x['count'] for x in type_data}

    total = (query_one("SELECT COUNT(*) as total FROM tasks") or {}).get('total', 0)

    hours_result = query_one("""
        SELECT COALESCE(SUM(plan_work_hours),0) total_plan_hours,
               COALESCE(SUM(actual_work_hours),0) total_actual_hours,
               COALESCE(AVG(progress),0) avg_progress
        FROM tasks
    """) or {}
    total_plan_hours = float(hours_result.get('total_plan_hours', 0) or 0)
    total_actual_hours = float(hours_result.get('total_actual_hours', 0) or 0)
    avg_progress = float(hours_result.get('avg_progress', 0) or 0)

    return {
        'total': total,
        'pending': status_counts.get('pending', 0),
        'in_progress': status_counts.get('in_progress', 0),
        'completed': status_counts.get('completed', 0),
        'overdue': status_counts.get('overdue', 0),
        'high_priority': priority_counts.get('high', 0),
        'medium_priority': priority_counts.get('medium', 0),
        'low_priority': priority_counts.get('low', 0),
        'type_a': type_counts.get('A', 0),
        'type_b': type_counts.get('B', 0),
        'type_c': type_counts.get('C', 0),
        'type_sporadic': type_counts.get('sporadic', 0),
        'total_plan_hours': total_plan_hours,
        'total_actual_hours': total_actual_hours,
        'avg_progress': avg_progress,
        'status_distribution': status_data,
        'priority_distribution': priority_data,
        'type_distribution': type_data
    }


def get_status_distribution() -> Dict[str, Any]:
    """获取任务状态分布（饼图用）"""
    data = query_all("SELECT status, COUNT(*) as count FROM tasks GROUP BY status")
    label_map = {
        'pending': '待开始', 'in_progress': '进行中',
        'completed': '已完成', 'overdue': '逾期'
    }
    color_map = {
        'pending': '#94a3b8', 'in_progress': '#3b82f6',
        'completed': '#10b981', 'overdue': '#ef4444'
    }
    result = []
    for item in data:
        result.append({
            'name': label_map.get(item['status'], item['status']),
            'value': item['count'],
            'color': color_map.get(item['status'], '#6b7280')
        })
    return {'data': result}


def get_type_vs_progress() -> Dict[str, Any]:
    """获取任务类型与进度对比（柱状图用）"""
    data = query_all("""
        SELECT task_type, COUNT(*) as count,
               COALESCE(AVG(progress), 0) as avg_progress,
               COALESCE(SUM(plan_work_hours), 0) as total_plan_hours,
               COALESCE(SUM(actual_work_hours), 0) as total_actual_hours
        FROM tasks GROUP BY task_type
    """)
    label_map = {
        'A': 'A类任务', 'B': 'B类任务', 'C': 'C类任务', 'sporadic': '零星试制'
    }
    color_map = {
        'A': '#ef4444', 'B': '#f59e0b', 'C': '#3b82f6', 'sporadic': '#22c55e'
    }
    result = []
    for item in data:
        result.append({
            'type': label_map.get(item['task_type'], item['task_type']),
            'type_code': item['task_type'],
            'count': item['count'],
            'avg_progress': float(item['avg_progress']) if item['avg_progress'] is not None else 0,
            'total_plan_hours': float(item['total_plan_hours']) if item['total_plan_hours'] is not None else 0,
            'total_actual_hours': float(item['total_actual_hours']) if item['total_actual_hours'] is not None else 0,
            'color': color_map.get(item['task_type'], '#6b7280')
        })
    # 保证类型顺序固定，缺少的补 0
    ordered = []
    for code in ['A', 'B', 'C', 'sporadic']:
        found = next((r for r in result if r['type_code'] == code), None)
        if found:
            ordered.append(found)
        else:
            ordered.append({
                'type': label_map[code], 'type_code': code,
                'count': 0, 'avg_progress': 0,
                'total_plan_hours': 0, 'total_actual_hours': 0,
                'color': color_map[code]
            })
    return {'data': ordered}


def get_department_tasks(department: Optional[str] = None) -> Dict[str, Any]:
    """部门维度任务统计（按装配场地维度代替部门）"""
    sql = """
        SELECT assembly_site as dept, task_type, COUNT(*) as count,
               COALESCE(AVG(progress),0) avg_progress
        FROM tasks
        WHERE assembly_site IS NOT NULL AND assembly_site <> ''
        GROUP BY assembly_site, task_type
        ORDER BY assembly_site, task_type
    """
    data = query_all(sql)
    return {'data': data}


def get_monthly_trend(year: Optional[int] = None) -> Dict[str, Any]:
    """按月度任务数量趋势"""
    if not year:
        year = datetime.now().year
    sql = """
        SELECT MONTH(plan_start_time) as m, COUNT(*) as cnt,
               COALESCE(SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END),0) done_cnt
        FROM tasks
        WHERE plan_start_time IS NOT NULL AND YEAR(plan_start_time) = %s
        GROUP BY MONTH(plan_start_time)
        ORDER BY m
    """
    data = query_all(sql, (year,))
    months = [{'month': m, 'count': 0, 'done_count': 0} for m in range(1, 13)]
    for row in data:
        idx = int(row['m']) - 1
        if 0 <= idx < 12:
            months[idx]['count'] = row['cnt']
            months[idx]['done_count'] = row['done_cnt']
    return {'year': year, 'data': months}
