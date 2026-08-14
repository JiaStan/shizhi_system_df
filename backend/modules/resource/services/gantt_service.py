# -*- coding: utf-8 -*-
"""
Gantt 甘特图排程服务层
处理试制资源数智化管理系统甘特图排程的CRUD、冲突检测、关键路径计算等业务逻辑
"""
from typing import Optional, Dict, Any, List, Tuple
from decimal import Decimal
from datetime import datetime, timedelta
import math
import json
from backend.database import query_all, query_one, execute, execute_last_id
from backend.logger import logger


SCHEDULE_TYPES = ['A', 'B', 'C', 'sporadic']
SCHEDULE_PHASES = ['assembly', 'offline', 'debug', 'summer_verify', 'modify', 'inspection', 'delivery']
SCHEDULE_PRIORITIES = ['high', 'medium', 'low']
SCHEDULE_STATUSES = ['pending', 'in_progress', 'completed', 'overdue', 'cancelled']
ASSEMBLY_SITES = ['SZA', 'SZB', 'SZC', 'JP1', 'JP2', 'LH', 'CX1', 'CX2', 'CX', 'HM']
RESOURCE_TYPES = ['equipment', 'personnel', 'zone', 'lift', 'material', 'other']
CONFLICT_TYPES = ['resource_overlap', 'time_overlap', 'dependency_miss', 'deadline_risk', 'overload', 'other']
CONFLICT_SEVERITIES = ['critical', 'high', 'medium', 'low']
CONFLICT_STATUSES = ['open', 'in_review', 'resolved', 'ignored']
PHASE_TEXT = {
    'assembly': '装配', 'offline': '下线', 'debug': '调试', 'summer_verify': '夏标验证',
    'modify': '整改', 'inspection': '终检', 'delivery': '交付'
}
TYPE_COLOR = {
    'A': '#ef4444', 'B': '#3b82f6', 'C': '#10b981', 'sporadic': '#8b5cf6'
}
SLA_BY_LEVEL = {'critical': 4, 'high': 8, 'medium': 24, 'low': 72}


def _gen_schedule_code() -> str:
    """生成排程编号: SCH-YYYY-NNNN"""
    try:
        year = datetime.now().year
        row = query_one(
            "SELECT MAX(CAST(SUBSTRING_INDEX(schedule_code, '-', -1) AS UNSIGNED)) as max_seq "
            "FROM gantt_schedules WHERE schedule_code LIKE %s",
            (f"SCH-{year}-%",)
        )
        seq = (row.get('max_seq') or 0) + 1
        return f"SCH-{year}-{seq:04d}"
    except Exception as e:
        logger.error(f"生成排程编号失败: {e}")
        return f"SCH-{datetime.now().year}-{int(datetime.now().timestamp()) % 10000:04d}"


def _gen_conflict_code() -> str:
    """生成冲突编号: CFL-YYYY-NNNN"""
    try:
        year = datetime.now().year
        row = query_one(
            "SELECT MAX(CAST(SUBSTRING_INDEX(conflict_code, '-', -1) AS UNSIGNED)) as max_seq "
            "FROM gantt_conflicts WHERE conflict_code LIKE %s",
            (f"CFL-{year}-%",)
        )
        seq = (row.get('max_seq') or 0) + 1
        return f"CFL-{year}-{seq:04d}"
    except Exception as e:
        logger.error(f"生成冲突编号失败: {e}")
        return f"CFL-{datetime.now().year}-{int(datetime.now().timestamp()) % 10000:04d}"


def _gen_allocation_code() -> str:
    """生成资源分配编号: ALC-YYYYMMDD-NNN"""
    try:
        date_str = datetime.now().strftime('%Y%m%d')
        row = query_one(
            "SELECT MAX(CAST(SUBSTRING_INDEX(allocation_code, '-', -1) AS UNSIGNED)) as max_seq "
            "FROM gantt_resource_allocations WHERE allocation_code LIKE %s",
            (f"ALC-{date_str}-%",)
        )
        seq = (row.get('max_seq') or 0) + 1
        return f"ALC-{date_str}-{seq:03d}"
    except Exception as e:
        logger.error(f"生成分配编号失败: {e}")
        return f"ALC-{datetime.now().strftime('%Y%m%d')}-{int(datetime.now().timestamp()) % 1000:03d}"


def _parse_predecessors(predecessor_ids: Optional[str]) -> List[int]:
    """解析前置任务ID列表: 逗号分隔或JSON字符串"""
    if not predecessor_ids:
        return []
    try:
        if predecessor_ids.startswith('['):
            lst = json.loads(predecessor_ids)
            return [int(x) for x in lst if x is not None]
        return [int(x.strip()) for x in predecessor_ids.split(',') if x.strip()]
    except Exception:
        return []


def _serialize_predecessors(ids: List[int]) -> str:
    """将前置ID列表序列化为逗号分隔字符串"""
    return ','.join(str(x) for x in ids if x)


def _normalize_schedule(data: Dict[str, Any], existing: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    规范化排程数据：
    - 自动计算进度（除非progress_manual_override=1）
    - 根据计划起止时间自动计算计划工时
    """
    plan_start = data.get('plan_start_time', existing.get('plan_start_time') if existing else None)
    plan_end = data.get('plan_end_time', existing.get('plan_end_time') if existing else None)
    plan_hours = data.get('plan_work_hours', existing.get('plan_work_hours') if existing else None)
    actual_hours = data.get('actual_work_hours', existing.get('actual_work_hours') if existing else 0)
    manual_override = data.get('progress_manual_override',
                               existing.get('progress_manual_override') if existing else 0)

    if plan_start and plan_end and (plan_hours is None or plan_hours in (0, 0.0, '', None)):
        try:
            if isinstance(plan_start, str):
                plan_start = datetime.fromisoformat(plan_start.replace('Z', '+00:00'))
            if isinstance(plan_end, str):
                plan_end = datetime.fromisoformat(plan_end.replace('Z', '+00:00'))
            delta_h = round((plan_end - plan_start).total_seconds() / 3600.0, 2)
            if delta_h > 0:
                data['plan_work_hours'] = delta_h
        except Exception:
            pass

    if manual_override:
        return data

    cur_plan = data.get('plan_work_hours', plan_hours)
    cur_actual = data.get('actual_work_hours', actual_hours)
    if cur_plan is not None and cur_plan not in (0, 0.0, None, '') and cur_actual is not None:
        try:
            pf = float(cur_plan)
            af = float(cur_actual or 0)
            if pf > 0:
                data['progress'] = min(round(af / pf * 100, 2), 100.0)
        except Exception:
            pass
    elif 'progress' not in data and not existing:
        data['progress'] = 0

    return data


def _format_row(item: Dict[str, Any]) -> Dict[str, Any]:
    """格式化行数据: 时间字符串、Decimal转float等"""
    if not item:
        return item
    time_fields = [
        'plan_start_time', 'plan_end_time', 'actual_start_time', 'actual_end_time',
        'created_at', 'updated_at', 'constraint_date', 'detected_at', 'resolved_at',
        'start_time', 'end_time', 'overlap_start', 'overlap_end'
    ]
    for tf in time_fields:
        v = item.get(tf)
        if v and hasattr(v, 'strftime'):
            item[tf] = v.strftime('%Y-%m-%d %H:%M:%S')
        elif isinstance(v, datetime):
            item[tf] = v.strftime('%Y-%m-%d %H:%M:%S')
    dec_fields = [
        'plan_work_hours', 'actual_work_hours', 'progress', 'hours_allocated',
        'quantity', 'overlap_hours', 'slack_hours'
    ]
    for df in dec_fields:
        if item.get(df) is not None:
            item[df] = float(item[df])
    int_fields = [
        'lift_count', 'progress_manual_override', 'is_critical', 'has_conflict',
        'conflict_count', 'sort_order', 'task_id', 'parent_id'
    ]
    for i_f in int_fields:
        if item.get(i_f) is not None:
            item[i_f] = int(item[i_f])
    return item


def get_gantt_data(
    page: int = 1,
    page_size: int = 200,
    task_type: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    assembly_site: Optional[str] = None,
    keyword: str = "",
    only_critical: bool = False,
    only_conflict: bool = False,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
) -> Dict[str, Any]:
    """获取甘特图排程列表（分页+筛选）"""
    try:
        conditions = []
        params = []

        if task_type:
            conditions.append("gs.task_type = %s")
            params.append(task_type)
        if status:
            conditions.append("gs.status = %s")
            params.append(status)
        if priority:
            conditions.append("gs.priority = %s")
            params.append(priority)
        if assembly_site:
            conditions.append("gs.assembly_site = %s")
            params.append(assembly_site)
        if only_critical:
            conditions.append("gs.is_critical = 1")
        if only_conflict:
            conditions.append("gs.has_conflict = 1")
        if keyword:
            conditions.append("""(
                gs.schedule_code LIKE %s OR gs.task_code LIKE %s OR gs.task_name LIKE %s
                OR gs.project_code LIKE %s OR gs.vehicle_code LIKE %s OR gs.planner LIKE %s
            )""")
            sp = f"%{keyword}%"
            params.extend([sp] * 6)
        if date_from:
            conditions.append("gs.plan_end_time >= %s")
            params.append(date_from)
        if date_to:
            conditions.append("gs.plan_start_time <= %s")
            params.append(date_to)

        where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""

        count_sql = f"SELECT COUNT(*) as total FROM gantt_schedules gs {where_clause}"
        total_row = query_one(count_sql, params)
        total = total_row.get('total', 0) if total_row else 0

        offset = (page - 1) * page_size
        list_sql = f"""
            SELECT gs.*,
                   (SELECT COUNT(*) FROM gantt_resource_allocations ga WHERE ga.schedule_id = gs.id) as alloc_count
            FROM gantt_schedules gs
            {where_clause}
            ORDER BY gs.sort_order ASC, gs.plan_start_time ASC, gs.id ASC
            LIMIT %s OFFSET %s
        """
        list_params = params + [page_size, offset]
        data = query_all(list_sql, list_params) or []

        result = []
        for item in data:
            item = _format_row(dict(item))
            item['predecessors'] = _parse_predecessors(item.get('predecessor_ids'))
            item['phase_text'] = PHASE_TEXT.get(item.get('phase'), item.get('phase', ''))
            item['color'] = TYPE_COLOR.get(item.get('task_type'), '#6b7280')
            result.append(item)

        return {
            'list': result,
            'total': total,
            'page': page,
            'page_size': page_size
        }
    except Exception as e:
        logger.error(f"获取甘特图数据失败: {e}")
        return {'list': [], 'total': 0, 'page': page, 'page_size': page_size}


def _week_range(dt: datetime) -> Tuple[datetime, datetime]:
    """获取某日期所在周的周一和周日"""
    monday = dt - timedelta(days=dt.weekday())
    monday = monday.replace(hour=0, minute=0, second=0, microsecond=0)
    sunday = monday + timedelta(days=6, hours=23, minutes=59, seconds=59)
    return monday, sunday


def get_gantt_stats() -> Dict[str, Any]:
    """获取甘特图看板KPI统计数据"""
    try:
        result: Dict[str, Any] = {}

        result['total'] = (query_one("SELECT COUNT(*) as c FROM gantt_schedules") or {}).get('c', 0)
        for s in ['pending', 'in_progress', 'completed', 'overdue']:
            result[s] = (query_one(
                "SELECT COUNT(*) as c FROM gantt_schedules WHERE status = %s", (s,)
            ) or {}).get('c', 0)
        result['critical_path'] = (query_one(
            "SELECT COUNT(*) as c FROM gantt_schedules WHERE is_critical = 1"
        ) or {}).get('c', 0)
        result['conflicts_open'] = (query_one(
            "SELECT COUNT(*) as c FROM gantt_conflicts WHERE status = 'open'"
        ) or {}).get('c', 0)
        result['conflicts_critical'] = (query_one(
            "SELECT COUNT(*) as c FROM gantt_conflicts WHERE status = 'open' AND severity = 'critical'"
        ) or {}).get('c', 0)

        now = datetime.now()
        wk_start, wk_end = _week_range(now)
        result['this_week_start'] = (query_one(
            "SELECT COUNT(*) as c FROM gantt_schedules WHERE plan_start_time BETWEEN %s AND %s",
            (wk_start, wk_end)
        ) or {}).get('c', 0)
        result['this_week_end'] = (query_one(
            "SELECT COUNT(*) as c FROM gantt_schedules WHERE plan_end_time BETWEEN %s AND %s",
            (wk_start, wk_end)
        ) or {}).get('c', 0)

        type_rows = query_all("SELECT task_type, COUNT(*) as count FROM gantt_schedules GROUP BY task_type")
        result['type_distribution'] = type_rows or []

        status_rows = query_all("SELECT status, COUNT(*) as count FROM gantt_schedules GROUP BY status")
        result['status_distribution'] = status_rows or []

        site_rows = query_all("SELECT assembly_site, COUNT(*) as count FROM gantt_schedules GROUP BY assembly_site")
        result['site_distribution'] = site_rows or []

        phase_rows = query_all("SELECT phase, COUNT(*) as count FROM gantt_schedules GROUP BY phase")
        result['phase_distribution'] = phase_rows or []

        weekly_trend = []
        cur_monday, _ = _week_range(now)
        for i in range(7, -1, -1):
            wk_mon = cur_monday - timedelta(weeks=i)
            wk_sun = wk_mon + timedelta(days=6, hours=23, minutes=59, seconds=59)
            new_cnt = (query_one(
                "SELECT COUNT(*) as c FROM gantt_schedules WHERE plan_start_time BETWEEN %s AND %s",
                (wk_mon, wk_sun)
            ) or {}).get('c', 0)
            end_cnt = (query_one(
                "SELECT COUNT(*) as c FROM gantt_schedules WHERE plan_end_time BETWEEN %s AND %s",
                (wk_mon, wk_sun)
            ) or {}).get('c', 0)
            weekly_trend.append({
                'week_start': wk_mon.strftime('%Y-%m-%d'),
                'new': new_cnt,
                'end': end_cnt
            })
        result['weekly_trend'] = weekly_trend

        return result
    except Exception as e:
        logger.error(f"获取甘特图统计失败: {e}")
        return {}


def get_schedule_by_id(schedule_id_or_code) -> Optional[Dict[str, Any]]:
    """根据ID或排程编号获取排程详情"""
    try:
        sql_id = """
            SELECT gs.* FROM gantt_schedules gs WHERE gs.id = %s
        """
        sql_code = """
            SELECT gs.* FROM gantt_schedules gs WHERE gs.schedule_code = %s
        """
        row = None
        try:
            sid = int(schedule_id_or_code)
            row = query_one(sql_id, (sid,))
        except Exception:
            row = query_one(sql_code, (str(schedule_id_or_code),))

        if not row:
            return None

        item = _format_row(dict(row))
        sid = item['id']
        item['predecessors'] = _parse_predecessors(item.get('predecessor_ids'))

        allocs = query_all(
            "SELECT * FROM gantt_resource_allocations WHERE schedule_id = %s ORDER BY start_time",
            (sid,)
        )
        item['allocations'] = [_format_row(dict(a)) for a in (allocs or [])]

        conflicts = query_all(
            """SELECT * FROM gantt_conflicts
               WHERE (schedule_a_id = %s OR schedule_b_id = %s) AND status = 'open'
               ORDER BY detected_at DESC""",
            (sid, sid)
        )
        item['open_conflicts'] = [_format_row(dict(c)) for c in (conflicts or [])]

        return item
    except Exception as e:
        logger.error(f"获取排程详情失败: {e}, id={schedule_id_or_code}")
        return None


def _find_schedule_id(schedule_id_or_code) -> Optional[int]:
    """从ID或编号中解析出排程ID"""
    try:
        try:
            return int(schedule_id_or_code)
        except Exception:
            row = query_one(
                "SELECT id FROM gantt_schedules WHERE schedule_code = %s",
                (str(schedule_id_or_code),)
            )
            return row['id'] if row else None
    except Exception:
        return None


def create_schedule(data: Dict[str, Any]) -> Dict[str, Any]:
    """创建新排程"""
    try:
        if data.get('task_type') and data['task_type'] not in SCHEDULE_TYPES:
            raise ValueError(f"无效的任务类型: {data['task_type']}")
        if data.get('priority') and data['priority'] not in SCHEDULE_PRIORITIES:
            raise ValueError(f"无效的优先级: {data['priority']}")
        if data.get('status') and data['status'] not in SCHEDULE_STATUSES:
            raise ValueError(f"无效的状态: {data['status']}")
        if data.get('phase') and data['phase'] not in SCHEDULE_PHASES:
            raise ValueError(f"无效的阶段: {data['phase']}")
        if data.get('assembly_site') and data['assembly_site'] not in ASSEMBLY_SITES:
            raise ValueError(f"无效的装配场地: {data['assembly_site']}")

        data = _normalize_schedule(data)
        schedule_code = data.get('schedule_code') or _gen_schedule_code()

        pred_ids = data.get('predecessor_ids')
        if isinstance(pred_ids, list):
            pred_str = _serialize_predecessors([int(x) for x in pred_ids])
        else:
            pred_str = pred_ids if pred_ids else ''

        fields = [
            'schedule_code', 'task_id', 'task_code', 'task_name', 'task_type',
            'trial_type', 'project_group', 'project_code', 'vehicle_code', 'vehicle_model',
            'phase', 'priority', 'status', 'color_tag', 'assembly_site', 'zone_code',
            'lift_count', 'equipment_code', 'planner', 'pm_name', 'cve_name', 'trial_supervisor',
            'plan_start_time', 'plan_end_time', 'actual_start_time', 'actual_end_time',
            'plan_work_hours', 'actual_work_hours', 'progress', 'progress_manual_override',
            'parent_id', 'sort_order', 'constraint_type', 'constraint_date', 'predecessor_ids',
            'is_critical', 'slack_hours', 'has_conflict', 'conflict_count', 'remark', 'created_by'
        ]
        placeholders = ', '.join(['%s'] * len(fields))
        values = []
        for f in fields:
            if f == 'schedule_code':
                values.append(schedule_code)
            elif f == 'predecessor_ids':
                values.append(pred_str)
            elif f == 'is_critical':
                values.append(data.get('is_critical', 0))
            elif f == 'has_conflict':
                values.append(data.get('has_conflict', 0))
            elif f == 'conflict_count':
                values.append(data.get('conflict_count', 0))
            elif f == 'sort_order':
                values.append(data.get('sort_order', 0))
            elif f == 'progress':
                values.append(data.get('progress', 0))
            elif f == 'progress_manual_override':
                values.append(data.get('progress_manual_override', 0))
            elif f == 'status':
                values.append(data.get('status', 'pending'))
            elif f == 'task_type':
                values.append(data.get('task_type', 'C'))
            elif f == 'priority':
                values.append(data.get('priority', 'medium'))
            else:
                values.append(data.get(f))

        insert_sql = f"INSERT INTO gantt_schedules ({', '.join(fields)}) VALUES ({placeholders})"
        new_id = execute_last_id(insert_sql, tuple(values))
        logger.info(f"创建排程成功: {schedule_code}, ID: {new_id}")
        return get_schedule_by_id(new_id) or {}
    except ValueError:
        raise
    except Exception as e:
        logger.error(f"创建排程失败: {e}")
        return {}


def update_schedule(schedule_id_or_code, data: Dict[str, Any]) -> Dict[str, Any]:
    """更新排程信息"""
    try:
        sid = _find_schedule_id(schedule_id_or_code)
        if not sid:
            raise ValueError(f"排程 {schedule_id_or_code} 不存在")

        existing = get_schedule_by_id(sid)
        if not existing:
            raise ValueError(f"排程 {schedule_id_or_code} 不存在")

        if 'task_type' in data and data['task_type'] not in SCHEDULE_TYPES:
            raise ValueError(f"无效的任务类型: {data['task_type']}")
        if 'priority' in data and data['priority'] not in SCHEDULE_PRIORITIES:
            raise ValueError(f"无效的优先级: {data['priority']}")
        if 'status' in data and data['status'] not in SCHEDULE_STATUSES:
            raise ValueError(f"无效的状态: {data['status']}")
        if 'phase' in data and data['phase'] not in SCHEDULE_PHASES:
            raise ValueError(f"无效的阶段: {data['phase']}")

        data = _normalize_schedule(data, existing)

        if 'predecessor_ids' in data:
            pred_ids = data['predecessor_ids']
            if isinstance(pred_ids, list):
                data['predecessor_ids'] = _serialize_predecessors([int(x) for x in pred_ids])

        updatable = [
            'task_id', 'task_code', 'task_name', 'task_type', 'trial_type',
            'project_group', 'project_code', 'vehicle_code', 'vehicle_model',
            'phase', 'priority', 'status', 'color_tag', 'assembly_site', 'zone_code',
            'lift_count', 'equipment_code', 'planner', 'pm_name', 'cve_name', 'trial_supervisor',
            'plan_start_time', 'plan_end_time', 'actual_start_time', 'actual_end_time',
            'plan_work_hours', 'actual_work_hours', 'progress', 'progress_manual_override',
            'parent_id', 'sort_order', 'constraint_type', 'constraint_date', 'predecessor_ids',
            'is_critical', 'slack_hours', 'has_conflict', 'conflict_count', 'remark'
        ]
        update_fields = []
        update_params = []
        for f in updatable:
            if f in data:
                update_fields.append(f"{f} = %s")
                update_params.append(data[f])

        if not update_fields:
            return get_schedule_by_id(sid) or {}

        update_fields.append("updated_at = CURRENT_TIMESTAMP")
        update_sql = f"UPDATE gantt_schedules SET {', '.join(update_fields)} WHERE id = %s"
        update_params.append(sid)
        execute(update_sql, update_params)
        logger.info(f"更新排程: ID={sid}")
        return get_schedule_by_id(sid) or {}
    except ValueError:
        raise
    except Exception as e:
        logger.error(f"更新排程失败: {e}")
        return {}


def delete_schedule(schedule_id_or_code) -> Dict[str, Any]:
    """删除排程（含关联资源分配和关闭相关冲突）"""
    try:
        sid = _find_schedule_id(schedule_id_or_code)
        if not sid:
            raise ValueError(f"排程 {schedule_id_or_code} 不存在")

        row = query_one("SELECT schedule_code FROM gantt_schedules WHERE id = %s", (sid,))
        code = row['schedule_code'] if row else ''

        execute("DELETE FROM gantt_resource_allocations WHERE schedule_id = %s", (sid,))
        execute(
            "UPDATE gantt_conflicts SET status = 'ignored' WHERE schedule_a_id = %s OR schedule_b_id = %s",
            (sid, sid)
        )
        execute("DELETE FROM gantt_schedules WHERE id = %s", (sid,))
        logger.info(f"删除排程: {code}, ID={sid}")
        return {'deleted': True, 'schedule_code': code}
    except ValueError:
        raise
    except Exception as e:
        logger.error(f"删除排程失败: {e}")
        return {'deleted': False, 'schedule_code': ''}


def update_dependencies(schedule_id_or_code, predecessor_ids: List[int]) -> Dict[str, Any]:
    """更新排程的前置依赖（含环检测）"""
    try:
        sid = _find_schedule_id(schedule_id_or_code)
        if not sid:
            raise ValueError(f"排程 {schedule_id_or_code} 不存在")

        pred_ids = [int(x) for x in (predecessor_ids or [])]

        def _dfs_cycle_check(start: int, current: int, visited: set, stack: set) -> bool:
            visited.add(current)
            stack.add(current)
            r = query_one(
                "SELECT predecessor_ids FROM gantt_schedules WHERE id = %s",
                (current,)
            )
            preds = _parse_predecessors(r.get('predecessor_ids')) if r else []
            for p in preds:
                if p == start:
                    return True
                if p not in visited:
                    if _dfs_cycle_check(start, p, visited, stack):
                        return True
                elif p in stack:
                    return True
            stack.discard(current)
            return False

        orig_pred_row = query_one(
            "SELECT predecessor_ids FROM gantt_schedules WHERE id = %s", (sid,)
        )
        orig_pred_str = orig_pred_row.get('predecessor_ids') if orig_pred_row else None

        execute(
            "UPDATE gantt_schedules SET predecessor_ids = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s",
            (_serialize_predecessors(pred_ids), sid)
        )

        has_cycle = _dfs_cycle_check(sid, sid, set(), set())
        if has_cycle:
            execute(
                "UPDATE gantt_schedules SET predecessor_ids = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s",
                (orig_pred_str or '', sid)
            )
            raise ValueError(f"检测到依赖环：设置的前置任务会形成循环依赖，请检查后重试")

        logger.info(f"更新排程依赖: ID={sid}, preds={pred_ids}")
        return get_schedule_by_id(sid) or {}
    except ValueError:
        raise
    except Exception as e:
        logger.error(f"更新依赖失败: {e}")
        return {}


def list_allocations(
    schedule_id_or_code=None,
    resource_type: Optional[str] = None,
    resource_code: Optional[str] = None,
    status: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """查询资源分配列表"""
    try:
        conditions = []
        params = []

        if schedule_id_or_code is not None:
            sid = _find_schedule_id(schedule_id_or_code)
            if sid:
                conditions.append("ga.schedule_id = %s")
                params.append(sid)
            else:
                return []
        if resource_type:
            conditions.append("ga.resource_type = %s")
            params.append(resource_type)
        if resource_code:
            conditions.append("ga.resource_code = %s")
            params.append(resource_code)
        if status:
            conditions.append("ga.status = %s")
            params.append(status)

        where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""
        sql = f"""
            SELECT ga.*, gs.schedule_code, gs.task_name
            FROM gantt_resource_allocations ga
            LEFT JOIN gantt_schedules gs ON ga.schedule_id = gs.id
            {where_clause}
            ORDER BY ga.start_time ASC, ga.id ASC
        """
        rows = query_all(sql, params) or []
        return [_format_row(dict(r)) for r in rows]
    except Exception as e:
        logger.error(f"查询分配列表失败: {e}")
        return []


def add_allocation(data: Dict[str, Any]) -> Dict[str, Any]:
    """新增资源分配"""
    try:
        sid = _find_schedule_id(data.get('schedule_id') or data.get('schedule_code'))
        if not sid:
            raise ValueError(f"未找到关联排程: schedule_id={data.get('schedule_id')}")

        if data.get('resource_type') and data['resource_type'] not in RESOURCE_TYPES:
            raise ValueError(f"无效的资源类型: {data['resource_type']}")

        schedule_row = query_one(
            "SELECT schedule_code FROM gantt_schedules WHERE id = %s", (sid,)
        )
        schedule_code = schedule_row['schedule_code'] if schedule_row else ''

        allocation_code = data.get('allocation_code') or _gen_allocation_code()

        fields = [
            'allocation_code', 'schedule_id', 'schedule_code', 'resource_type',
            'resource_code', 'resource_name', 'start_time', 'end_time',
            'hours_allocated', 'quantity', 'status', 'remark'
        ]
        placeholders = ', '.join(['%s'] * len(fields))
        values = []
        for f in fields:
            if f == 'allocation_code':
                values.append(allocation_code)
            elif f == 'schedule_id':
                values.append(sid)
            elif f == 'schedule_code':
                values.append(schedule_code)
            elif f == 'status':
                values.append(data.get('status', 'planned'))
            else:
                values.append(data.get(f))

        sql = f"INSERT INTO gantt_resource_allocations ({', '.join(fields)}) VALUES ({placeholders})"
        new_id = execute_last_id(sql, tuple(values))
        logger.info(f"创建资源分配: {allocation_code}, ID={new_id}")
        row = query_one("SELECT * FROM gantt_resource_allocations WHERE id = %s", (new_id,))
        return _format_row(dict(row)) if row else {}
    except ValueError:
        raise
    except Exception as e:
        logger.error(f"新增资源分配失败: {e}")
        return {}


def remove_allocation(allocation_id: int) -> Dict[str, Any]:
    """删除资源分配"""
    try:
        aid = int(allocation_id)
        execute("DELETE FROM gantt_resource_allocations WHERE id = %s", (aid,))
        logger.info(f"删除资源分配: ID={aid}")
        return {'deleted': True}
    except Exception as e:
        logger.error(f"删除资源分配失败: {e}")
        return {'deleted': False}


def batch_allocate_allocations(schedule_id, allocations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """为某排程批量创建资源分配"""
    try:
        results = []
        for alloc in (allocations or []):
            alloc_data = dict(alloc)
            alloc_data['schedule_id'] = schedule_id
            r = add_allocation(alloc_data)
            if r:
                results.append(r)
        return results
    except Exception as e:
        logger.error(f"批量分配资源失败: {e}")
        return []


def _hours_between(a: datetime, b: datetime) -> float:
    """计算两时间点之间的小时数"""
    return (max(a, b) - min(a, b)).total_seconds() / 3600.0


def _ranges_overlap(s1: datetime, e1: datetime, s2: datetime, e2: datetime) -> bool:
    """判断两时间段是否重叠（仅端点接触不算重叠）"""
    return s1 < e2 and s2 < e1


def _overlap_range(s1: datetime, e1: datetime, s2: datetime, e2: datetime) -> Tuple[Optional[datetime], Optional[datetime], float]:
    """返回两时间段的重叠区间及重叠小时数"""
    ov_start = max(s1, s2)
    ov_end = min(e1, e2)
    if ov_start < ov_end:
        hours = (ov_end - ov_start).total_seconds() / 3600.0
        return ov_start, ov_end, round(hours, 2)
    return None, None, 0.0


def _parse_dt(val) -> Optional[datetime]:
    """解析datetime，兼容字符串和datetime对象"""
    if val is None:
        return None
    if isinstance(val, datetime):
        return val
    if hasattr(val, 'strftime'):
        return val
    try:
        s = str(val).strip()
        if 'T' in s:
            s = s.replace('Z', '+00:00')
        for fmt in (
            '%Y-%m-%d %H:%M:%S', '%Y-%m-%d %H:%M', '%Y-%m-%d',
            '%Y/%m/%d %H:%M:%S', '%Y/%m/%d'
        ):
            try:
                return datetime.strptime(s, fmt)
            except Exception:
                continue
        try:
            return datetime.fromisoformat(s)
        except Exception:
            return None
    except Exception:
        return None


def detect_conflicts(assembly_site: Optional[str] = None, auto_save: bool = True) -> List[Dict[str, Any]]:
    """核心冲突检测（独立实现）"""
    try:
        conflicts: List[Dict[str, Any]] = []

        schedule_where = "WHERE status <> 'cancelled'"
        params = []
        if assembly_site:
            schedule_where += " AND assembly_site = %s"
            params.append(assembly_site)

        schedules = query_all(f"SELECT * FROM gantt_schedules {schedule_where} ORDER BY id", params) or []
        sch_by_id: Dict[int, Dict[str, Any]] = {}
        for s in schedules:
            sd = dict(s)
            sd['_plan_start'] = _parse_dt(sd.get('plan_start_time'))
            sd['_plan_end'] = _parse_dt(sd.get('plan_end_time'))
            sch_by_id[sd['id']] = sd

        if auto_save:
            if assembly_site:
                execute(
                    "DELETE FROM gantt_conflicts WHERE status = 'open' AND assembly_site = %s",
                    (assembly_site,)
                )
                execute(
                    "UPDATE gantt_schedules SET has_conflict = 0, conflict_count = 0 WHERE assembly_site = %s",
                    (assembly_site,)
                )
            else:
                execute("DELETE FROM gantt_conflicts WHERE status = 'open'")
                execute("UPDATE gantt_schedules SET has_conflict = 0, conflict_count = 0")

        # c) Resource overlap
        alloc_sql = "SELECT ga.* FROM gantt_resource_allocations ga"
        alloc_where = []
        alloc_params = []
        if sch_by_id:
            ids = list(sch_by_id.keys())
            placeholders = ', '.join(['%s'] * len(ids))
            alloc_where.append(f"ga.schedule_id IN ({placeholders})")
            alloc_params.extend(ids)
        if alloc_where:
            alloc_sql += " WHERE " + " AND ".join(alloc_where)
        alloc_sql += " ORDER BY ga.resource_type, ga.resource_code, ga.start_time"

        allocs = query_all(alloc_sql, alloc_params) or []
        groups: Dict[Tuple[str, str], List[Dict[str, Any]]] = {}
        for a in allocs:
            ad = dict(a)
            ad['_start'] = _parse_dt(ad.get('start_time'))
            ad['_end'] = _parse_dt(ad.get('end_time'))
            key = (ad.get('resource_type', ''), ad.get('resource_code', ''))
            if key not in groups:
                groups[key] = []
            groups[key].append(ad)

        for (rtype, rcode), g_allocs in groups.items():
            if not rcode:
                continue
            n = len(g_allocs)
            for i in range(n):
                for j in range(i + 1, n):
                    a1, a2 = g_allocs[i], g_allocs[j]
                    if not a1['_start'] or not a1['_end'] or not a2['_start'] or not a2['_end']:
                        continue
                    if not _ranges_overlap(a1['_start'], a1['_end'], a2['_start'], a2['_end']):
                        continue
                    ov_s, ov_e, ov_h = _overlap_range(
                        a1['_start'], a1['_end'], a2['_start'], a2['_end']
                    )
                    if ov_h <= 0:
                        continue
                    if ov_h > 4:
                        sev = 'critical'
                    elif ov_h > 1:
                        sev = 'medium'
                    elif ov_h > 0.5:
                        sev = 'low'
                    else:
                        continue

                    s1 = sch_by_id.get(a1.get('schedule_id'))
                    s2 = sch_by_id.get(a2.get('schedule_id'))
                    if not s1 or not s2:
                        continue

                    name_a = s1.get('task_name', '')
                    name_b = s2.get('task_name', '')
                    start_a_s = s1['_plan_start'].strftime('%m-%d %H:%M') if s1.get('_plan_start') else ''
                    end_a_s = s1['_plan_end'].strftime('%m-%d %H:%M') if s1.get('_plan_end') else ''
                    rtype_name_map = {'equipment': '设备', 'personnel': '人员', 'zone': '区域',
                                      'lift': '吊车', 'material': '物料', 'other': '资源'}
                    suggestion = (
                        f"建议将{name_a}（{start_a_s}~{end_a_s}）改期至{name_b}之后，"
                        f"或更换为其他{rtype_name_map.get(rtype, rtype)}"
                    )

                    conflicts.append({
                        'conflict_type': 'resource_overlap',
                        'severity': sev,
                        'schedule_a_id': s1['id'],
                        'schedule_a_code': s1.get('schedule_code', ''),
                        'schedule_a_name': name_a,
                        'schedule_b_id': s2['id'],
                        'schedule_b_code': s2.get('schedule_code', ''),
                        'schedule_b_name': name_b,
                        'resource_type': rtype,
                        'resource_code': rcode,
                        'resource_name': a1.get('resource_name', a2.get('resource_name', '')),
                        'overlap_start': ov_s,
                        'overlap_end': ov_e,
                        'overlap_hours': ov_h,
                        'suggestion': suggestion,
                        'status': 'open',
                        'assembly_site': s1.get('assembly_site') or s2.get('assembly_site'),
                        'detected_at': datetime.now()
                    })

        # d) Dependency miss
        for sch in sch_by_id.values():
            preds = _parse_predecessors(sch.get('predecessor_ids'))
            if not preds:
                continue
            my_start = sch.get('_plan_start')
            if not my_start:
                continue
            for pid in preds:
                pred_sch = sch_by_id.get(pid)
                if not pred_sch:
                    continue
                pred_end = pred_sch.get('_plan_end')
                if pred_end and pred_end > my_start:
                    name_pred = pred_sch.get('task_name', '')
                    name_curr = sch.get('task_name', '')
                    suggestion = (
                        f"调整{name_curr}前置任务{name_pred}的结束时间，或延后{name_curr}的开始时间"
                    )
                    conflicts.append({
                        'conflict_type': 'dependency_miss',
                        'severity': 'high',
                        'schedule_a_id': pred_sch['id'],
                        'schedule_a_code': pred_sch.get('schedule_code', ''),
                        'schedule_a_name': name_pred,
                        'schedule_b_id': sch['id'],
                        'schedule_b_code': sch.get('schedule_code', ''),
                        'schedule_b_name': name_curr,
                        'resource_type': None,
                        'resource_code': None,
                        'resource_name': None,
                        'overlap_start': pred_end,
                        'overlap_end': my_start,
                        'overlap_hours': _hours_between(pred_end, my_start),
                        'suggestion': suggestion,
                        'status': 'open',
                        'assembly_site': sch.get('assembly_site'),
                        'detected_at': datetime.now()
                    })

        # e) Deadline risk
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        for sch in sch_by_id.values():
            st = sch.get('status')
            if st not in ('pending', 'in_progress'):
                continue
            plan_end = sch.get('_plan_end')
            if not plan_end:
                continue
            delta_days = (today - plan_end.replace(hour=0, minute=0, second=0, microsecond=0)).days
            if delta_days > 3:
                sev = 'critical'
            elif delta_days > 1:
                sev = 'medium'
            else:
                continue
            name_sch = sch.get('task_name', '')
            suggestion = f"加快{name_sch}进度或拆分任务优先解决关键环节"
            conflicts.append({
                'conflict_type': 'deadline_risk',
                'severity': sev,
                'schedule_a_id': sch['id'],
                'schedule_a_code': sch.get('schedule_code', ''),
                'schedule_a_name': name_sch,
                'schedule_b_id': None,
                'schedule_b_code': None,
                'schedule_b_name': None,
                'resource_type': None,
                'resource_code': None,
                'resource_name': None,
                'overlap_start': plan_end,
                'overlap_end': today,
                'overlap_hours': delta_days * 24,
                'suggestion': suggestion,
                'status': 'open',
                'assembly_site': sch.get('assembly_site'),
                'detected_at': datetime.now()
            })

        # f) 同场地设备/区域重叠
        site_groups: Dict[Tuple[str, str], List[Dict[str, Any]]] = {}
        for sch in sch_by_id.values():
            site = sch.get('assembly_site')
            equip = sch.get('equipment_code')
            zone = sch.get('zone_code')
            if site and equip:
                key = (site, f'E:{equip}')
                site_groups.setdefault(key, []).append(sch)
            if site and zone:
                key = (site, f'Z:{zone}')
                site_groups.setdefault(key, []).append(sch)

        for (site, res_key), sg in site_groups.items():
            if len(sg) < 2:
                continue
            m = len(sg)
            for i in range(m):
                for j in range(i + 1, m):
                    s1, s2 = sg[i], sg[j]
                    if s1.get('parent_id') == s2['id'] or s2.get('parent_id') == s1['id']:
                        continue
                    st1, et1 = s1.get('_plan_start'), s1.get('_plan_end')
                    st2, et2 = s2.get('_plan_start'), s2.get('_plan_end')
                    if not st1 or not et1 or not st2 or not et2:
                        continue
                    ov_s, ov_e, ov_h = _overlap_range(st1, et1, st2, et2)
                    if ov_h > 2:
                        sev = 'medium' if ov_h <= 4 else 'high'
                        name_a = s1.get('task_name', '')
                        name_b = s2.get('task_name', '')
                        suggestion = (
                            f"建议将{name_a}与{name_b}在同一{res_key.split(':',1)[0]}的时间错开，"
                            f"当前重叠{ov_h:.1f}小时"
                        )
                        conflicts.append({
                            'conflict_type': 'time_overlap',
                            'severity': sev,
                            'schedule_a_id': s1['id'],
                            'schedule_a_code': s1.get('schedule_code', ''),
                            'schedule_a_name': name_a,
                            'schedule_b_id': s2['id'],
                            'schedule_b_code': s2.get('schedule_code', ''),
                            'schedule_b_name': name_b,
                            'resource_type': 'zone' if res_key.startswith('Z:') else 'equipment',
                            'resource_code': res_key.split(':', 1)[1] if ':' in res_key else res_key,
                            'resource_name': None,
                            'overlap_start': ov_s,
                            'overlap_end': ov_e,
                            'overlap_hours': ov_h,
                            'suggestion': suggestion,
                            'status': 'open',
                            'assembly_site': site,
                            'detected_at': datetime.now()
                        })

        if auto_save:
            involved: Dict[int, int] = {}
            for c in conflicts:
                code = _gen_conflict_code()
                fields = [
                    'conflict_code', 'conflict_type', 'severity',
                    'schedule_a_id', 'schedule_a_code', 'schedule_a_name',
                    'schedule_b_id', 'schedule_b_code', 'schedule_b_name',
                    'resource_type', 'resource_code', 'resource_name',
                    'overlap_start', 'overlap_end', 'overlap_hours',
                    'suggestion', 'status', 'assembly_site', 'detected_at'
                ]
                values = [code]
                for f in fields[1:]:
                    values.append(c.get(f))
                placeholders = ', '.join(['%s'] * len(fields))
                insert_sql = f"INSERT INTO gantt_conflicts ({', '.join(fields)}) VALUES ({placeholders})"
                try:
                    execute(insert_sql, tuple(values))
                except Exception as ie:
                    logger.error(f"保存冲突失败: {ie}, code={code}")
                    continue
                for k in ('schedule_a_id', 'schedule_b_id'):
                    sid_v = c.get(k)
                    if sid_v and isinstance(sid_v, int) and sid_v in sch_by_id:
                        involved[sid_v] = involved.get(sid_v, 0) + 1

            for sid_v, cnt in involved.items():
                execute(
                    "UPDATE gantt_schedules SET has_conflict = 1, conflict_count = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s",
                    (cnt, sid_v)
                )

        serialized = []
        for c in conflicts:
            d = dict(c)
            if 'detected_at' in d and isinstance(d['detected_at'], datetime):
                d['detected_at'] = d['detected_at'].strftime('%Y-%m-%d %H:%M:%S')
            if d.get('overlap_start') and isinstance(d['overlap_start'], datetime):
                d['overlap_start'] = d['overlap_start'].strftime('%Y-%m-%d %H:%M:%S')
            if d.get('overlap_end') and isinstance(d['overlap_end'], datetime):
                d['overlap_end'] = d['overlap_end'].strftime('%Y-%m-%d %H:%M:%S')
            serialized.append(d)

        return serialized
    except Exception as e:
        logger.error(f"冲突检测失败: {e}")
        return []


def list_conflicts(
    conflict_type: Optional[str] = None,
    severity: Optional[str] = None,
    status: Optional[str] = None,
    assembly_site: Optional[str] = None,
    schedule_id=None,
    page: int = 1,
    page_size: int = 50,
) -> Dict[str, Any]:
    """分页查询冲突列表"""
    try:
        conditions = []
        params = []
        if conflict_type:
            conditions.append("conflict_type = %s")
            params.append(conflict_type)
        if severity:
            conditions.append("severity = %s")
            params.append(severity)
        if status:
            conditions.append("status = %s")
            params.append(status)
        if assembly_site:
            conditions.append("assembly_site = %s")
            params.append(assembly_site)
        if schedule_id is not None:
            sid = _find_schedule_id(schedule_id)
            if sid:
                conditions.append("(schedule_a_id = %s OR schedule_b_id = %s)")
                params.append(sid)
                params.append(sid)

        where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""

        total_row = query_one(f"SELECT COUNT(*) as c FROM gantt_conflicts {where_clause}", params)
        total = total_row.get('c', 0) if total_row else 0

        offset = (page - 1) * page_size
        sql = f"""
            SELECT * FROM gantt_conflicts
            {where_clause}
            ORDER BY
                CASE severity
                    WHEN 'critical' THEN 1
                    WHEN 'high' THEN 2
                    WHEN 'medium' THEN 3
                    ELSE 4
                END ASC,
                detected_at DESC
            LIMIT %s OFFSET %s
        """
        qparams = params + [page_size, offset]
        rows = query_all(sql, qparams) or []
        data = [_format_row(dict(r)) for r in rows]

        return {
            'list': data,
            'total': total,
            'page': page,
            'page_size': page_size
        }
    except Exception as e:
        logger.error(f"查询冲突列表失败: {e}")
        return {'list': [], 'total': 0, 'page': page, 'page_size': page_size}


def _find_conflict_id(cid_or_code):
    try:
        try:
            return int(cid_or_code), 'id'
        except Exception:
            row = query_one(
                "SELECT id FROM gantt_conflicts WHERE conflict_code = %s",
                (str(cid_or_code),)
            )
            return (row['id'], 'code') if row else (None, None)
    except Exception:
        return None, None


def resolve_conflict(conflict_id_or_code, resolution: str, resolved_by: Optional[str] = None) -> Dict[str, Any]:
    """解决冲突"""
    try:
        cid, _ = _find_conflict_id(conflict_id_or_code)
        if not cid:
            raise ValueError(f"冲突 {conflict_id_or_code} 不存在")

        now = datetime.now()
        execute(
            """UPDATE gantt_conflicts
               SET status = 'resolved', resolution = %s, resolved_by = %s, resolved_at = %s
               WHERE id = %s""",
            (resolution, resolved_by, now, cid)
        )

        row = query_one(
            "SELECT schedule_a_id, schedule_b_id FROM gantt_conflicts WHERE id = %s", (cid,)
        )
        if row:
            for sid_key in ('schedule_a_id', 'schedule_b_id'):
                sid_v = row.get(sid_key)
                if sid_v:
                    remain = (query_one(
                        """SELECT COUNT(*) as c FROM gantt_conflicts
                           WHERE status = 'open' AND (schedule_a_id = %s OR schedule_b_id = %s)""",
                        (sid_v, sid_v)
                    ) or {}).get('c', 0)
                    if remain <= 0:
                        execute(
                            "UPDATE gantt_schedules SET has_conflict = 0, conflict_count = 0, updated_at = CURRENT_TIMESTAMP WHERE id = %s",
                            (sid_v,)
                        )
                    else:
                        execute(
                            "UPDATE gantt_schedules SET conflict_count = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s",
                            (remain, sid_v)
                        )

        logger.info(f"解决冲突: ID={cid}, by={resolved_by}")
        r = query_one("SELECT * FROM gantt_conflicts WHERE id = %s", (cid,))
        return _format_row(dict(r)) if r else {}
    except ValueError:
        raise
    except Exception as e:
        logger.error(f"解决冲突失败: {e}")
        return {}


def ignore_conflict(conflict_id_or_code, reason: Optional[str] = None, by: Optional[str] = None) -> Dict[str, Any]:
    """忽略冲突"""
    try:
        cid, _ = _find_conflict_id(conflict_id_or_code)
        if not cid:
            raise ValueError(f"冲突 {conflict_id_or_code} 不存在")

        now = datetime.now()
        execute(
            """UPDATE gantt_conflicts
               SET status = 'ignored', resolution = %s, resolved_by = %s, resolved_at = %s
               WHERE id = %s""",
            (reason, by, now, cid)
        )

        row = query_one(
            "SELECT schedule_a_id, schedule_b_id FROM gantt_conflicts WHERE id = %s", (cid,)
        )
        if row:
            for sid_key in ('schedule_a_id', 'schedule_b_id'):
                sid_v = row.get(sid_key)
                if sid_v:
                    remain = (query_one(
                        """SELECT COUNT(*) as c FROM gantt_conflicts
                           WHERE status = 'open' AND (schedule_a_id = %s OR schedule_b_id = %s)""",
                        (sid_v, sid_v)
                    ) or {}).get('c', 0)
                    if remain <= 0:
                        execute(
                            "UPDATE gantt_schedules SET has_conflict = 0, conflict_count = 0, updated_at = CURRENT_TIMESTAMP WHERE id = %s",
                            (sid_v,)
                        )
                    else:
                        execute(
                            "UPDATE gantt_schedules SET conflict_count = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s",
                            (remain, sid_v)
                        )

        logger.info(f"忽略冲突: ID={cid}, by={by}")
        r = query_one("SELECT * FROM gantt_conflicts WHERE id = %s", (cid,))
        return _format_row(dict(r)) if r else {}
    except ValueError:
        raise
    except Exception as e:
        logger.error(f"忽略冲突失败: {e}")
        return {}


def compute_critical_path() -> Dict[str, Any]:
    """关键路径计算（拓扑排序DAG，独立实现）"""
    try:
        schedules = query_all(
            "SELECT * FROM gantt_schedules WHERE status <> 'cancelled' ORDER BY id"
        ) or []
        if not schedules:
            return {'critical_count': 0, 'updated_count': 0, 'critical_ids': []}

        sch_list: List[Dict[str, Any]] = []
        id_to_idx: Dict[int, int] = {}
        for idx, s in enumerate(schedules):
            sd = dict(s)
            sd['_ps'] = _parse_dt(sd.get('plan_start_time'))
            sd['_pe'] = _parse_dt(sd.get('plan_end_time'))
            dur = sd.get('plan_work_hours')
            if dur is None or dur in (0, 0.0, ''):
                if sd['_ps'] and sd['_pe']:
                    dur = _hours_between(sd['_ps'], sd['_pe'])
                else:
                    dur = 0.0
            sd['_dur'] = float(dur or 0)
            sch_list.append(sd)
            id_to_idx[sd['id']] = idx

        n = len(sch_list)
        successors: List[List[int]] = [[] for _ in range(n)]
        predecessors: List[List[int]] = [[] for _ in range(n)]
        in_degree: List[int] = [0] * n

        baseline_epoch_h: Optional[float] = None
        for i, sd in enumerate(sch_list):
            if sd['_ps'] is not None:
                h = sd['_ps'].timestamp() / 3600.0
                if baseline_epoch_h is None or h < baseline_epoch_h:
                    baseline_epoch_h = h
        if baseline_epoch_h is None:
            baseline_epoch_h = 0.0

        for i, sd in enumerate(sch_list):
            preds = _parse_predecessors(sd.get('predecessor_ids'))
            for pid in preds:
                if pid in id_to_idx:
                    j = id_to_idx[pid]
                    successors[j].append(i)
                    predecessors[i].append(j)
                    in_degree[i] += 1

        topo_order: List[int] = []
        from collections import deque
        q = deque()
        for i in range(n):
            if in_degree[i] == 0:
                q.append(i)
        temp_deg = list(in_degree)
        while q:
            u = q.popleft()
            topo_order.append(u)
            for v in successors[u]:
                temp_deg[v] -= 1
                if temp_deg[v] == 0:
                    q.append(v)

        ES: List[float] = [0.0] * n
        EF: List[float] = [0.0] * n
        for i in topo_order:
            sd = sch_list[i]
            if predecessors[i]:
                es_val = 0.0
                for j in predecessors[i]:
                    if EF[j] > es_val:
                        es_val = EF[j]
                ES[i] = es_val
            else:
                if sd['_ps'] is not None:
                    ES[i] = (sd['_ps'].timestamp() / 3600.0) - baseline_epoch_h
                else:
                    ES[i] = 0.0
            EF[i] = ES[i] + sd['_dur']

        LF: List[float] = [0.0] * n
        LS: List[float] = [0.0] * n
        max_ef = max(EF) if EF else 0.0
        for i in range(n):
            LF[i] = max_ef
        for i in reversed(topo_order):
            if successors[i]:
                lf_val = max_ef
                for j in successors[i]:
                    if LS[j] < lf_val:
                        lf_val = LS[j]
                LF[i] = lf_val
            LS[i] = LF[i] - sch_list[i]['_dur']

        critical_ids: List[int] = []
        critical_count = 0
        updated_count = 0
        for i, sd in enumerate(sch_list):
            slack = LS[i] - ES[i]
            is_critical = 1 if slack < 0.5 else 0
            if is_critical:
                critical_count += 1
                critical_ids.append(sd['id'])
            execute(
                "UPDATE gantt_schedules SET is_critical = %s, slack_hours = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s",
                (is_critical, round(slack, 2), sd['id'])
            )
            updated_count += 1

        logger.info(f"关键路径计算完成: 关键任务{critical_count}个, 更新{updated_count}个")
        return {
            'critical_count': critical_count,
            'updated_count': updated_count,
            'critical_ids': critical_ids
        }
    except Exception as e:
        logger.error(f"关键路径计算失败: {e}")
        return {'critical_count': 0, 'updated_count': 0, 'critical_ids': []}


def batch_update_status(schedule_ids: List[int], new_status: str, by: Optional[str] = None) -> Dict[str, Any]:
    """批量更新排程状态"""
    try:
        if new_status not in SCHEDULE_STATUSES:
            raise ValueError(f"无效的状态: {new_status}")

        updated = 0
        now = datetime.now()
        for sid in schedule_ids:
            row = query_one(
                "SELECT status, actual_start_time, actual_end_time, progress_manual_override "
                "FROM gantt_schedules WHERE id = %s",
                (sid,)
            )
            if not row:
                continue
            cur_status = row.get('status')
            actual_start = row.get('actual_start_time')
            actual_end = row.get('actual_end_time')
            manual_override = row.get('progress_manual_override') or 0

            updates = {'status': new_status}
            if new_status == 'in_progress' and not actual_start:
                updates['actual_start_time'] = now
            if new_status == 'completed':
                if not actual_start and cur_status == 'pending':
                    updates['actual_start_time'] = now
                if not actual_end:
                    updates['actual_end_time'] = now
                if not manual_override:
                    updates['progress'] = 100

            upd_fields = []
            upd_params = []
            for k, v in updates.items():
                upd_fields.append(f"{k} = %s")
                upd_params.append(v)
            upd_fields.append("updated_at = CURRENT_TIMESTAMP")
            upd_params.append(sid)
            execute(
                f"UPDATE gantt_schedules SET {', '.join(upd_fields)} WHERE id = %s",
                tuple(upd_params)
            )
            updated += 1

        logger.info(f"批量更新排程状态: {updated}个 -> {new_status}")
        return {'updated': updated, 'status': new_status}
    except ValueError:
        raise
    except Exception as e:
        logger.error(f"批量更新状态失败: {e}")
        return {'updated': 0, 'status': new_status}
