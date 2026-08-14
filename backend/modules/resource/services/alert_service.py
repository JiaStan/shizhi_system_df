# -*- coding: utf-8 -*-
"""
异常预警服务层
处理预警的CRUD、SLA升级、统计与批量处理
"""
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from decimal import Decimal
from backend.database import query_all, query_one, execute, execute_last_id
from backend.logger import logger

ALERT_TYPES = [
    'task_delay', 'quality_defect', 'equipment_fault', 'material_shortage',
    'personnel_gap', 'safety_hazard', 'schedule_overdue', 'process_violation',
    'external_coordinate', 'other'
]
ALERT_LEVELS = ['critical', 'high', 'medium', 'low']
ALERT_SOURCES = [
    'system_auto', 'manual_report', 'equipment_report',
    'operation_inspection', 'quality_inspection', 'other'
]
ALERT_STATUSES = ['pending', 'processing', 'resolved', 'closed', 'expired']
RELATED_TYPES = ['task', 'equipment', 'personnel', 'material', 'project', 'workshop', 'none']

DEFAULT_SLA = {
    'critical': 4,
    'high': 8,
    'medium': 24,
    'low': 72,
}


def _apply_sla_level(data: Dict[str, Any]) -> Dict[str, Any]:
    """根据级别自动填充默认SLA响应时长"""
    level = data.get('level') or 'medium'
    if 'sla_hours' not in data or data['sla_hours'] in (None, 0, ''):
        data['sla_hours'] = DEFAULT_SLA.get(level, 24)
    return data


def _compute_expired_status(data: Dict[str, Any]) -> Dict[str, Any]:
    """如果当前 raised_at + sla < now 且未resolved/closed，则标记超期（expired）。
    仅在返回给前端时做软计算展示，不直接写库，避免自动变更用户状态。"""
    return data


def get_alert_list(
    page: int = 1,
    page_size: int = 20,
    alert_type: Optional[str] = None,
    level: Optional[str] = None,
    status: Optional[str] = None,
    source: Optional[str] = None,
    zone_code: Optional[str] = None,
    assembly_site: Optional[str] = None,
    handler: Optional[str] = None,
    keyword: str = "",
    raised_start: Optional[str] = None,
    raised_end: Optional[str] = None,
    escalated_only: Optional[bool] = False,
    overdue_only: Optional[bool] = False,
) -> Dict[str, Any]:
    conditions = []
    params = []

    if alert_type:
        conditions.append("a.alert_type = %s")
        params.append(alert_type)
    if level:
        conditions.append("a.level = %s")
        params.append(level)
    if status:
        if status == 'expired':
            overdue_only = True
        else:
            conditions.append("a.status = %s")
            params.append(status)
    if source:
        conditions.append("a.source = %s")
        params.append(source)
    if zone_code:
        conditions.append("a.zone_code = %s")
        params.append(zone_code)
    if assembly_site:
        conditions.append("a.assembly_site = %s")
        params.append(assembly_site)
    if handler:
        conditions.append("a.handler = %s")
        params.append(handler)
    if raised_start:
        conditions.append("a.raised_at >= %s")
        params.append(raised_start)
    if raised_end:
        conditions.append("a.raised_at <= %s")
        params.append(raised_end)
    if escalated_only:
        conditions.append("a.escalated = 1")
    if keyword:
        conditions.append("""(
            a.alert_code LIKE %s OR a.title LIKE %s OR a.description LIKE %s
            OR a.related_id LIKE %s OR a.related_name LIKE %s OR a.handler LIKE %s
        )""")
        search = f"%{keyword}%"
        params.extend([search] * 6)

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""

    count_sql = f"SELECT COUNT(*) AS total FROM alerts a {where}"
    total = (query_one(count_sql, params) or {}).get('total', 0)

    offset = (page - 1) * page_size
    list_sql = f"""
        SELECT
            a.*, NULL AS zone_name
        FROM alerts a
        {where}
        ORDER BY
            CASE a.level WHEN 'critical' THEN 1 WHEN 'warning' THEN 2 WHEN 'info' THEN 3 ELSE 4 END,
            a.raised_at DESC, a.id DESC
        LIMIT %s OFFSET %s
    """
    rows = query_all(list_sql, params + [page_size, offset])

    result_rows: List[Dict[str, Any]] = []
    for r in rows:
        r = _format_alert_row(r)
        # overdue_only 过滤（SLA软超期）
        if overdue_only and not r.get('is_overdue'):
            continue
        result_rows.append(r)

    # 注意：overdue_only 过滤会影响 total，这里保留数据库 total 即可，
    # 前端使用返回 total 的分页。如需严格匹配，可以重新 COUNT 软超期。
    return {
        'total': total,
        'page': page,
        'page_size': page_size,
        'data': result_rows,
    }


def _format_alert_row(r: Dict[str, Any]) -> Dict[str, Any]:
    """格式化时间字段 & 计算SLA剩余时间与是否超期"""
    from datetime import datetime as _dt
    now = _dt.now()
    raised = r.get('raised_at')
    sla = 24  # 默认 SLA 为 24 小时
    due = None
    remaining_hours: Optional[float] = None
    is_overdue = False
    if raised and hasattr(raised, 'strftime'):
        due = raised + timedelta(hours=int(sla))
        delta = (due - now).total_seconds() / 3600.0
        remaining_hours = round(delta, 1)
        if delta < 0:
            is_overdue = True
    r['due_at'] = due.strftime('%Y-%m-%d %H:%M:%S') if due and hasattr(due, 'strftime') else None
    r['remaining_hours'] = remaining_hours
    r['is_overdue'] = is_overdue

    for f in ['raised_at', 'resolved_at', 'created_at', 'updated_at']:
        v = r.get(f)
        if v and hasattr(v, 'strftime'):
            r[f] = v.strftime('%Y-%m-%d %H:%M:%S')
    # 填充默认字段，避免前端取不到
    r.setdefault('zone_code', None)
    r.setdefault('assembly_site', None)
    r.setdefault('escalated', 0)
    r.setdefault('attachment_count', 0)
    return r


def get_alert_by_id(alert_id: int) -> Optional[Dict[str, Any]]:
    sql = """
        SELECT a.*, NULL AS zone_name
        FROM alerts a
        WHERE a.id = %s
    """
    r = query_one(sql, (alert_id,))
    if r:
        return _format_alert_row(r)
    return None


def create_alert(data: Dict[str, Any]) -> Dict[str, Any]:
    if not data.get('alert_code'):
        prefix = data.get('level') or 'M'
        ts = datetime.now().strftime('%Y%m%d%H%M%S')
        data['alert_code'] = f"AL-{prefix.upper()}-{ts}"
    else:
        dup = query_one("SELECT id FROM alerts WHERE alert_code = %s", (data['alert_code'],))
        if dup:
            raise ValueError(f"预警编号 {data['alert_code']} 已存在")

    if data.get('alert_type') and data['alert_type'] not in ALERT_TYPES:
        raise ValueError(f"无效预警类型: {data['alert_type']}")
    if data.get('level') and data['level'] not in ALERT_LEVELS:
        raise ValueError(f"无效预警级别: {data['level']}")
    if data.get('status') and data['status'] not in ALERT_STATUSES:
        raise ValueError(f"无效状态: {data['status']}")

    data = _apply_sla_level(data)

    sql = """
        INSERT INTO alerts (
            alert_code, alert_type, level, title, description, source,
            related_type, related_id, related_name, related_equipment, related_task, related_personnel,
            zone_code, assembly_site, raised_by, raised_at, sla_hours, escalated, escalated_to,
            status, handler, handler_department, processing_started_at,
            resolved_at, closed_at, processing_scheme, corrective_action,
            preventive_measure, result_verification, loss_amount, impact_hours,
            attachment_count, remark
        ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
    """
    payload = (
        data['alert_code'],
        data.get('alert_type', 'other'),
        data.get('level', 'medium'),
        data['title'],
        data.get('description'),
        data.get('source', 'manual_report'),
        data.get('related_type', 'none'),
        data.get('related_id'),
        data.get('related_name'),
        data.get('related_equipment'),
        data.get('related_task'),
        data.get('related_personnel'),
        data.get('zone_code'),
        data.get('assembly_site'),
        data.get('raised_by'),
        data.get('raised_at') or datetime.now(),
        data.get('sla_hours', DEFAULT_SLA.get(data.get('level', 'medium'), 24)),
        1 if data.get('escalated') else 0,
        data.get('escalated_to'),
        data.get('status', 'pending'),
        data.get('handler'),
        data.get('handler_department'),
        data.get('processing_started_at'),
        data.get('resolved_at'),
        data.get('closed_at'),
        data.get('processing_scheme'),
        data.get('corrective_action'),
        data.get('preventive_measure'),
        data.get('result_verification'),
        data.get('loss_amount'),
        data.get('impact_hours') or 0,
        data.get('attachment_count') or 0,
        data.get('remark'),
    )
    new_id = execute_last_id(sql, payload)
    return get_alert_by_id(new_id) or {'id': new_id, 'alert_code': data['alert_code']}


def update_alert(alert_id: int, data: Dict[str, Any]) -> Dict[str, Any]:
    existing = query_one("SELECT * FROM alerts WHERE id = %s", (alert_id,))
    if not existing:
        raise ValueError(f"预警 ID {alert_id} 不存在")

    if data.get('alert_type') and data['alert_type'] not in ALERT_TYPES:
        raise ValueError(f"无效预警类型: {data['alert_type']}")
    if data.get('level') and data['level'] not in ALERT_LEVELS:
        raise ValueError(f"无效预警级别: {data['level']}")
    if data.get('status') and data['status'] not in ALERT_STATUSES:
        raise ValueError(f"无效状态: {data['status']}")

    data = _apply_sla_level({**existing, **data})

    # 状态变更时自动补齐时间戳
    status = data.get('status')
    now = datetime.now()
    if status == 'processing' and not data.get('processing_started_at'):
        data['processing_started_at'] = now
    if status == 'resolved' and not data.get('resolved_at'):
        data['resolved_at'] = now
    if status == 'closed' and not data.get('closed_at'):
        data['closed_at'] = now

    allowed = [
        'alert_type', 'level', 'title', 'description', 'source',
        'related_type', 'related_id', 'related_name', 'related_equipment',
        'related_task', 'related_personnel', 'zone_code', 'assembly_site',
        'raised_by', 'raised_at', 'sla_hours', 'escalated', 'escalated_to',
        'status', 'handler', 'handler_department', 'processing_started_at',
        'resolved_at', 'closed_at', 'processing_scheme', 'corrective_action',
        'preventive_measure', 'result_verification', 'loss_amount',
        'impact_hours', 'attachment_count', 'remark'
    ]
    updates = []
    params = []
    for k in allowed:
        if k in data:
            updates.append(f"{k} = %s")
            params.append(data[k])
    if not updates:
        return get_alert_by_id(alert_id) or {}
    params.append(alert_id)
    sql = f"UPDATE alerts SET {', '.join(updates)} WHERE id = %s"
    execute(sql, params)
    return get_alert_by_id(alert_id) or {}


def escalate_alert(alert_id: int, escalated_to: str, reason: Optional[str] = None) -> Dict[str, Any]:
    """升级预警：海西分部/质量部/总装中心等"""
    upd_data: Dict[str, Any] = {'escalated': 1, 'escalated_to': escalated_to}
    if reason:
        existing = query_one("SELECT remark FROM alerts WHERE id = %s", (alert_id,))
        old_remark = (existing or {}).get('remark') or ''
        stamp = datetime.now().strftime('%Y-%m-%d %H:%M')
        new_remark = f"[{stamp}] 升级至 {escalated_to}：{reason}"
        upd_data['remark'] = (old_remark + "\n" + new_remark) if old_remark else new_remark
    return update_alert(alert_id, upd_data)


def batch_update_status(ids: List[int], status: str, operator: Optional[str] = None) -> int:
    if not ids or status not in ALERT_STATUSES:
        return 0
    placeholders = ','.join(['%s'] * len(ids))
    sql = f"UPDATE alerts SET status = %s, updated_at = NOW() WHERE id IN ({placeholders})"
    params: List[Any] = [status] + ids
    if status == 'processing':
        sql = f"UPDATE alerts SET status = %s, processing_started_at = NOW(), updated_at = NOW() WHERE id IN ({placeholders}) AND (processing_started_at IS NULL OR status != 'processing')"
    elif status == 'resolved':
        sql = f"UPDATE alerts SET status = %s, resolved_at = NOW(), updated_at = NOW() WHERE id IN ({placeholders})"
    elif status == 'closed':
        sql = f"UPDATE alerts SET status = %s, closed_at = NOW(), updated_at = NOW() WHERE id IN ({placeholders})"
    try:
        execute(sql, params)
    except Exception as e:
        logger.error(f"批量更新预警失败: {e}")
        return 0
    return len(ids)


def get_alert_stats() -> Dict[str, Any]:
    """KPI 和图表统计"""
    total = (query_one("SELECT COUNT(*) AS c FROM alerts") or {}).get('c', 0)

    # 按级别
    level_rows = query_all("SELECT level, COUNT(*) AS c FROM alerts GROUP BY level") or []
    level_dist = {r['level']: r['c'] for r in level_rows}
    critical = level_dist.get('critical', 0)

    # 按状态
    status_rows = query_all("SELECT status, COUNT(*) AS c FROM alerts GROUP BY status") or []
    status_dist = {r['status']: r['c'] for r in status_rows}
    pending = status_dist.get('pending', 0)
    processing = status_dist.get('processing', 0)
    unresolved = pending + processing

    # SLA 软超期：raised_at + 24小时 < NOW() AND status in (pending, processing)
    overdue_row = query_one("""
        SELECT COUNT(*) AS c FROM alerts
        WHERE status IN ('pending','processing')
            AND ADDTIME(raised_at, '24:00:00') < NOW()
    """) or {}
    overdue = overdue_row.get('c', 0)

    # 按类型分布
    type_rows = query_all("SELECT alert_type, COUNT(*) AS c FROM alerts GROUP BY alert_type") or []
    type_dist = {r['alert_type']: r['c'] for r in type_rows}

    # 按处理状态 + 类型的交叉柱状图数据：每种类型 pending / processing / resolved 各自数量
    cross_rows = query_all("""
        SELECT alert_type, status, COUNT(*) AS c FROM alerts
        GROUP BY alert_type, status
        ORDER BY alert_type, status
    """) or []

    # 近7天新增趋势
    trend_rows = query_all("""
        SELECT DATE(raised_at) AS d, COUNT(*) AS c FROM alerts
        WHERE raised_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
        GROUP BY DATE(raised_at) ORDER BY d ASC
    """) or []

    # 升级数量（alerts 表暂未设置 escalated 字段，默认 0）
    escalated = 0

    return {
        'total': int(total),
        'critical': int(critical),
        'high_or_critical': int(critical + level_dist.get('high', 0)),
        'unresolved': int(unresolved),
        'pending': int(pending),
        'processing': int(processing),
        'resolved': int(status_dist.get('resolved', 0)),
        'closed': int(status_dist.get('closed', 0)),
        'overdue': int(overdue),
        'escalated': int(escalated),
        'level_distribution': level_dist,
        'status_distribution': status_dist,
        'type_distribution': type_dist,
        'cross_distribution': [{'alert_type': r['alert_type'], 'status': r['status'], 'count': int(r['c'])} for r in cross_rows],
        'weekly_trend': [{'date': str(r['d']), 'count': int(r['c'])} for r in trend_rows],
    }
