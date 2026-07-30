# -*- coding: utf-8 -*-
"""
多源到货数据模块
"""

from fastapi import APIRouter, Query
from backend.database import query_all, query_one

from .schemas import MergeRequest
from .dedup_merger import DedupMerger

router = APIRouter()

# 数据库中实际存在的单据状态（用于状态规范化与空值合并）
_DB_STATES = ['入库完成', '已检待入库', '合格待入库', '不合格待判定', '待检']


def _normalize_state(raw):
    """将数据库中 STATE 字段的空值/空白/None 规范化为 '未标注'，其他原样返回。"""
    if raw is None:
        return '未标注'
    s = str(raw).strip()
    if not s:
        return '未标注'
    return s


@router.get("/ping")
def ping():
    return {"message": "delivery module ready"}


def _build_detail_query(table_name, conditions, params):
    """构建详情查询SQL"""
    where = " WHERE " + " AND ".join(conditions) if conditions else ""
    sql = f"SELECT * FROM {table_name}{where} ORDER BY RECIVE_TIME DESC LIMIT %s OFFSET %s"
    count_sql = f"SELECT COUNT(*) AS cnt FROM {table_name}{where}"
    return sql, count_sql


@router.get("/detail")
def get_delivery_detail(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    search: str = Query(""),
    state: str = Query(""),
    days: int = Query(7, ge=0, le=99999),
    delivery_code: str = Query("", description="送货单号（优先于通用 search）"),
    apply_code: str = Query("", description="试制申请单号"),
    project_code: str = Query("", description="项目号"),
    part_code: str = Query("", description="零件号"),
    part_name: str = Query("", description="零件名"),
    exact: bool = Query(False, description="是否精确匹配：true=精确，false=模糊（默认）"),
    source: str = Query("wms", description="数据源: wms=仓库WMS, feishu=飞书共享表"),
):
    """获取到货明细数据（分页+筛选）。

    - delivery_code / apply_code / project_code / part_code / part_name
      为独立字段搜索，按字段精确匹配或模糊匹配。
    - 通用 search 参数仍可用：在送货单号/申请号/项目号/零件号/零件名 5 个字段中模糊搜索。
    - exact=True 时独立字段使用 = 精确匹配；否则使用 LIKE 模糊匹配。
    - state 按数据库真实 STATE 字段值过滤（包括 '未标注'）。
    - source 参数指定数据源：wms=delivery_detail, feishu=feishu_detail
    """
    conditions = []
    params = []

    def _add_field_condition(field: str, value: str, is_exact: bool):
        if is_exact:
            conditions.append(f"{field} = %s")
            params.append(value)
        else:
            conditions.append(f"{field} LIKE %s")
            params.append(f"%{value}%")

    if delivery_code:
        _add_field_condition("DELIVERY_CODE", delivery_code, exact)
    if apply_code:
        _add_field_condition("APPLY_CODE", apply_code, exact)
    if project_code:
        _add_field_condition("PRO_CODE" if source == "wms" else "PRO_NAME", project_code, exact)
    if part_code:
        _add_field_condition("MATTER_CODE", part_code, exact)
    if part_name:
        _add_field_condition("MATTER_NAME", part_name, exact)

    if search and not (delivery_code or apply_code or project_code or part_code or part_name):
        if source == "wms":
            conditions.append(
                "(DELIVERY_CODE LIKE %s OR APPLY_CODE LIKE %s OR PRO_CODE LIKE %s "
                "OR MATTER_CODE LIKE %s OR MATTER_NAME LIKE %s)"
            )
        else:
            conditions.append(
                "(DELIVERY_CODE LIKE %s OR APPLY_CODE LIKE %s OR PRO_NAME LIKE %s "
                "OR MATTER_CODE LIKE %s OR MATTER_NAME LIKE %s)"
            )
        like = f"%{search}%"
        params.extend([like, like, like, like, like])

    if state and source == "wms":
        if state == '未标注':
            conditions.append("(STATE IS NULL OR TRIM(COALESCE(STATE, '')) = '')")
        else:
            conditions.append("TRIM(STATE) = %s")
            params.append(state)

    if days and days > 0 and source == "wms":
        conditions.append("RECIVE_TIME >= DATE_SUB(NOW(), INTERVAL %s DAY)")
        params.append(days)

    table_name = "delivery_detail" if source == "wms" else "feishu_detail"
    sql, count_sql = _build_detail_query(table_name, conditions, params)
    params.extend([page_size, (page - 1) * page_size])

    total = query_all(count_sql, params[:-2])[0]["cnt"]
    records = query_all(sql, params)
    return {"data": records, "total": total, "page": page, "page_size": page_size, "source": source}


@router.get("/stats")
def get_delivery_stats(days: int = Query(7, ge=0, le=99999)):
    """获取合并后的统计数据（delivery_detail + feishu_detail）"""
    wms_time_cond = ""
    wms_params = []
    if days and days > 0:
        wms_time_cond = "WHERE RECIVE_TIME >= DATE_SUB(NOW(), INTERVAL %s DAY)"
        wms_params.append(days)

    wms_stats = query_all(
        f"SELECT "
        f"  COUNT(*) AS total_records, "
        f"  SUM(ORDER_NUM) AS total_order, "
        f"  SUM(IN_NUM) AS total_in, "
        f"  SUM(CANT_NUM) AS total_cant, "
        f"  COUNT(DISTINCT PRO_CODE) AS project_count "
        f"FROM delivery_detail {wms_time_cond}",
        wms_params,
    )

    feishu_stats = query_all(
        f"SELECT "
        f"  COUNT(*) AS total_records, "
        f"  SUM(ORDER_NUM) AS total_order, "
        f"  SUM(IN_NUM) AS total_in, "
        f"  SUM(CANT_NUM) AS total_cant, "
        f"  COUNT(DISTINCT PRO_NAME) AS project_count "
        f"FROM feishu_detail",
        [],
    )

    w = wms_stats[0] if wms_stats else {}
    f = feishu_stats[0] if feishu_stats else {}

    merged = {
        "total_records": (w.get("total_records") or 0) + (f.get("total_records") or 0),
        "total_order": (w.get("total_order") or 0) + (f.get("total_order") or 0),
        "total_in": (w.get("total_in") or 0) + (f.get("total_in") or 0),
        "total_cant": (w.get("total_cant") or 0) + (f.get("total_cant") or 0),
        "project_count": (w.get("project_count") or 0) + (f.get("project_count") or 0),
        "wms_records": w.get("total_records") or 0,
        "feishu_records": f.get("total_records") or 0,
    }
    return {"data": merged}


@router.get("/state-distribution")
def get_state_distribution(days: int = Query(7, ge=0, le=99999)):
    """按数据库真实 STATE 字段值统计单据数量分布（仅 delivery_detail）。"""
    wms_time_cond = ""
    wms_params = []
    if days and days > 0:
        wms_time_cond = "WHERE RECIVE_TIME >= DATE_SUB(NOW(), INTERVAL %s DAY)"
        wms_params.append(days)

    wms_rows = query_all(
        f"SELECT TRIM(COALESCE(STATE, '')) AS state_label, COUNT(*) AS cnt "
        f"FROM delivery_detail {wms_time_cond} GROUP BY TRIM(COALESCE(STATE, ''))",
        wms_params,
    )

    labels_counts = {}

    def _add_rows(rows):
        for row in rows:
            label = row.get("state_label") or ""
            if not label.strip():
                key = "未标注"
            else:
                key = label.strip()
            labels_counts[key] = labels_counts.get(key, 0) + (row.get("cnt") or 0)

    _add_rows(wms_rows)

    ordered = []
    for st in _DB_STATES + ["未标注"]:
        ordered.append({"state": st, "count": labels_counts.pop(st, 0)})
    for k, v in labels_counts.items():
        ordered.append({"state": k, "count": v})

    return {"data": ordered, "states": _DB_STATES}


@router.get("/feishu-state-distribution")
def get_feishu_state_distribution():
    """获取飞书共享表的单据状态分布（已到货/部分到货/未到货）。"""
    rows = query_all(
        "SELECT TRIM(COALESCE(STATE, '')) AS state_label, COUNT(*) AS cnt "
        "FROM feishu_detail GROUP BY TRIM(COALESCE(STATE, ''))",
        [],
    )

    labels_counts = {}
    for row in rows:
        label = row.get("state_label") or ""
        if not label.strip() or label.strip() in ("#N/A", "N/A"):
            key = "未到货"
        else:
            key = label.strip()
        labels_counts[key] = labels_counts.get(key, 0) + (row.get("cnt") or 0)

    ordered = []
    for st in ["已到货", "部分到货", "未到货"]:
        ordered.append({"state": st, "count": labels_counts.pop(st, 0)})

    return {"data": ordered, "states": ["已到货", "部分到货", "未到货"]}


@router.post("/{project_id}/merge")
def merge_delivery(project_id: int, req: MergeRequest = None):
    """执行多源到货数据去重合并

    使用5维匹配键: (项目号, 零件号, 数量, 时间, 单据号)
    """
    project = query_one("SELECT id FROM projects WHERE id = %s", (project_id,))
    if not project:
        return {"error": "项目不存在"}

    if req is None:
        req = MergeRequest(project_id=project_id)

    merger = DedupMerger(project_id=project_id, days=req.days)
    result = merger.merge()
    return result


@router.get("/{project_id}/merge-summary")
def get_merge_summary(project_id: int, days: int = Query(7, ge=1, le=365)):
    """获取去重合并摘要"""
    merger = DedupMerger(project_id=project_id, days=days)
    result = merger.merge()
    return {
        "project_id": project_id,
        "days": days,
        "total_raw": result["total_raw"],
        "merged_count": result["merged_count"],
        "duplicate_count": result["duplicate_count"],
        "anomaly_count": result["anomaly_count"],
    }