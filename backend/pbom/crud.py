# -*- coding: utf-8 -*-
"""
PBOM 数据库操作
"""

from typing import List, Dict
from backend.database import query_all, query_one, execute, execute_last_id


def save_pbom_parts(project_id: int, parts: List[Dict]) -> int:
    """保存 PBOM 零件到 project_parts 表"""
    clear_pbom_parts(project_id)

    count = 0
    for part in parts:
        execute_last_id(
            "INSERT INTO project_parts "
            "(project_id, part_code, part_name, demand_quantity) "
            "VALUES (%s, %s, %s, %s)",
            (
                project_id,
                part["part_code"],
                part["part_name"],
                part["demand_quantity"],
            ),
        )
        count += 1
    return count


def clear_pbom_parts(project_id: int):
    """清除项目的 PBOM 零件、配置、关联数据和评分"""
    execute("DELETE FROM project_parts WHERE project_id = %s", (project_id,))
    execute("DELETE FROM configs WHERE project_id = %s", (project_id,))
    execute("DELETE FROM part_configs WHERE project_id = %s", (project_id,))
    execute("DELETE FROM critical_scores WHERE project_id = %s", (project_id,))


def save_config(project_id: int, config_name: str, display_name: str = None) -> int:
    """保存配置"""
    if not display_name:
        display_name = config_name
    return execute_last_id(
        "INSERT INTO configs (project_id, config_name, display_name) VALUES (%s, %s, %s)",
        (project_id, config_name, display_name),
    )


def save_part_config(project_id: int, config_id: int, part_code: str, qty: int):
    """保存零件配置关联"""
    execute_last_id(
        "INSERT INTO part_configs (project_id, config_id, part_code, config_qty) "
        "VALUES (%s, %s, %s, %s)",
        (project_id, config_id, part_code, qty),
    )


def get_project_parts(project_id: int):
    """获取项目零件列表"""
    return query_all(
        "SELECT * FROM project_parts WHERE project_id = %s ORDER BY id",
        (project_id,),
    )


def get_project_configs(project_id: int):
    """获取项目配置列表"""
    return query_all(
        "SELECT id, project_id, config_name, display_name AS config_alias, "
        "part_count, value_range, key_parts_total, key_parts_ready, ready_rate, "
        "status, processing_time_hours, created_at "
        "FROM configs WHERE project_id = %s ORDER BY id",
        (project_id,),
    )


def get_project_deliveries(project_id: int):
    """获取项目所有到货数据（来自 delivery_records）"""
    return query_all(
        "SELECT * FROM delivery_records WHERE project_id = %s ORDER BY recive_time DESC",
        (project_id,),
    )


def update_part_received_quantity(project_id: int, part_code: str, received_qty: int):
    """更新零件已入库数量"""
    execute(
        "UPDATE project_parts SET received_quantity = %s "
        "WHERE project_id = %s AND part_code = %s",
        (received_qty, project_id, part_code),
    )