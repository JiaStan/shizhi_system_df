# -*- coding: utf-8 -*-
from backend.database import query_all, query_one, execute, execute_last_id


def list_projects(page: int = 1, page_size: int = 20):
    offset = (page - 1) * page_size
    total = query_one("SELECT COUNT(*) AS cnt FROM projects")["cnt"]
    rows = query_all(
        "SELECT p.id, p.name, p.project_code AS code, p.apply_code, p.apply_code2, "
        "p.status, p.owner, p.created_at, p.updated_at, "
        "p.trial_leader, p.process_leader, p.assembly_leader, "
        "(SELECT COUNT(*) FROM project_parts WHERE project_id = p.id) AS parts_count "
        "FROM projects p ORDER BY p.created_at DESC LIMIT %s OFFSET %s",
        (page_size, offset),
    )
    for r in rows:
        pid = r["id"]
        sum_data = query_one(
            "SELECT COALESCE(SUM(demand_quantity), 0) AS total_demand, "
            "COALESCE(SUM(received_quantity), 0) AS total_received, "
            "COALESCE(SUM(line_side_qty), 0) AS total_line_side, "
            "COUNT(*) AS total_parts, "
            "SUM(CASE WHEN line_side_qty = received_quantity AND received_quantity = demand_quantity AND demand_quantity > 0 THEN 1 ELSE 0 END) AS matched_parts "
            "FROM project_parts WHERE project_id = %s",
            (pid,),
        )
        demand = sum_data.get("total_demand", 0) or 0
        received = sum_data.get("total_received", 0) or 0
        line_side = sum_data.get("total_line_side", 0) or 0
        total_parts = sum_data.get("total_parts", 0) or 0
        matched_parts = sum_data.get("matched_parts", 0) or 0
        
        type_data = query_one(
            "SELECT "
            "COUNT(DISTINCT part_code) AS total_types, "
            "COUNT(DISTINCT CASE WHEN received_quantity > 0 OR line_side_qty > 0 THEN part_code END) AS arrived_types "
            "FROM project_parts WHERE project_id = %s",
            (pid,),
        )
        total_types = type_data.get("total_types", 0) or 0
        arrived_types = type_data.get("arrived_types", 0) or 0
        
        r["parts_count"] = int(r.get("parts_count", 0) or 0)
        r["total_demand"] = int(demand)
        r["total_received"] = int(received)
        r["total_line_side"] = int(line_side)
        r["delivery_rate"] = round(arrived_types / total_types * 100, 1) if total_types > 0 else 0.0
        r["matched_rate"] = round(matched_parts / total_parts * 100, 1) if total_parts > 0 else 0.0
    return {"total": total, "page": page, "page_size": page_size, "data": rows}


def get_project(project_id: int):
    row = query_one(
        "SELECT p.id, p.name, p.project_code AS code, p.apply_code, p.apply_code2, "
        "p.status, p.owner, p.created_at, p.updated_at, "
        "p.trial_leader, p.process_leader, p.assembly_leader "
        "FROM projects p WHERE id = %s",
        (project_id,),
    )
    if row:
        sum_data = query_one(
            "SELECT COALESCE(SUM(demand_quantity), 0) AS total_demand, "
            "COALESCE(SUM(received_quantity), 0) AS total_received, "
            "COALESCE(SUM(line_side_qty), 0) AS total_line_side, "
            "COUNT(*) AS parts_count, "
            "SUM(CASE WHEN line_side_qty = received_quantity AND received_quantity = demand_quantity AND demand_quantity > 0 THEN 1 ELSE 0 END) AS matched_parts "
            "FROM project_parts WHERE project_id = %s",
            (project_id,),
        )
        demand = sum_data.get("total_demand", 0) or 0
        received = sum_data.get("total_received", 0) or 0
        line_side = sum_data.get("total_line_side", 0) or 0
        total_parts = sum_data.get("parts_count", 0) or 0
        matched_parts = sum_data.get("matched_parts", 0) or 0
        
        type_data = query_one(
            "SELECT "
            "COUNT(DISTINCT part_code) AS total_types, "
            "COUNT(DISTINCT CASE WHEN received_quantity > 0 THEN part_code END) AS warehouse_arrived_types, "
            "COUNT(DISTINCT CASE WHEN line_side_qty > 0 THEN part_code END) AS line_side_arrived_types, "
            "COUNT(DISTINCT CASE WHEN received_quantity > 0 OR line_side_qty > 0 THEN part_code END) AS arrived_types "
            "FROM project_parts WHERE project_id = %s",
            (project_id,),
        )
        total_types = type_data.get("total_types", 0) or 0
        warehouse_arrived_types = type_data.get("warehouse_arrived_types", 0) or 0
        line_side_arrived_types = type_data.get("line_side_arrived_types", 0) or 0
        arrived_types = type_data.get("arrived_types", 0) or 0
        
        row["parts_count"] = int(total_parts)
        row["total_demand"] = int(demand)
        row["total_received"] = int(received)
        row["total_line_side"] = int(line_side)
        row["delivery_rate"] = round(arrived_types / total_types * 100, 1) if total_types > 0 else 0.0
        row["matched_rate"] = round(matched_parts / total_parts * 100, 1) if total_parts > 0 else 0.0
        row["total_types"] = int(total_types)
        row["warehouse_arrived_types"] = int(warehouse_arrived_types)
        row["line_side_arrived_types"] = int(line_side_arrived_types)
    return row


def create_project(name: str, project_code: str, apply_code: str, apply_code2: str = "",
                   status: str = "进行中",
                   trial_leader: str = "", process_leader: str = "", assembly_leader: str = ""):
    project_id = execute_last_id(
        "INSERT INTO projects (name, project_code, apply_code, apply_code2, status, trial_leader, process_leader, assembly_leader) "
        "VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
        (name, project_code, apply_code, apply_code2, status, trial_leader, process_leader, assembly_leader),
    )
    return project_id


def update_project(project_id: int, updates: dict):
    fields = []
    params = []
    for key, val in updates.items():
        if val is not None:
            fields.append(f"{key} = %s")
            params.append(val)
    if fields:
        params.append(project_id)
        execute(f"UPDATE projects SET {', '.join(fields)} WHERE id = %s", params)


def delete_project(project_id: int):
    execute("DELETE FROM projects WHERE id = %s", (project_id,))


def list_project_parts(project_id: int):
    return query_all(
        "SELECT part_code, part_name, demand_quantity, received_quantity, "
        "line_side_qty, line_side_status, source, shortage_note, created_at "
        "FROM project_parts WHERE project_id = %s ORDER BY id",
        (project_id,),
    )


def get_project_stats(project_id: int):
    stats = query_one(
        "SELECT "
        "COUNT(*) AS parts_count, "
        "COALESCE(SUM(demand_quantity), 0) AS total_demand, "
        "COALESCE(SUM(received_quantity), 0) AS total_received, "
        "COALESCE(SUM(line_side_qty), 0) AS total_line_side, "
        "SUM(CASE WHEN line_side_qty = received_quantity AND received_quantity = demand_quantity AND demand_quantity > 0 THEN 1 ELSE 0 END) AS matched_parts "
        "FROM project_parts WHERE project_id = %s",
        (project_id,),
    )
    if not stats:
        return {"parts_count": 0, "total_demand": 0, "total_received": 0, "total_line_side": 0, "matched_rate": 0.0, "delivery_rate": 0.0}
    total_parts = stats.get("parts_count", 0)
    matched_parts = stats.get("matched_parts", 0)
    matched_rate = round(matched_parts / total_parts * 100, 1) if total_parts > 0 else 0.0
    
    type_data = query_one(
        "SELECT "
        "COUNT(DISTINCT part_code) AS total_types, "
        "COUNT(DISTINCT CASE WHEN received_quantity > 0 OR line_side_qty > 0 THEN part_code END) AS arrived_types "
        "FROM project_parts WHERE project_id = %s",
        (project_id,),
    )
    total_types = type_data.get("total_types", 0) or 0
    arrived_types = type_data.get("arrived_types", 0) or 0
    delivery_rate = round(arrived_types / total_types * 100, 1) if total_types > 0 else 0.0
    
    stats["matched_rate"] = matched_rate
    stats["delivery_rate"] = delivery_rate
    return stats


def get_shortage_parts(project_id: int, page: int = 1, page_size: int = 20,
                       keyword: str = "", warehouse_filter: str = "all",
                       doc_state_filter: str = "all"):
    """
    获取缺件零件列表
    缺件定义：仓库未到货 或 线边未齐套
    支持搜索和筛选（仅从project_parts表查询）
    """
    where_conditions = ["pp.project_id = %s"]
    where_params = [project_id]
    where_conditions.append("(pp.received_quantity = 0 OR pp.line_side_qty < pp.demand_quantity)")

    if keyword:
        where_conditions.append(
            "(pp.part_code LIKE %s OR pp.part_name LIKE %s OR pp.professional LIKE %s)"
        )
        where_params.extend([f"%{keyword}%", f"%{keyword}%", f"%{keyword}%"])

    if doc_state_filter != "all":
        where_conditions.append("pp.doc_state = %s")
        where_params.append(doc_state_filter)

    if warehouse_filter != "all":
        where_conditions.append("pp.warehouse = %s")
        where_params.append(warehouse_filter)

    where_sql = " AND ".join(where_conditions)

    count_sql = f"""
        SELECT COUNT(DISTINCT pp.part_code) AS cnt
        FROM project_parts pp
        WHERE {where_sql}
    """
    total = query_one(count_sql, tuple(where_params))["cnt"]

    offset = (page - 1) * page_size

    data_sql = f"""
        SELECT pp.part_code, pp.part_name, pp.demand_quantity, pp.received_quantity,
        pp.line_side_qty, pp.line_side_status, pp.doc_state, pp.professional, pp.warehouse,
        pp.source, pp.shortage_note
        FROM project_parts pp
        WHERE {where_sql}
        ORDER BY pp.received_quantity ASC, pp.line_side_qty ASC
        LIMIT %s OFFSET %s
    """
    rows = query_all(data_sql, tuple(where_params + [page_size, offset]))

    unique_rows = []
    seen = set()
    for row in rows:
        part_code = row.get("part_code", "")
        if part_code not in seen:
            seen.add(part_code)
            unique_rows.append(row)

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "data": unique_rows,
    }


def get_doc_state_distribution(project_id: int):
    """
    获取未到仓库缺件的单据状态分布（按零件种类统计）
    从 project_parts 表获取缺件零件，关联 delivery_detail 表获取最新状态
    """
    project = query_one("SELECT apply_code, apply_code2 FROM projects WHERE id = %s", (project_id,))
    if not project:
        return {"total_shortage_types": 0, "distribution": []}
    
    apply_codes = [project.get("apply_code")]
    if project.get("apply_code2"):
        apply_codes.append(project.get("apply_code2"))
    
    apply_codes = [ac for ac in apply_codes if ac]
    
    if not apply_codes:
        distribution = query_all(
            """
            SELECT 
                COALESCE(doc_state, '未分配') AS doc_state,
                COUNT(DISTINCT part_code) AS type_count
            FROM project_parts 
            WHERE project_id = %s AND received_quantity = 0 AND demand_quantity > 0
            GROUP BY doc_state
            ORDER BY type_count DESC
            """,
            (project_id,),
        )
        return {
            "total_shortage_types": sum(d.get("type_count", 0) for d in distribution),
            "distribution": distribution,
        }
    
    placeholders = ", ".join(["%s"] * len(apply_codes))
    
    distribution = query_all(
        f"""
        SELECT 
            COALESCE(latest.STATE, pp.doc_state, '未分配') AS doc_state,
            COUNT(DISTINCT pp.part_code) AS type_count
        FROM project_parts pp
        LEFT JOIN (
            SELECT MATTER_CODE, STATE 
            FROM delivery_detail 
            WHERE TRIM(APPLY_CODE) IN ({placeholders})
            GROUP BY MATTER_CODE
        ) latest ON pp.part_code = latest.MATTER_CODE
        WHERE pp.project_id = %s 
            AND pp.received_quantity = 0 
            AND pp.demand_quantity > 0
        GROUP BY COALESCE(latest.STATE, pp.doc_state, '未分配')
        ORDER BY type_count DESC
        """,
        tuple(apply_codes) + (project_id,),
    )
    
    total = sum(d.get("type_count", 0) for d in distribution)
    
    if total == 0:
        distribution = query_all(
            """
            SELECT 
                COALESCE(doc_state, '未分配') AS doc_state,
                COUNT(DISTINCT part_code) AS type_count
            FROM project_parts 
            WHERE project_id = %s AND received_quantity = 0 AND demand_quantity > 0
            GROUP BY doc_state
            ORDER BY type_count DESC
            """,
            (project_id,),
        )
        total = sum(d.get("type_count", 0) for d in distribution)
    
    return {
        "total_shortage_types": total,
        "distribution": distribution,
    }