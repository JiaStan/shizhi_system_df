from backend.database import query_all, execute_last_id


def save_critical_score(
    project_id: int,
    part_code: str,
    assembly_score: int = 0,
    size_score: int = 0,
    disposal_score: int = 0,
    safety_score: int = 0,
    value_score: int = 0,
    torque_score: int = 0,
    critical_score: int = 0,
    is_critical: bool = False,
    critical_level: str = "green",
    reason: str = "",
):
    """保存关键件评分"""
    return execute_last_id(
        "INSERT INTO critical_scores "
        "(project_id, part_code, assembly_score, size_score, disposal_score, "
        "safety_score, value_score, torque_score, critical_score, is_critical, "
        "critical_level, reason) "
        "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) "
        "ON DUPLICATE KEY UPDATE "
        "assembly_score=VALUES(assembly_score), size_score=VALUES(size_score), "
        "disposal_score=VALUES(disposal_score), safety_score=VALUES(safety_score), "
        "value_score=VALUES(value_score), torque_score=VALUES(torque_score), "
        "critical_score=VALUES(critical_score), is_critical=VALUES(is_critical), "
        "critical_level=VALUES(critical_level), reason=VALUES(reason)",
        (project_id, part_code, assembly_score, size_score, disposal_score,
         safety_score, value_score, torque_score, critical_score, is_critical,
         critical_level, reason),
    )


def get_critical_scores(project_id: int):
    return query_all(
        "SELECT cs.*, pp.part_name "
        "FROM critical_scores cs "
        "LEFT JOIN project_parts pp ON pp.project_id = cs.project_id AND pp.part_code = cs.part_code "
        "WHERE cs.project_id = %s ORDER BY cs.critical_score DESC",
        (project_id,),
    )


def get_critical_summary(project_id: int):
    rows = query_all(
        "SELECT critical_level, COUNT(*) as cnt FROM critical_scores "
        "WHERE project_id = %s GROUP BY critical_level",
        (project_id,),
    )
    red = yellow = green = 0
    for r in rows:
        if r.get("critical_level") == "red":
            red = r.get("cnt", 0)
        elif r.get("critical_level") == "yellow":
            yellow = r.get("cnt", 0)
        elif r.get("critical_level") == "green":
            green = r.get("cnt", 0)
    return {"red_count": red, "yellow_count": yellow, "green_count": green, "total": red + yellow + green}
