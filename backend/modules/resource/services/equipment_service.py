# -*- coding: utf-8 -*-
"""
设备台账服务层
处理设备的CRUD操作、状态管理、维护记录等业务逻辑
"""
from typing import Optional, List, Dict, Any
from backend.database import query_all, query_one, execute, execute_last_id
from backend.logger import logger


def get_equipment_list(
    page: int = 1,
    page_size: int = 20,
    status: Optional[str] = None,
    zone_code: Optional[str] = None,
    equipment_type: Optional[str] = None,
    keyword: str = "",
) -> Dict[str, Any]:
    """
    获取设备列表（支持筛选、分页、搜索）
    
    Args:
        page: 页码
        page_size: 每页数量
        status: 设备状态筛选
        zone_code: 区域编码筛选
        equipment_type: 设备类型筛选
        keyword: 搜索关键词
    
    Returns:
        包含总数和设备列表的字典
    """
    conditions = []
    params = []
    
    if status:
        conditions.append("e.status = %s")
        params.append(status)
    
    if zone_code:
        conditions.append("e.zone_code = %s")
        params.append(zone_code)
    
    if equipment_type:
        conditions.append("e.equipment_type = %s")
        params.append(equipment_type)
    
    if keyword:
        conditions.append("(e.equipment_code LIKE %s OR e.equipment_name LIKE %s)")
        search_param = f"%{keyword}%"
        params.extend([search_param, search_param])
    
    where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""
    
    # 查询总数
    count_sql = f"""
        SELECT COUNT(*) as total 
        FROM equipment e
        {where_clause}
    """
    total_result = query_one(count_sql, params)
    total = total_result['total'] if total_result else 0
    
    # 查询列表
    offset = (page - 1) * page_size
    list_sql = f"""
        SELECT 
            e.id,
            e.equipment_code,
            e.equipment_name,
            e.equipment_type,
            e.zone_code,
            e.status,
            e.current_task_id,
            e.current_operator,
            e.last_update_time,
            e.created_at,
            e.updated_at,
            z.zone_name
        FROM equipment e
        LEFT JOIN zones z ON e.zone_code = z.zone_code
        {where_clause}
        ORDER BY e.equipment_code
        LIMIT %s OFFSET %s
    """
    list_params = params + [page_size, offset]
    data = query_all(list_sql, list_params)
    
    # 转换datetime为字符串
    for item in data:
        if item.get('last_update_time'):
            item['last_update_time'] = item['last_update_time'].strftime('%Y-%m-%d %H:%M:%S')
        if item.get('created_at'):
            item['created_at'] = item['created_at'].strftime('%Y-%m-%d %H:%M:%S')
        if item.get('updated_at'):
            item['updated_at'] = item['updated_at'].strftime('%Y-%m-%d %H:%M:%S')
    
    return {
        'total': total,
        'page': page,
        'page_size': page_size,
        'data': data
    }


def get_equipment_by_code(equipment_code: str) -> Optional[Dict[str, Any]]:
    """
    根据设备编号获取设备详情
    
    Args:
        equipment_code: 设备编号
    
    Returns:
        设备详情字典
    """
    sql = """
        SELECT 
            e.*,
            z.zone_name,
            t.task_name as current_task_name
        FROM equipment e
        LEFT JOIN zones z ON e.zone_code = z.zone_code
        LEFT JOIN tasks t ON e.current_task_id = t.id
        WHERE e.equipment_code = %s
    """
    result = query_one(sql, (equipment_code,))
    
    if result:
        # 转换datetime为字符串
        if result.get('last_update_time'):
            result['last_update_time'] = result['last_update_time'].strftime('%Y-%m-%d %H:%M:%S')
        if result.get('created_at'):
            result['created_at'] = result['created_at'].strftime('%Y-%m-%d %H:%M:%S')
        if result.get('updated_at'):
            result['updated_at'] = result['updated_at'].strftime('%Y-%m-%d %H:%M:%S')
    
    return result


def create_equipment(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    创建设备
    
    Args:
        data: 设备数据
    
    Returns:
        新创建的设备信息
    """
    # 检查设备编号是否已存在
    exists_sql = "SELECT id FROM equipment WHERE equipment_code = %s"
    exists = query_one(exists_sql, (data['equipment_code'],))
    if exists:
        raise ValueError(f"设备编号 {data['equipment_code']} 已存在")
    
    # 检查区域是否存在
    zone_sql = "SELECT id FROM zones WHERE zone_code = %s"
    zone = query_one(zone_sql, (data['zone_code'],))
    if not zone:
        raise ValueError(f"区域编码 {data['zone_code']} 不存在")
    
    # 插入设备
    insert_sql = """
        INSERT INTO equipment 
        (equipment_code, equipment_name, equipment_type, zone_code, status)
        VALUES (%s, %s, %s, %s, %s)
    """
    new_id = execute_last_id(insert_sql, (
        data['equipment_code'],
        data['equipment_name'],
        data['equipment_type'],
        data['zone_code'],
        data.get('status', 'idle')
    ))
    
    logger.info(f"创建设备成功: {data['equipment_code']}, ID: {new_id}")
    
    return get_equipment_by_code(data['equipment_code'])


def update_equipment(equipment_code: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """
    更新设备信息
    
    Args:
        equipment_code: 设备编号
        data: 更新数据
    
    Returns:
        更新后的设备信息
    """
    # 检查设备是否存在
    existing = get_equipment_by_code(equipment_code)
    if not existing:
        raise ValueError(f"设备编号 {equipment_code} 不存在")
    
    # 构建更新语句
    update_fields = []
    update_params = []
    
    if 'equipment_name' in data:
        update_fields.append("equipment_name = %s")
        update_params.append(data['equipment_name'])
    
    if 'equipment_type' in data:
        update_fields.append("equipment_type = %s")
        update_params.append(data['equipment_type'])
    
    if 'zone_code' in data:
        # 检查新区域是否存在
        zone_sql = "SELECT id FROM zones WHERE zone_code = %s"
        zone = query_one(zone_sql, (data['zone_code'],))
        if not zone:
            raise ValueError(f"区域编码 {data['zone_code']} 不存在")
        update_fields.append("zone_code = %s")
        update_params.append(data['zone_code'])
    
    if update_fields:
        update_sql = f"""
            UPDATE equipment 
            SET {', '.join(update_fields)}
            WHERE equipment_code = %s
        """
        update_params.append(equipment_code)
        execute(update_sql, update_params)
        logger.info(f"更新设备信息: {equipment_code}")
    
    return get_equipment_by_code(equipment_code)


def delete_equipment(equipment_code: str) -> bool:
    """
    删除设备
    
    Args:
        equipment_code: 设备编号
    
    Returns:
        是否删除成功
    """
    # 检查设备是否存在
    existing = get_equipment_by_code(equipment_code)
    if not existing:
        raise ValueError(f"设备编号 {equipment_code} 不存在")
    
    # 检查是否有维护记录
    maintenance_sql = "SELECT COUNT(*) as count FROM equipment_maintenance WHERE equipment_code = %s"
    maintenance_count = query_one(maintenance_sql, (equipment_code,))
    if maintenance_count and maintenance_count['count'] > 0:
        # 级联删除维护记录
        delete_maintenance_sql = "DELETE FROM equipment_maintenance WHERE equipment_code = %s"
        execute(delete_maintenance_sql, (equipment_code,))
    
    # 删除设备
    delete_sql = "DELETE FROM equipment WHERE equipment_code = %s"
    execute(delete_sql, (equipment_code,))
    
    logger.info(f"删除设备: {equipment_code}")
    return True


def update_equipment_status(equipment_code: str, status: str, operator: Optional[str] = None) -> Dict[str, Any]:
    """
    更新设备状态
    
    Args:
        equipment_code: 设备编号
        status: 新状态
        operator: 操作员
    
    Returns:
        更新后的设备信息
    """
    # 检查设备是否存在
    existing = get_equipment_by_code(equipment_code)
    if not existing:
        raise ValueError(f"设备编号 {equipment_code} 不存在")
    
    # 检查状态是否有效
    valid_statuses = ['idle', 'busy', 'error', 'maintenance']
    if status not in valid_statuses:
        raise ValueError(f"无效的状态值: {status}，有效值为: {valid_statuses}")
    
    # 更新状态
    if operator:
        update_sql = """
            UPDATE equipment 
            SET status = %s, current_operator = %s
            WHERE equipment_code = %s
        """
        execute(update_sql, (status, operator, equipment_code))
    else:
        update_sql = """
            UPDATE equipment 
            SET status = %s
            WHERE equipment_code = %s
        """
        execute(update_sql, (status, equipment_code))
    
    logger.info(f"更新设备状态: {equipment_code} -> {status}")
    return get_equipment_by_code(equipment_code)


def get_equipment_stats() -> Dict[str, Any]:
    """
    获取设备统计数据（驾驶舱用）
    
    Returns:
        设备统计数据
    """
    # 按状态统计
    status_sql = """
        SELECT status, COUNT(*) as count 
        FROM equipment 
        GROUP BY status
    """
    status_data = query_all(status_sql)
    
    status_distribution = {}
    for item in status_data:
        status_distribution[item['status']] = item['count']
    
    # 计算总数
    total_sql = "SELECT COUNT(*) as total FROM equipment"
    total_result = query_one(total_sql)
    total = total_result['total'] if total_result else 0
    
    return {
        'total': total,
        'idle': status_distribution.get('idle', 0),
        'busy': status_distribution.get('busy', 0),
        'error': status_distribution.get('error', 0),
        'maintenance': status_distribution.get('maintenance', 0),
        'status_distribution': status_data
    }


def get_maintenance_list(
    equipment_code: str,
    page: int = 1,
    page_size: int = 20,
    status: Optional[str] = None,
) -> Dict[str, Any]:
    """
    获取设备维护记录列表
    
    Args:
        equipment_code: 设备编号
        page: 页码
        page_size: 每页数量
        status: 状态筛选
    
    Returns:
        维护记录列表
    """
    conditions = ["equipment_code = %s"]
    params = [equipment_code]
    
    if status:
        conditions.append("status = %s")
        params.append(status)
    
    where_clause = "WHERE " + " AND ".join(conditions)
    
    # 查询总数
    count_sql = f"SELECT COUNT(*) as total FROM equipment_maintenance {where_clause}"
    total_result = query_one(count_sql, params)
    total = total_result['total'] if total_result else 0
    
    # 查询列表
    offset = (page - 1) * page_size
    list_sql = f"""
        SELECT *
        FROM equipment_maintenance
        {where_clause}
        ORDER BY created_at DESC
        LIMIT %s OFFSET %s
    """
    list_params = params + [page_size, offset]
    data = query_all(list_sql, list_params)
    
    # 转换datetime
    for item in data:
        for time_field in ['start_time', 'end_time', 'created_at']:
            if item.get(time_field):
                item[time_field] = item[time_field].strftime('%Y-%m-%d %H:%M:%S')
    
    return {
        'total': total,
        'page': page,
        'page_size': page_size,
        'data': data
    }


def create_maintenance_record(equipment_code: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """
    创建设备维护记录
    
    Args:
        equipment_code: 设备编号
        data: 维护记录数据
    
    Returns:
        新创建的维护记录
    """
    # 检查设备是否存在
    existing = get_equipment_by_code(equipment_code)
    if not existing:
        raise ValueError(f"设备编号 {equipment_code} 不存在")
    
    # 插入维护记录
    insert_sql = """
        INSERT INTO equipment_maintenance 
        (equipment_code, maintenance_type, start_time, end_time, operator, description, status)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    """
    new_id = execute_last_id(insert_sql, (
        equipment_code,
        data.get('maintenance_type', 'routine'),
        data['start_time'],
        data.get('end_time'),
        data.get('operator'),
        data.get('description'),
        data.get('status', 'in_progress')
    ))
    
    logger.info(f"创建维护记录成功: {equipment_code}, ID: {new_id}")
    
    # 返回新记录
    sql = "SELECT * FROM equipment_maintenance WHERE id = %s"
    result = query_one(sql, (new_id,))
    
    if result:
        for time_field in ['start_time', 'end_time', 'created_at']:
            if result.get(time_field):
                result[time_field] = result[time_field].strftime('%Y-%m-%d %H:%M:%S')
    
    return result


def update_maintenance_status(maintenance_id: int, status: str, end_time: Optional[str] = None) -> Dict[str, Any]:
    """
    更新维护记录状态
    
    Args:
        maintenance_id: 维护记录ID
        status: 新状态
        end_time: 结束时间
    
    Returns:
        更新后的维护记录
    """
    # 检查记录是否存在
    existing_sql = "SELECT * FROM equipment_maintenance WHERE id = %s"
    existing = query_one(existing_sql, (maintenance_id,))
    if not existing:
        raise ValueError(f"维护记录 ID {maintenance_id} 不存在")
    
    # 检查状态是否有效
    valid_statuses = ['in_progress', 'completed', 'cancelled']
    if status not in valid_statuses:
        raise ValueError(f"无效的状态值: {status}")
    
    # 更新状态
    if status == 'completed' and not end_time:
        from datetime import datetime
        end_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    if end_time:
        update_sql = """
            UPDATE equipment_maintenance 
            SET status = %s, end_time = %s
            WHERE id = %s
        """
        execute(update_sql, (status, end_time, maintenance_id))
    else:
        update_sql = """
            UPDATE equipment_maintenance 
            SET status = %s
            WHERE id = %s
        """
        execute(update_sql, (status, maintenance_id))
    
    logger.info(f"更新维护记录状态: ID={maintenance_id} -> {status}")
    
    # 返回更新后的记录
    result = query_one(existing_sql, (maintenance_id,))
    if result:
        for time_field in ['start_time', 'end_time', 'created_at']:
            if result.get(time_field):
                result[time_field] = result[time_field].strftime('%Y-%m-%d %H:%M:%S')
    
    return result
