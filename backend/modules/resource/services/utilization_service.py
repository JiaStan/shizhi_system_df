# -*- coding: utf-8 -*-
"""
资源占用看板服务层
按需求文档V6 3.4「资源占用看板」提供试制排程矩阵数据：
- 按场地（SZA/SZC/SZB/JP1/JP2/LH/CX1/CX2）聚合试制能力、设备配置、项目排程
- 按周展开排程甘特格（已完成 done / 进行中 doing / 待排 wait / 排定中 plan）
- KPI 汇总（场地总数、项目排程、设备数、预算、采购、场地占用率）
- 周度占用率趋势、设备利用率排名（开发计划V6 2.2.8）
"""
from typing import Optional, Dict, Any, List
from decimal import Decimal
from datetime import datetime, date, timedelta

from backend.database import query_all
from backend.logger import logger


# ==================== 静态配置 ====================

# zones.zone_type → 看板场地分组
AREA_TYPE_MAP = {
    'assembly': 'assembly',
    'island': 'assembly',
    'prototype': 'wp',
    'external': 'cx',
}

AREA_TYPE_LABELS = {
    'assembly': '装配区',
    'wp': '竞品区',
    'cx': '外委区',
}

# 场地扩展信息（需求文档 3.4.3 场地试制能力与设备配置）
AREA_EXTRA: Dict[str, Dict[str, Any]] = {
    'SZA': {'short_name': '装配一期', 'location': '总院A区', 'manager': '范骁',
            'capacity': '2个项目 或 单项目B类当量40台', 'mat_desc': '试制岛产线（串岛）', 'lift_count': 0},
    'SZC': {'short_name': '仓库装配', 'location': '总院仓库', 'manager': '王鹏',
            'capacity': '单项目B类当量20台', 'mat_desc': '单排/两排举升机各5台（共10台）', 'lift_count': 5},
    'SZB': {'short_name': '装配二期', 'location': '总院B区', 'manager': '邢浩然',
            'capacity': '2个项目 或 单项目B类当量24台', 'mat_desc': '6台举升机', 'lift_count': 6},
    'JP1': {'short_name': '竞品一区', 'location': '竞品区1', 'manager': '李思贤',
            'capacity': '单项目B类当量12台', 'mat_desc': '3台举升机', 'lift_count': 3},
    'JP2': {'short_name': '竞品二区', 'location': '竞品区2', 'manager': '李思贤',
            'capacity': '单项目B类当量16台', 'mat_desc': '4台举升机', 'lift_count': 4},
    'LH': {'short_name': '联合装配', 'location': '联合区', 'manager': '金执',
           'capacity': '单项目B类当量12台', 'mat_desc': '3-5台举升机', 'lift_count': 5},
    'CX1': {'short_name': '外委畅行', 'location': '外委区1', 'manager': '外委',
            'capacity': '2个项目 或 单项目B类当量52台', 'mat_desc': 'M18-300HEV/BD-515 合计13台举升', 'lift_count': 13},
    'CX2': {'short_name': '外委交石', 'location': '外委区2', 'manager': '外委',
            'capacity': '2个项目 或 单项目B类当量44台', 'mat_desc': 'M18-200HEV/E70-702 合计11台举升', 'lift_count': 11},
}

# 项目预算/采购数量等业务补充信息（外部系统数据到位前使用需求文档示例数据）
PROJECT_META: Dict[str, Dict[str, Any]] = {
    'S3JET0':    {'name': '试制局(淋雨)', 'cat': 'B', 'budget': 71, 'qty': 71, 'done': 3, 'lift_desc': '2台举升机'},
    'DH3':       {'name': '矮车棚',       'cat': 'C', 'budget': 56, 'qty': 10, 'done': 8, 'lift_desc': '2台举升机'},
    'S599841':   {'name': '总装装车零件', 'cat': 'B', 'budget': 8,  'qty': 10, 'done': 3, 'lift_desc': '4台举升机'},
    '乐风翼子车': {'name': '翼子车',       'cat': 'C', 'budget': 7,  'qty': 12, 'done': 12, 'lift_desc': '2台举升机'},
    'DHTMPV':    {'name': 'MPV样车',      'cat': 'A', 'budget': 11, 'qty': 4,  'done': 4, 'lift_desc': '4台举升机'},
    '7J38E10':   {'name': '整车试装',     'cat': 'C', 'budget': 26, 'qty': 26, 'done': 0, 'lift_desc': '2台举升机'},
    'N1F1':      {'name': '长征汽车',     'cat': 'B', 'budget': 7,  'qty': 7,  'done': 0, 'lift_desc': '3台举升机'},
    'N356':      {'name': '越野车',       'cat': 'A', 'budget': 33, 'qty': 33, 'done': 0, 'lift_desc': '6台举升机'},
    'M18MPV':    {'name': 'MPV样车',      'cat': 'B', 'budget': 6,  'qty': 10, 'done': 7, 'lift_desc': '8台举升机'},
    'M18-300HEV': {'name': '300HEV',      'cat': 'B', 'budget': 7,  'qty': 13, 'done': 7, 'lift_desc': '3台举升机'},
    'BD-515':    {'name': 'BD-515项目',   'cat': 'C', 'budget': 3,  'qty': 3,  'done': 0, 'lift_desc': '3台举升机'},
    'M18-200HEV': {'name': '200HEV',      'cat': 'B', 'budget': 7,  'qty': 13, 'done': 0, 'lift_desc': '7台举升机'},
    'E70-702':   {'name': 'E70-702',      'cat': 'C', 'budget': 3,  'qty': 7,  'done': 0, 'lift_desc': '1台举升机'},
}

AREA_ORDER = ['SZA', 'SZC', 'SZB', 'JP1', 'JP2', 'LH', 'CX1', 'CX2']


# ==================== 工具函数 ====================

def _to_float(v, default=0.0) -> float:
    if v is None:
        return default
    if isinstance(v, Decimal):
        return float(v)
    try:
        return float(v)
    except (TypeError, ValueError):
        return default


def _to_int(v, default=0) -> int:
    return int(_to_float(v, default))


def _fmt_dt(v) -> Optional[str]:
    if not v:
        return None
    if isinstance(v, (datetime, date)):
        return v.strftime('%Y-%m-%d %H:%M:%S') if isinstance(v, datetime) else v.strftime('%Y-%m-%d')
    return str(v)


def _week_list(weeks: int, ref: Optional[date] = None) -> List[Dict[str, Any]]:
    """生成从本周一开始的周序列"""
    ref = ref or date.today()
    monday = ref - timedelta(days=ref.weekday())
    result = []
    for i in range(weeks):
        ws = monday + timedelta(days=7 * i)
        we = ws + timedelta(days=6)
        iso_week = ws.isocalendar()[1]
        result.append({
            'index': i,
            'label': f"{ws.month}-W{iso_week}",
            'range': f"{ws.month}.{ws.day}~{we.month}.{we.day}",
            'start': ws.strftime('%Y-%m-%d'),
            'end': we.strftime('%Y-%m-%d'),
            'is_current': ws <= ref <= we,
        })
    return result


def _load_schedules() -> List[Dict[str, Any]]:
    """
    加载排程数据：优先 gantt_schedules，无数据时回退 tasks 表
    返回统一结构：
    {id, code, name, cat, project_code, site, plan_start, plan_end,
     status, progress, lift_count, equipment_code, source}
    """
    rows = query_all(
        "SELECT id, schedule_code, task_name, task_type, project_code, vehicle_code, "
        "assembly_site, zone_code, status, progress, lift_count, equipment_code, "
        "plan_start_time, plan_end_time "
        "FROM gantt_schedules WHERE status != 'cancelled' "
        "ORDER BY assembly_site, plan_start_time"
    )
    source = 'gantt_schedules'
    if not rows:
        rows = query_all(
            "SELECT id, task_code, task_name, task_type, project_code, vehicle_code, "
            "assembly_site, zone_code, status, progress, lift_count, equipment_code, "
            "plan_start_time, plan_end_time "
            "FROM tasks ORDER BY zone_code, plan_start_time"
        )
        source = 'tasks'

    schedules = []
    for r in rows:
        site = r.get('assembly_site') or r.get('zone_code')
        if not site:
            continue
        project_code = r.get('project_code') or r.get('vehicle_code') \
            or (r.get('schedule_code') if source == 'gantt_schedules' else r.get('task_code'))
        schedules.append({
            'id': r.get('id'),
            'code': r.get('schedule_code') if source == 'gantt_schedules' else r.get('task_code'),
            'name': r.get('task_name'),
            'cat': r.get('task_type') or 'C',
            'project_code': project_code,
            'site': site,
            'plan_start': r.get('plan_start_time'),
            'plan_end': r.get('plan_end_time'),
            'status': r.get('status'),
            'progress': _to_float(r.get('progress')),
            'lift_count': _to_int(r.get('lift_count')),
            'equipment_code': r.get('equipment_code'),
            'source': source,
        })
    return schedules


def _match_meta(sched: Dict[str, Any]) -> Dict[str, Any]:
    """按项目编号/车型/任务名匹配项目补充信息"""
    for key in (sched.get('project_code'), sched.get('name')):
        if key and key in PROJECT_META:
            return PROJECT_META[key]
    return {}


def _week_cell(sched: Dict[str, Any], week_start: date, week_end: date) -> Optional[Dict[str, str]]:
    """
    计算单条排程在某周的甘特格状态：
    - done  深绿：已完成，显示 "X台"
    - doing 浅绿：进行中，显示 "已完成/总数量"
    - wait  黄：待排，显示 "剩余 X 台"
    - plan  红：排定中，显示预计开始日期
    """
    ps, pe = sched.get('plan_start'), sched.get('plan_end')
    if not ps or not pe:
        return None
    ps_d = ps.date() if isinstance(ps, datetime) else ps
    pe_d = pe.date() if isinstance(pe, datetime) else pe
    if pe_d < week_start or ps_d > week_end:
        return None

    progress = sched.get('progress') or 0
    qty = sched.get('qty') or 0
    done = sched.get('done') or 0

    if sched.get('status') == 'completed' or progress >= 100:
        return {'status': 'done', 'text': f'{done or qty}台' if qty else '已完成'}
    if progress > 0:
        return {'status': 'doing', 'text': f'{done}/{qty}' if qty else f'{progress:.0f}%'}
    if week_start <= ps_d <= week_end:
        return {'status': 'plan', 'text': f'{ps_d.month}月{ps_d.day}日'}
    return {'status': 'wait', 'text': f'剩余{qty - done}台' if qty else '待排'}


def _load_areas() -> List[Dict[str, Any]]:
    """加载场地信息（zones + 设备计数 + 扩展配置）"""
    zones = query_all("SELECT zone_code, zone_name, zone_type FROM zones ORDER BY id")
    eq_counts = {
        r['zone_code']: _to_int(r.get('cnt'))
        for r in query_all("SELECT zone_code, COUNT(*) AS cnt FROM equipment GROUP BY zone_code")
    }
    areas = []
    for z in zones:
        code = z['zone_code']
        extra = AREA_EXTRA.get(code, {})
        areas.append({
            'zone_code': code,
            'zone_name': z['zone_name'],
            'short_name': extra.get('short_name', z['zone_name']),
            'area_type': AREA_TYPE_MAP.get(z['zone_type'], 'assembly'),
            'area_type_label': AREA_TYPE_LABELS.get(AREA_TYPE_MAP.get(z['zone_type'], 'assembly'), '其他'),
            'location': extra.get('location', ''),
            'manager': extra.get('manager', ''),
            'eq_count': eq_counts.get(code, 0),
            'lift_count': extra.get('lift_count', 0),
            'capacity': extra.get('capacity', ''),
            'mat_desc': extra.get('mat_desc', ''),
        })
    areas.sort(key=lambda a: AREA_ORDER.index(a['zone_code']) if a['zone_code'] in AREA_ORDER else 99)
    return areas


# ==================== 对外接口 ====================

def get_utilization_board(weeks: int = 10) -> Dict[str, Any]:
    """资源占用看板主数据：场地 × 项目排程 × 周度甘特矩阵 + KPI"""
    weeks = max(1, min(int(weeks or 10), 26))
    week_list = _week_list(weeks)
    areas = _load_areas()
    schedules = _load_schedules()

    # 排程补充 qty/done 并计算周度格
    for s in schedules:
        meta = _match_meta(s)
        s['project_name'] = meta.get('name') or s['name']
        s['cat'] = meta.get('cat') or s['cat']
        s['budget'] = meta.get('budget', 0)
        s['qty'] = meta.get('qty', 0)
        done = meta.get('done')
        if done is None:
            done = round(s['qty'] * s['progress'] / 100) if s['qty'] else 0
        s['done'] = min(done, s['qty']) if s['qty'] else done
        s['lift_desc'] = meta.get('lift_desc') or (f"{s['lift_count']}台举升机" if s.get('lift_count') else '')
        s['cells'] = []
        for w in week_list:
            ws = datetime.strptime(w['start'], '%Y-%m-%d').date()
            we = datetime.strptime(w['end'], '%Y-%m-%d').date()
            s['cells'].append(_week_cell(s, ws, we))

    # 按场地分组
    area_map = {a['zone_code']: a for a in areas}
    for a in areas:
        a['projects'] = []
    for s in schedules:
        area = area_map.get(s['site'])
        if area is None:
            continue
        area['projects'].append({
            'schedule_id': s['id'],
            'schedule_code': s['code'],
            'project_code': s['project_code'],
            'project_name': s['project_name'],
            'cat': s['cat'],
            'budget': s['budget'],
            'qty': s['qty'],
            'done': s['done'],
            'lift_desc': s['lift_desc'],
            'plan_start': _fmt_dt(s['plan_start']),
            'plan_end': _fmt_dt(s['plan_end']),
            'status': s['status'],
            'progress': s['progress'],
            'source': s['source'],
            'cells': s['cells'],
        })
    for a in areas:
        a['multi_project'] = len(a['projects']) > 1

    # KPI
    area_count = len(areas)
    all_projects = [p for a in areas for p in a['projects']]
    project_count = len(all_projects)
    done_projects = sum(1 for p in all_projects if p['status'] == 'completed' or p['progress'] >= 100)
    doing_projects = sum(1 for p in all_projects if 0 < p['progress'] < 100 and p['status'] != 'completed')
    total_eq = sum(a['eq_count'] for a in areas)
    total_lift = sum(a['lift_count'] for a in areas)
    total_budget = sum(p['budget'] for p in all_projects)
    total_qty = sum(p['qty'] for p in all_projects)
    total_done = sum(p['done'] for p in all_projects)

    # 占用率：有排程覆盖的格子数 / (场地数 × 周数)
    occupied_cells = sum(1 for p in all_projects for c in p['cells'] if c)
    occupied_areas = set()
    for p in all_projects:
        if any(p['cells']):
            occupied_areas.add(p['project_code'])
    total_cells = max(area_count * weeks, 1)

    def _week_occupancy(idx: int) -> float:
        if area_count == 0:
            return 0.0
        used = sum(1 for a in areas if any(p['cells'][idx] for p in a['projects']) and a['projects'])
        return round(used / area_count * 100, 1)

    current_idx = next((w['index'] for w in week_list if w['is_current']), 0)
    kpis = {
        'area_count': area_count,
        'area_assembly': sum(1 for a in areas if a['area_type'] == 'assembly'),
        'area_wp': sum(1 for a in areas if a['area_type'] == 'wp'),
        'area_cx': sum(1 for a in areas if a['area_type'] == 'cx'),
        'project_count': project_count,
        'project_done': done_projects,
        'project_doing': doing_projects,
        'eq_count': total_eq,
        'lift_count': total_lift,
        'budget_total': total_budget,
        'qty_total': total_qty,
        'done_total': total_done,
        'occupancy_rate': round(occupied_cells / total_cells * 100, 1),
        'occupancy_current_week': _week_occupancy(current_idx),
        'occupancy_next_week': _week_occupancy(current_idx + 1) if current_idx + 1 < weeks else 0.0,
        'data_source': schedules[0]['source'] if schedules else 'none',
    }

    return {'weeks': week_list, 'areas': areas, 'kpis': kpis}


def get_utilization_trend(weeks: int = 10) -> Dict[str, Any]:
    """周度场地占用率趋势（折线图用）"""
    weeks = max(1, min(int(weeks or 10), 26))
    week_list = _week_list(weeks)
    areas = _load_areas()
    schedules = _load_schedules()
    area_count = max(len(areas), 1)

    trend = []
    for w in week_list:
        ws = datetime.strptime(w['start'], '%Y-%m-%d').date()
        we = datetime.strptime(w['end'], '%Y-%m-%d').date()
        occupied_sites = set()
        project_count = 0
        for s in schedules:
            ps, pe = s.get('plan_start'), s.get('plan_end')
            if not ps or not pe:
                continue
            ps_d = ps.date() if isinstance(ps, datetime) else ps
            pe_d = pe.date() if isinstance(pe, datetime) else pe
            if pe_d < ws or ps_d > we:
                continue
            occupied_sites.add(s['site'])
            project_count += 1
        trend.append({
            'week': w['label'],
            'range': w['range'],
            'is_current': w['is_current'],
            'occupancy_rate': round(len(occupied_sites) / area_count * 100, 1),
            'occupied_areas': len(occupied_sites),
            'project_count': project_count,
        })
    return {'weeks': week_list, 'trend': trend}


def get_equipment_utilization_rank(days: int = 28, limit: int = 10) -> Dict[str, Any]:
    """
    设备利用率排名：统计窗口内设备被排程占用的时长占比
    利用率 = 排程重叠小时数 / (窗口天数 × 8小时工作日)，封顶 100%
    """
    days = max(7, min(int(days or 28), 90))
    limit = max(1, min(int(limit or 10), 50))
    today = date.today()
    win_start = datetime.combine(today - timedelta(days=days // 2), datetime.min.time())
    win_end = datetime.combine(today + timedelta(days=days - days // 2), datetime.min.time())

    equipments = query_all(
        "SELECT equipment_code, equipment_name, equipment_type, zone_code, status FROM equipment"
    )
    schedules = _load_schedules()

    # 展开排程的设备编号（支持逗号分隔多设备）
    occupied: Dict[str, float] = {}
    for s in schedules:
        if not s.get('equipment_code') or not s.get('plan_start') or not s.get('plan_end'):
            continue
        ps = s['plan_start'] if isinstance(s['plan_start'], datetime) else datetime.combine(s['plan_start'], datetime.min.time())
        pe = s['plan_end'] if isinstance(s['plan_end'], datetime) else datetime.combine(s['plan_end'], datetime.min.time())
        overlap_start = max(ps, win_start)
        overlap_end = min(pe, win_end)
        overlap_hours = max(0.0, (overlap_end - overlap_start).total_seconds() / 3600)
        if overlap_hours <= 0:
            continue
        for code in str(s['equipment_code']).split(','):
            code = code.strip()
            if code:
                occupied[code] = occupied.get(code, 0.0) + overlap_hours

    denominator = days * 8.0
    ranking = []
    for eq in equipments:
        code = eq['equipment_code']
        hours = occupied.get(code, 0.0)
        ranking.append({
            'equipment_code': code,
            'equipment_name': eq['equipment_name'],
            'equipment_type': eq['equipment_type'],
            'zone_code': eq['zone_code'],
            'status': eq['status'],
            'occupied_hours': round(hours, 1),
            'utilization_rate': min(100.0, round(hours / denominator * 100, 1)),
        })
    ranking.sort(key=lambda x: x['utilization_rate'], reverse=True)

    avg_rate = round(sum(r['utilization_rate'] for r in ranking) / len(ranking), 1) if ranking else 0.0
    return {
        'window_days': days,
        'window_start': win_start.strftime('%Y-%m-%d'),
        'window_end': win_end.strftime('%Y-%m-%d'),
        'avg_utilization_rate': avg_rate,
        'ranking': ranking[:limit],
    }
