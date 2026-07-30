from backend.logger import logger

from .crud import (
    get_part_pbom_info,
    get_part_warehouse_qty,
    update_part_line_side,
    update_record_match_status,
)


class ThreeWayMatcher:
    """三端匹配器

    端1: PBOM需求清单（零件号 + 需求数量）
    端2: 仓库/工联单到货（爬虫抓取的 data）
    端3: QR码现场录入（现场人员扫码填写）

    匹配规则：
    - 三端数量一致 → matched（线边到货）
    - 部分匹配 → partial（部分到货）
    - 未匹配 → unmatched
    """

    MATCH_RESULT_MATCHED = "matched"
    MATCH_RESULT_PARTIAL = "partial"
    MATCH_RESULT_UNMATCHED = "unmatched"

    def match(self, project_id: int, part_code: str, arrival_qty: int) -> dict:
        """执行三端匹配

        Returns:
            {
                "status": "matched" | "partial" | "unmatched",
                "message": "匹配说明",
                "detail": {
                    "demand_qty": 10,
                    "warehouse_qty": 10,
                    "arrival_qty": 10,
                    "line_side_qty": 10,
                }
            }
        """
        pbom_info = get_part_pbom_info(project_id, part_code)

        if not pbom_info:
            return {
                "status": self.MATCH_RESULT_UNMATCHED,
                "message": f"零件号 {part_code} 在当前项目PBOM中不存在",
                "detail": {
                    "demand_qty": 0,
                    "warehouse_qty": 0,
                    "arrival_qty": arrival_qty,
                    "line_side_qty": 0,
                },
            }

        demand_qty = pbom_info.get("demand_quantity", 0) or 0
        warehouse_qty = get_part_warehouse_qty(project_id, part_code)

        logger.info(
            "三端匹配: part=%s, demand=%d, warehouse=%d, arrival=%d",
            part_code, demand_qty, warehouse_qty, arrival_qty,
        )

        if arrival_qty == demand_qty and arrival_qty == warehouse_qty and demand_qty > 0:
            return {
                "status": self.MATCH_RESULT_MATCHED,
                "message": f"三端数量一致({demand_qty})，线边到货确认",
                "detail": {
                    "demand_qty": demand_qty,
                    "warehouse_qty": warehouse_qty,
                    "arrival_qty": arrival_qty,
                    "line_side_qty": arrival_qty,
                },
            }

        if arrival_qty > demand_qty:
            return {
                "status": self.MATCH_RESULT_UNMATCHED,
                "message": f"录入数量({arrival_qty})超过PBOM需求数量({demand_qty})",
                "detail": {
                    "demand_qty": demand_qty,
                    "warehouse_qty": warehouse_qty,
                    "arrival_qty": arrival_qty,
                    "line_side_qty": 0,
                },
            }

        if arrival_qty < demand_qty:
            return {
                "status": self.MATCH_RESULT_PARTIAL,
                "message": f"部分到货: 录入{arrival_qty}/{demand_qty}，仓库到货{warehouse_qty}",
                "detail": {
                    "demand_qty": demand_qty,
                    "warehouse_qty": warehouse_qty,
                    "arrival_qty": arrival_qty,
                    "line_side_qty": arrival_qty,
                },
            }

        return {
            "status": self.MATCH_RESULT_UNMATCHED,
            "message": "不匹配，请检查数据",
            "detail": {
                "demand_qty": demand_qty,
                "warehouse_qty": warehouse_qty,
                "arrival_qty": arrival_qty,
                "line_side_qty": 0,
            },
        }

    def apply_match(self, project_id: int, part_code: str, record_id: int, result: dict):
        """应用匹配结果，更新数据库状态"""
        status = result["status"]
        line_side_qty = result["detail"]["line_side_qty"]

        update_part_line_side(project_id, part_code, line_side_qty, status)
        update_record_match_status(record_id, status)

        logger.info(
            "匹配结果已应用: project=%d, part=%s, status=%s, qty=%d",
            project_id, part_code, status, line_side_qty,
        )