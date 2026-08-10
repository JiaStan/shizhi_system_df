# -*- coding: utf-8 -*-
"""
人员看板服务层
处理人员的CRUD操作、状态统计、来源分布、看板数据等业务逻辑
"""
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from backend.database import query_all, query_one, execute, execute_last_id
from backend.logger import logger


# 装配区编码列表（显示"来源"列的区域）
ASSEMBLY_ZONES = {'SZA', 'SZB', 'SZC', 'LH'}

# 有效人员来源
VALID_SOURCES = {'自有', '商用车', '乘用车', '柳汽', '中智', '外协', '内调'}


def _is_assembly_zone(zone_code: Optional[str]) -> bool:
    """判断是否为装配区（装配区显示来源列）"""
    return bool(zone_code and zone_code in ASSEMBLY_ZONES)


def get_personnel_list(
    page: int = 1,
    page_size: int = 20,
    status: Optional[str] = None,
    current_zone: Optional[str] = None,
    department: Optional[str] = None,
    keyword: str = "",
) -> Dict[str, Any]:
    """
    获取人员列表（支持筛选、分页、搜索）

    Args:
        page: 页码
        page_size: 每页数量
        status: 人员状态筛选: working/idle/offline
        current_zone: 所在区域筛选
        department: 人员来源/部门筛选
        keyword: 搜索关键词（姓名/工号）

    Returns:
        包含总数和人员列表的字典
    """
    conditions = []
    params = []

    if status:
        conditions.append("p.status = %s")
        params.append(status)

    if current_zone:
        conditions.append("p.current_zone = %s")
        params.append(current_zone)

    if department:
        conditions.append("p.department = %s")
        params.append(department)

    if keyword:
        conditions.append("(p.personnel_code LIKE %s OR p.name LIKE %s)")
        search_param = f"%{keyword}%"
        params.extend([search_param, search_param])

    where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""

    # 查询总数
    count_sql = f"""
        SELECT COUNT(*) as total
        FROM personnel p
        {where_clause}
    """
    total_result = query_one(count_sql, params)
    total = total_result['total'] if total_result else 0

    # 查询列表
    offset = (page - 1) * page_size
    list_sql = f"""
        SELECT
            p.id,
            p.personnel_code,
            p.name,
            p.avatar_text,
            p.department,
            p.status,
            p.current_zone,
            p.current_task_id,
            p.entry_time,
            p.last_update_time,
            p.created_at,
            z.zone_name,
            t.task_name as current_task_name,
            /* 计算今日工时（简单模拟：工作中8小时，空闲/离线0小时） */
            CASE
                WHEN p.status = 'working' THEN 8.0
                ELSE 0.0
            END as today_work_hours
        FROM personnel p
        LEFT JOIN zones z ON p.current_zone = z.zone_code
        LEFT JOIN tasks t ON p.current_task_id = t.id
        {where_clause}
        ORDER BY p.personnel_code
        LIMIT %s OFFSET %s
    """
    list_params = params + [page_size, offset]
    data = query_all(list_sql, list_params)

    # 转换datetime为字符串，标记是否装配区
    for item in data:
        item['is_assembly_zone'] = _is_assembly_zone(item.get('current_zone'))
        # 今日工时默认值
        if item.get('today_work_hours') is None:
            item['today_work_hours'] = 0.0
        for time_field in ['entry_time', 'last_update_time', 'created_at']:
            if item.get(time_field) and hasattr(item[time_field], 'strftime'):
                item[time_field] = item[time_field].strftime('%Y-%m-%d %H:%M:%S')

    return {
        'total': total,
        'page': page,
        'page_size': page_size,
        'data': data
    }


def get_personnel_by_code(personnel_code: str) -> Optional[Dict[str, Any]]:
    """
    根据工号获取人员详情

    Args:
        personnel_code: 工号

    Returns:
        人员详情字典
    """
    sql = """
        SELECT
            p.*,
            z.zone_name,
            t.task_name as current_task_name,
            t.project_code,
            t.vehicle_code,
            t.progress as task_progress,
            CASE
                WHEN p.status = 'working' THEN 8.0
                ELSE 0.0
            END as today_work_hours,
            /* 完成任务数（简单模拟） */
            0 as completed_tasks,
            0 as in_progress_tasks
        FROM personnel p
        LEFT JOIN zones z ON p.current_zone = z.zone_code
        LEFT JOIN tasks t ON p.current_task_id = t.id
        WHERE p.personnel_code = %s
    """
    result = query_one(sql, (personnel_code,))

    if result:
        result['is_assembly_zone'] = _is_assembly_zone(result.get('current_zone'))
        if result.get('today_work_hours') is None:
            result['today_work_hours'] = 0.0
        for time_field in ['entry_time', 'last_update_time', 'created_at', 'updated_at']:
            if result.get(time_field) and hasattr(result[time_field], 'strftime'):
                result[time_field] = result[time_field].strftime('%Y-%m-%d %H:%M:%S')

    return result


def create_personnel(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    新增人员

    Args:
        data: 人员数据

    Returns:
        新创建的人员信息
    """
    # 检查工号是否已存在
    exists_sql = "SELECT id FROM personnel WHERE personnel_code = %s"
    exists = query_one(exists_sql, (data['personnel_code'],))
    if exists:
        raise ValueError(f"工号 {data['personnel_code']} 已存在")

    # 检查来源是否合法
    if data.get('department') and data['department'] not in VALID_SOURCES:
        raise ValueError(f"无效的人员来源: {data['department']}，有效值为: {sorted(VALID_SOURCES)}")

    # 如果未设置头像文字，默认用姓名第一个字
    avatar_text = data.get('avatar_text') or data['name'][:1]

    # 插入人员
    insert_sql = """
        INSERT INTO personnel
        (personnel_code, name, avatar_text, department, status, current_zone, entry_time)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    """
    entry_time = data.get('entry_time') or datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    new_id = execute_last_id(insert_sql, (
        data['personnel_code'],
        data['name'],
        avatar_text,
        data.get('department'),
        data.get('status', 'offline'),
        data.get('current_zone'),
        entry_time
    ))

    logger.info(f"创建人员成功: {data['personnel_code']} {data['name']}, ID: {new_id}")

    return get_personnel_by_code(data['personnel_code'])


def update_personnel(personnel_code: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """
    更新人员信息

    Args:
        personnel_code: 工号
        data: 更新数据

    Returns:
        更新后的人员信息
    """
    # 检查人员是否存在
    existing = get_personnel_by_code(personnel_code)
    if not existing:
        raise ValueError(f"工号 {personnel_code} 不存在")

    # 检查来源是否合法
    if 'department' in data and data['department'] and data['department'] not in VALID_SOURCES:
        raise ValueError(f"无效的人员来源: {data['department']}")

    # 检查状态是否合法
    if 'status' in data and data['status']:
        valid_statuses = ['working', 'idle', 'offline']
        if data['status'] not in valid_statuses:
            raise ValueError(f"无效的状态值: {data['status']}，有效值为: {valid_statuses}")

    # 构建更新语句
    update_fields = []
    update_params = []

    for field in ['name', 'avatar_text', 'department', 'status', 'current_zone', 'current_task_id']:
        if field in data and data[field] is not None:
            update_fields.append(f"{field} = %s")
            update_params.append(data[field])

    if update_fields:
        update_sql = f"""
            UPDATE personnel
            SET {', '.join(update_fields)}
            WHERE personnel_code = %s
        """
        update_params.append(personnel_code)
        execute(update_sql, update_params)
        logger.info(f"更新人员信息: {personnel_code}")

    return get_personnel_by_code(personnel_code)


def delete_personnel(personnel_code: str) -> bool:
    """
    删除人员

    Args:
        personnel_code: 工号

    Returns:
        是否删除成功
    """
    # 检查人员是否存在
    existing = get_personnel_by_code(personnel_code)
    if not existing:
        raise ValueError(f"工号 {personnel_code} 不存在")

    # 删除人员
    delete_sql = "DELETE FROM personnel WHERE personnel_code = %s"
    execute(delete_sql, (personnel_code,))

    logger.info(f"删除人员: {personnel_code}")
    return True


def update_personnel_status(personnel_code: str, status: str, current_zone: Optional[str] = None) -> Dict[str, Any]:
    """
    更新人员状态

    Args:
        personnel_code: 工号
        status: 新状态
        current_zone: 所在区域（可选）

    Returns:
        更新后的人员信息
    """
    existing = get_personnel_by_code(personnel_code)
    if not existing:
        raise ValueError(f"工号 {personnel_code} 不存在")

    valid_statuses = ['working', 'idle', 'offline']
    if status not in valid_statuses:
        raise ValueError(f"无效的状态值: {status}")

    if current_zone:
        update_sql = """
            UPDATE personnel
            SET status = %s, current_zone = %s
            WHERE personnel_code = %s
        """
        execute(update_sql, (status, current_zone, personnel_code))
    else:
        update_sql = """
            UPDATE personnel
            SET status = %s
            WHERE personnel_code = %s
        """
        execute(update_sql, (status, personnel_code))

    logger.info(f"更新人员状态: {personnel_code} -> {status}")
    return get_personnel_by_code(personnel_code)


def get_personnel_stats() -> Dict[str, Any]:
    """
    获取人员看板KPI统计数据

    Returns:
        KPI统计数据
    """
    # 按状态统计
    status_sql = """
        SELECT status, COUNT(*) as count
        FROM personnel
        GROUP BY status
    """
    status_data = query_all(status_sql)

    status_dist = {}
    for item in status_data:
        status_dist[item['status']] = item['count']

    total = sum(status_dist.values())
    working = status_dist.get('working', 0)
    idle = status_dist.get('idle', 0)
    offline = status_dist.get('offline', 0)

    # 在岗人数 = working + idle
    on_duty = working + idle
    # 空闲可调配 = idle
    idle_available = idle
    # 今日异常（简单模拟：离线人员数）
    today_abnormal = offline

    # 按区域统计
    zone_sql = """
        SELECT
            COALESCE(p.current_zone, '未分配') as zone_code,
            z.zone_name,
            COUNT(*) as count
        FROM personnel p
        LEFT JOIN zones z ON p.current_zone = z.zone_code
        GROUP BY p.current_zone, z.zone_name
        ORDER BY count DESC
    """
    zone_distribution = query_all(zone_sql)

    return {
        'total': total,
        'on_duty': on_duty,
        'working': working,
        'idle': idle,
        'offline': offline,
        'idle_available': idle_available,
        'today_abnormal': today_abnormal,
        'status_distribution': status_data,
        'zone_distribution': zone_distribution
    }


def get_source_distribution() -> Dict[str, Any]:
    """
    获取人员来源分布数据（装配区+非装配区分组）

    Returns:
        来源分布统计（饼图和柱状图用）
    """
    # 装配区来源分布（饼图）
    source_sql = """
        SELECT
            COALESCE(NULLIF(p.department, ''), '未标注') as source,
            COUNT(*) as count,
            SUM(CASE WHEN p.status = 'working' THEN 1 ELSE 0 END) as working_count
        FROM personnel p
        WHERE p.current_zone IN ('SZA', 'SZB', 'SZC', 'LH')
        GROUP BY p.department
        ORDER BY count DESC
    """
    assembly_source_dist = query_all(source_sql)

    # 装配区各来源平均工时柱状图（模拟数据）
    source_hours_sql = """
        SELECT
            COALESCE(NULLIF(p.department, ''), '未标注') as source,
            COUNT(*) as personnel_count,
            ROUND(AVG(CASE WHEN p.status = 'working' THEN 8.0 ELSE 0.0 END), 1) as avg_hours
        FROM personnel p
        WHERE p.current_zone IN ('SZA', 'SZB', 'SZC', 'LH')
        GROUP BY p.department
        ORDER BY personnel_count DESC
    """
    assembly_source_stats = query_all(source_hours_sql)

    # 非装配区（留白的来源列）分布
    non_assembly_sql = """
        SELECT
            COALESCE(CASE WHEN p.current_zone IS NULL THEN '未分配' ELSE p.current_zone END, '未分配') as zone,
            COUNT(*) as count
        FROM personnel p
        WHERE p.current_zone IS NULL OR p.current_zone NOT IN ('SZA', 'SZB', 'SZC', 'LH')
        GROUP BY p.current_zone
        ORDER BY count DESC
    """
    non_assembly_dist = query_all(non_assembly_sql)

    return {
        'assembly_source_pie': assembly_source_dist,
        'assembly_source_bar': assembly_source_stats,
        'non_assembly_distribution': non_assembly_dist
    }


def get_personnel_map() -> Dict[str, Any]:
    """
    获取人员位置分布数据（园区地图覆盖层用）

    Returns:
        各区域人员数量及明细
    """
    # 各区域人员数量
    zone_count_sql = """
        SELECT
            p.current_zone as zone_code,
            z.zone_name,
            COUNT(*) as total_count,
            SUM(CASE WHEN p.status = 'working' THEN 1 ELSE 0 END) as working_count,
            SUM(CASE WHEN p.status = 'idle' THEN 1 ELSE 0 END) as idle_count
        FROM personnel p
        LEFT JOIN zones z ON p.current_zone = z.zone_code
        WHERE p.current_zone IS NOT NULL
        GROUP BY p.current_zone, z.zone_name
    """
    zone_summary = query_all(zone_count_sql)

    # 人员明细
    list_sql = """
        SELECT
            p.personnel_code,
            p.name,
            p.avatar_text,
            p.department,
            p.status,
            p.current_zone
        FROM personnel p
        WHERE p.current_zone IS NOT NULL
        ORDER BY p.current_zone, p.status, p.personnel_code
    """
    personnel_positions = query_all(list_sql)

    return {
        'zone_summary': zone_summary,
        'personnel_positions': personnel_positions
    }
