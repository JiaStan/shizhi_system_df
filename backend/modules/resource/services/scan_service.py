# -*- coding: utf-8 -*-
"""
试制资源管理模块 - 扫码占用（现场作业）服务

职责：
1. 扫码页数据：设备当前状态 + 进行中作业会话、可选任务/人员列表
2. 开始作业：写入 work_sessions，联动 equipment / personnel / tasks 三表
3. 结束作业：关闭会话，设备/人员重置为空闲
4. 设备扫码二维码图片生成
"""

import io
import json
from datetime import datetime

from backend.database import get_conn, query_all, query_one


class ScanError(Exception):
    """扫码占用业务异常"""


def _fmt(dt):
    if not dt:
        return None
    return dt.strftime('%Y-%m-%d %H:%M:%S')


def _parse_json_list(text):
    if not text:
        return []
    try:
        val = json.loads(text)
        return val if isinstance(val, list) else []
    except Exception:
        return []


def _session_to_dict(row):
    if not row:
        return None
    d = dict(row)
    d['personnel_codes'] = _parse_json_list(row.get('personnel_codes'))
    d['personnel_names'] = _parse_json_list(row.get('personnel_names'))
    d['start_time'] = _fmt(row.get('start_time'))
    d['end_time'] = _fmt(row.get('end_time'))
    return d


# ==================== 查询 ====================

def get_scan_state(equipment_code: str) -> dict:
    """扫码页初始数据：设备信息 + 当前进行中作业（若有）"""
    eq = query_one(
        """
        SELECT e.equipment_code, e.equipment_name, e.equipment_type, e.zone_code,
               e.status, e.current_task_id, e.current_operator, z.zone_name
        FROM equipment e
        LEFT JOIN zones z ON e.zone_code = z.zone_code
        WHERE e.equipment_code = %s
        """,
        (equipment_code,),
    )
    if not eq:
        raise ScanError(f'设备 {equipment_code} 不存在')
    session = query_one(
        "SELECT * FROM work_sessions WHERE equipment_code = %s AND status = 'active' ORDER BY id DESC LIMIT 1",
        (equipment_code,),
    )
    return {
        'equipment': {
            'equipment_code': eq['equipment_code'],
            'equipment_name': eq['equipment_name'],
            'equipment_type': eq['equipment_type'],
            'zone_code': eq['zone_code'],
            'zone_name': eq['zone_name'] or eq['zone_code'],
            'status': eq['status'],
        },
        'session': _session_to_dict(session),
    }


def get_scan_options() -> dict:
    """扫码页可选数据：零星任务 / ABC类任务 / 作业人员"""
    sporadic = query_all(
        """
        SELECT id, task_code, task_name, task_type, status
        FROM tasks
        WHERE task_type = 'sporadic' AND status IN ('pending', 'in_progress')
        ORDER BY id DESC
        LIMIT 200
        """
    )
    abc_rows = query_all(
        """
        SELECT id, task_code, task_name, task_type, status
        FROM tasks
        WHERE task_type IN ('A', 'B', 'C') AND status IN ('pending', 'in_progress', 'overdue')
        ORDER BY task_type, id
        LIMIT 500
        """
    )
    abc = {'A': [], 'B': [], 'C': []}
    for r in abc_rows:
        abc.setdefault(r['task_type'], []).append(r)
    personnel = query_all(
        """
        SELECT personnel_code, name, status
        FROM personnel
        ORDER BY FIELD(status, 'idle', 'working', 'offline'), personnel_code
        """
    )
    return {'sporadic_tasks': sporadic, 'abc_tasks': abc, 'personnel': personnel}


def list_active_sessions() -> list:
    """全部进行中作业（园区地图/资源占用同步用）"""
    rows = query_all("SELECT * FROM work_sessions WHERE status = 'active' ORDER BY id")
    return [_session_to_dict(r) for r in rows]


# ==================== 开始 / 结束作业 ====================

def start_work(equipment_code: str, task_id, task_name: str, task_category: str,
               personnel_codes: list) -> dict:
    """开始作业（单事务联动 equipment / personnel / tasks / work_sessions）"""
    task_name = (task_name or '').strip()
    personnel_codes = [c for c in (personnel_codes or []) if c]
    if not task_name:
        raise ScanError('请选择或录入任务')
    if not personnel_codes:
        raise ScanError('请至少选择 1 名作业人员')

    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM equipment WHERE equipment_code = %s FOR UPDATE", (equipment_code,))
            eq = cur.fetchone()
            if not eq:
                raise ScanError(f'设备 {equipment_code} 不存在')
            cur.execute(
                "SELECT id FROM work_sessions WHERE equipment_code = %s AND status = 'active' LIMIT 1",
                (equipment_code,),
            )
            if cur.fetchone():
                raise ScanError('该设备当前已有进行中的作业，请先结束作业')

            # 人员校验
            placeholders = ','.join(['%s'] * len(personnel_codes))
            cur.execute(
                f"SELECT personnel_code, name FROM personnel WHERE personnel_code IN ({placeholders})",
                tuple(personnel_codes),
            )
            people = cur.fetchall()
            if len(people) != len(set(personnel_codes)):
                raise ScanError('部分作业人员不存在，请刷新后重试')
            names = [p['name'] for p in people]

            now = datetime.now()
            zone_code = eq['zone_code']

            # 任务：关联已有任务 或 手工录入新建
            task_source = 'table'
            if task_id:
                cur.execute("SELECT id, task_name, task_type FROM tasks WHERE id = %s", (task_id,))
                task = cur.fetchone()
                if not task:
                    raise ScanError('所选任务不存在，请刷新后重试')
                task_name = task['task_name']
                task_category = task_category or {'A': 'A类', 'B': 'B类', 'C': 'C类', 'sporadic': '零星'}.get(task['task_type'], task['task_type'])
                cur.execute(
                    """
                    UPDATE tasks
                    SET status = 'in_progress',
                        zone_code = COALESCE(zone_code, %s),
                        assembly_site = COALESCE(assembly_site, %s),
                        equipment_code = COALESCE(equipment_code, %s),
                        lift_count = CASE WHEN %s = 'lift' THEN COALESCE(lift_count, 1) ELSE lift_count END,
                        plan_start_time = COALESCE(plan_start_time, %s)
                    WHERE id = %s
                    """,
                    (zone_code, zone_code, equipment_code, eq['equipment_type'], now, task_id),
                )
            else:
                task_source = 'manual'
                task_code = 'WS-' + now.strftime('%y%m%d%H%M%S')
                cur.execute(
                    """
                    INSERT INTO tasks
                        (task_code, task_name, task_type, status, zone_code, assembly_site,
                         equipment_code, lift_count, plan_start_time, source)
                    VALUES (%s, %s, 'sporadic', 'in_progress', %s, %s, %s,
                            CASE WHEN %s = 'lift' THEN 1 ELSE NULL END, %s, 'operation')
                    """,
                    (task_code, task_name, zone_code, zone_code, equipment_code,
                     eq['equipment_type'], now),
                )
                task_id = cur.lastrowid
                task_category = task_category or '零星'

            # 作业会话
            session_code = 'WS-' + now.strftime('%Y%m%d%H%M%S') + '-' + equipment_code
            cur.execute(
                """
                INSERT INTO work_sessions
                    (session_code, equipment_code, zone_code, task_id, task_name, task_category,
                     task_source, personnel_codes, personnel_names, personnel_count, start_time, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'active')
                """,
                (session_code, equipment_code, zone_code, task_id, task_name, task_category,
                 task_source, json.dumps(personnel_codes, ensure_ascii=False),
                 json.dumps(names, ensure_ascii=False), len(names), now),
            )

            # 设备 → 占用
            cur.execute(
                """
                UPDATE equipment
                SET status = 'busy', current_task_id = %s, current_operator = %s
                WHERE equipment_code = %s
                """,
                (task_id, '、'.join(names), equipment_code),
            )

            # 人员 → 工作中 + 所在场地
            cur.execute(
                f"""
                UPDATE personnel
                SET status = 'working', current_zone = %s, current_task_id = %s
                WHERE personnel_code IN ({placeholders})
                """,
                (zone_code, task_id) + tuple(personnel_codes),
            )

        conn.commit()
    except ScanError:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise ScanError(f'开始作业失败: {e}')
    finally:
        conn.close()

    return get_scan_state(equipment_code)


def end_work(equipment_code: str) -> dict:
    """结束作业：关闭会话，设备/人员重置空闲；手工录入任务自动完成"""
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM work_sessions WHERE equipment_code = %s AND status = 'active' ORDER BY id DESC LIMIT 1 FOR UPDATE",
                (equipment_code,),
            )
            session = cur.fetchone()
            if not session:
                raise ScanError('该设备当前没有进行中的作业')

            now = datetime.now()
            cur.execute(
                "UPDATE work_sessions SET status = 'finished', end_time = %s WHERE id = %s",
                (now, session['id']),
            )
            # 设备 → 空闲
            cur.execute(
                "UPDATE equipment SET status = 'idle', current_task_id = NULL, current_operator = NULL WHERE equipment_code = %s",
                (equipment_code,),
            )
            # 人员 → 空闲，清除场地/任务
            codes = _parse_json_list(session.get('personnel_codes'))
            if codes:
                placeholders = ','.join(['%s'] * len(codes))
                cur.execute(
                    f"""
                    UPDATE personnel
                    SET status = 'idle', current_zone = NULL, current_task_id = NULL
                    WHERE personnel_code IN ({placeholders})
                    """,
                    tuple(codes),
                )
            # 手工录入任务自动完成；表中已有任务保留原状态
            if session.get('task_source') == 'manual' and session.get('task_id'):
                cur.execute(
                    "UPDATE tasks SET status = 'completed' WHERE id = %s",
                    (session['task_id'],),
                )

        conn.commit()
    except ScanError:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise ScanError(f'结束作业失败: {e}')
    finally:
        conn.close()

    return get_scan_state(equipment_code)


# ==================== 二维码 ====================

def generate_qr_png(equipment_code: str, base_url: str) -> bytes:
    """生成设备扫码占用页二维码 PNG"""
    import qrcode

    url = f'{base_url.rstrip("/")}/scan-occupy.html?eq={equipment_code}'
    img = qrcode.make(url, box_size=8, border=2)
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    return buf.getvalue()
