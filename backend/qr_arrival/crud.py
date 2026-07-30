from backend.database import query_all, query_one, execute, execute_last_id


def save_arrival_record(
    project_id: int,
    part_code: str,
    arrival_qty: int,
    arrival_time: str,
    remark: str = None,
    submitter: str = None,
) -> int:
    return execute_last_id(
        "INSERT INTO qr_arrival_records "
        "(project_id, part_code, arrival_qty, arrival_time, remark, submitter, matched_status) "
        "VALUES (%s, %s, %s, %s, %s, %s, 'unmatched')",
        (project_id, part_code, arrival_qty, arrival_time, remark, submitter),
    )


def update_record_match_status(record_id: int, matched_status: str):
    execute(
        "UPDATE qr_arrival_records SET matched_status = %s WHERE id = %s",
        (matched_status, record_id),
    )


def get_arrival_records(project_id: int, limit: int = 50):
    return query_all(
        "SELECT * FROM qr_arrival_records WHERE project_id = %s ORDER BY created_at DESC LIMIT %s",
        (project_id, limit),
    )


def get_part_pbom_info(project_id: int, part_code: str):
    return query_one(
        "SELECT part_code, part_name, demand_quantity FROM project_parts "
        "WHERE project_id = %s AND part_code = %s",
        (project_id, part_code),
    )


def get_part_warehouse_qty(project_id: int, part_code: str):
    project = query_one(
        "SELECT project_code, apply_code FROM projects WHERE id = %s",
        (project_id,),
    )
    if not project:
        return 0

    pro_code = (project.get("project_code") or "").strip()
    apply_c = (project.get("apply_code") or "").strip()

    conditions = ["MATTER_CODE = %s"]
    params = [part_code]

    if pro_code:
        conditions.append("TRIM(PRO_CODE) = %s")
        params.append(pro_code)
    else:
        conditions.append("(PRO_CODE IS NULL OR TRIM(COALESCE(PRO_CODE, '')) = '')")

    if apply_c:
        conditions.append("TRIM(APPLY_CODE) = %s")
        params.append(apply_c)
    else:
        conditions.append("(APPLY_CODE IS NULL OR TRIM(COALESCE(APPLY_CODE, '')) = '')")

    row = query_one(
        "SELECT COALESCE(SUM(IN_NUM), 0) as total_qty FROM delivery_detail WHERE "
        + " AND ".join(conditions),
        params,
    )
    if row and row.get("total_qty"):
        return int(row["total_qty"])
    return 0


def update_part_line_side(project_id: int, part_code: str, line_side_qty: int, line_side_status: str):
    execute(
        "UPDATE project_parts SET line_side_qty = %s, line_side_status = %s "
        "WHERE project_id = %s AND part_code = %s",
        (line_side_qty, line_side_status, project_id, part_code),
    )


def get_project_arrival_status(project_id: int):
    rows = query_all(
        "SELECT pp.part_code, pp.part_name, pp.demand_quantity as demand_qty, "
        "pp.received_quantity as warehouse_qty, "
        "pp.line_side_qty, pp.line_side_status "
        "FROM project_parts pp WHERE pp.project_id = %s",
        (project_id,),
    )
    total = len(rows)
    pending = sum(1 for r in rows if r.get("line_side_status") == "pending")
    partial = sum(1 for r in rows if r.get("line_side_status") == "partial")
    matched = sum(1 for r in rows if r.get("line_side_status") == "matched")
    return {
        "total_parts": total,
        "pending_count": pending,
        "partial_count": partial,
        "matched_count": matched,
        "parts": rows,
    }