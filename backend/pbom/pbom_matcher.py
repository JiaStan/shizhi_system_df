# -*- coding: utf-8 -*-
"""
PBOM 匹配器
将 PBOM 零件与爬取的到货数据按零件号匹配
汇总已入库数量，更新统计
"""

from collections import defaultdict
from typing import Dict
from backend.logger import get_logger
from backend.database import execute, query_one, query_all
from backend.pbom import crud
from backend.projects.crud import get_project_stats

logger = get_logger('pbom.matcher')


class PBOMMatcher:
    """PBOM 匹配器"""

    def match_project(self, project_id: int) -> Dict:
        """执行匹配，WMS优先，未匹配到的零件再从飞书共享表匹配"""
        logger.info(f"开始匹配项目 {project_id}")

        # 获取项目信息（项目号、试制单号）
        project = query_one(
            "SELECT id, project_code, apply_code, name FROM projects WHERE id = %s",
            (project_id,),
        )
        if not project:
            return {"error": "项目不存在", "parts_matched": 0}

        # 获取 PBOM 零件
        parts = crud.get_project_parts(project_id)

        if len(parts) == 0:
            return {
                "error": "项目没有 PBOM 零件数据，请先解析上传 PBOM",
                "parts_matched": 0,
            }

        # ========== 第1步：从 delivery_detail (WMS) 匹配 ==========
        pro_code = project.get("project_code", "")
        apply_code = project.get("apply_code", "")
        apply_code2 = project.get("apply_code2", "")

        # 收集所有有效的试制申请号
        apply_codes = []
        if apply_code and apply_code.strip():
            apply_codes.append(apply_code.strip())
        if apply_code2 and apply_code2.strip():
            apply_codes.append(apply_code2.strip())

        conditions = []
        params = []

        if pro_code and pro_code.strip():
            conditions.append("TRIM(PRO_CODE) = %s")
            params.append(pro_code.strip())
        else:
            conditions.append("(PRO_CODE IS NULL OR TRIM(COALESCE(PRO_CODE, '')) = '')")

        if apply_codes:
            placeholders = ", ".join(["%s"] * len(apply_codes))
            conditions.append(f"TRIM(APPLY_CODE) IN ({placeholders})")
            params.extend(apply_codes)
        else:
            conditions.append("(APPLY_CODE IS NULL OR TRIM(COALESCE(APPLY_CODE, '')) = '')")

        where_sql = " AND ".join(conditions)
        deliveries = query_all(
            "SELECT MATTER_CODE, IN_NUM, STATE, ZYS_USERNAME, WH_NAME, RECIVE_TIME FROM delivery_detail WHERE " + where_sql,
            params,
        )

        if len(deliveries) == 0:
            logger.warning(
                f"项目 {project_id} (PRO_CODE={pro_code}, 申请号={apply_codes}) WMS 无到货数据"
            )

        wms_received: Dict[str, int] = defaultdict(int)
        wms_info: Dict[str, Dict] = {}
        
        for d in deliveries:
            part_code = str(d.get("MATTER_CODE", "") or "").strip()
            in_qty = d.get("IN_NUM", 0) or 0
            if part_code:
                if in_qty:
                    wms_received[part_code] += int(in_qty)
                
                if part_code not in wms_info:
                    wms_info[part_code] = {
                        "state": d.get("STATE"),
                        "professional": d.get("ZYS_USERNAME"),
                        "warehouse": d.get("WH_NAME"),
                        "recive_time": d.get("RECIVE_TIME"),
                    }
                else:
                    if d.get("RECIVE_TIME") and d.get("RECIVE_TIME") > wms_info[part_code].get("recive_time", ""):
                        wms_info[part_code] = {
                            "state": d.get("STATE"),
                            "professional": d.get("ZYS_USERNAME"),
                            "warehouse": d.get("WH_NAME"),
                            "recive_time": d.get("RECIVE_TIME"),
                        }

        # ========== 第2步：WMS未匹配到的零件，从 feishu_detail 按试制单号匹配 ==========
        feishu_records = []
        if apply_codes:
            placeholders = ", ".join(["%s"] * len(apply_codes))
            feishu_records = query_all(
                f"SELECT MATTER_CODE, RECIVE_NUM, ORDER_NUM, STATE, ZYS_USERNAME, WH_NAME, "
                f"PROGRESS_TRACKING, PRO_NAME "
                f"FROM feishu_detail "
                f"WHERE TRIM(APPLY_CODE) IN ({placeholders})",
                apply_codes,
            )
            if len(feishu_records) == 0:
                logger.info(f"飞书按试制单号 '{apply_codes}' 未匹配到记录")

        feishu_by_part: Dict[str, list] = defaultdict(list)
        for f in feishu_records:
            part_code = str(f.get("MATTER_CODE", "") or "").strip()
            if part_code:
                feishu_by_part[part_code].append(f)

        # ========== 第3步：逐零件更新 project_parts ==========
        matched_count = 0
        total_demand = 0
        total_received = 0
        missing_parts = 0
        feishu_matched_count = 0

        for part in parts:
            part_code = part["part_code"]
            demand = part["demand_quantity"]
            info = {}

            # WMS 匹配
            wms_qty = wms_received.get(part_code, 0)
            wms_part_info = wms_info.get(part_code, {})

            if wms_qty > 0:
                # WMS 匹配到，以 WMS 为准
                received = wms_qty
                info = wms_part_info
                source = "wms"
                shortage_note = None
            elif wms_part_info:
                # WMS 有状态信息但未入库，使用 WMS 状态
                received = 0
                info = wms_part_info
                source = "wms"
                shortage_note = None
            else:
                # WMS 未匹配到，尝试飞书
                feishu_rows = feishu_by_part.get(part_code, [])
                feishu_qty = 0
                feishu_tracking = None
                feishu_state = None
                feishu_professional = None
                feishu_warehouse = None

                for fr in feishu_rows:
                    recive_num = fr.get("RECIVE_NUM", 0) or 0
                    feishu_qty += int(recive_num)
                    if fr.get("PROGRESS_TRACKING"):
                        feishu_tracking = fr.get("PROGRESS_TRACKING")
                    if fr.get("STATE"):
                        feishu_state = fr.get("STATE")
                    if fr.get("ZYS_USERNAME"):
                        feishu_professional = fr.get("ZYS_USERNAME")
                    if fr.get("WH_NAME"):
                        feishu_warehouse = fr.get("WH_NAME")

                if feishu_qty > 0:
                    received = feishu_qty
                    source = "feishu"
                    shortage_note = feishu_tracking
                    info = {
                        "state": feishu_state,
                        "professional": feishu_professional,
                        "warehouse": feishu_warehouse,
                    }
                    feishu_matched_count += 1
                else:
                    received = 0
                    source = None
                    shortage_note = None

            total_demand += demand
            total_received += received

            execute(
                "UPDATE project_parts SET "
                "received_quantity = %s, doc_state = %s, professional = %s, warehouse = %s, "
                "source = %s, shortage_note = %s "
                "WHERE project_id = %s AND part_code = %s",
                (
                    received,
                    info.get("state"),
                    info.get("professional"),
                    info.get("warehouse"),
                    source,
                    shortage_note,
                    project_id,
                    part_code,
                ),
            )

            if received > 0:
                matched_count += 1
            if received < demand:
                missing_parts += 1

        # 更新项目统计
        get_project_stats(project_id)

        delivery_rate = round(matched_count / len(parts) * 100, 2) if len(parts) > 0 else 0

        execute(
            "UPDATE projects SET delivery_rate = %s WHERE id = %s",
            (delivery_rate, project_id),
        )

        logger.info(
            f"匹配完成: 总零件{len(parts)}, WMS匹配{matched_count - feishu_matched_count}, "
            f"飞书匹配{feishu_matched_count}, 到货率{delivery_rate}%, 缺料{missing_parts}"
        )

        return {
            "project_id": project_id,
            "parts_total": len(parts),
            "parts_matched": matched_count,
            "feishu_matched": feishu_matched_count,
            "delivery_rate": delivery_rate,
            "total_demand": total_demand,
            "total_received": total_received,
            "missing_parts": missing_parts,
        }