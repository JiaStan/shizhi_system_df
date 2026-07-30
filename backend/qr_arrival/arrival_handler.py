from typing import Optional, Tuple
from datetime import datetime

from .crud import save_arrival_record


class ArrivalHandler:
    """现场到件信息处理器"""

    def validate_input(self, data: dict) -> Tuple[bool, str]:
        """校验现场录入信息

        Returns:
            (valid, message)
        """
        part_code = data.get("part_code")
        arrival_qty = data.get("arrival_qty")

        if not part_code or not isinstance(part_code, str):
            return False, "零件号不能为空"

        if len(part_code.strip()) < 1 or len(part_code) > 200:
            return False, "零件号长度必须在1-200之间"

        if arrival_qty is None:
            return False, "到货数量不能为空"

        try:
            qty = int(arrival_qty)
            if qty <= 0:
                return False, "到货数量必须大于0"
        except (ValueError, TypeError):
            return False, "到货数量必须是正整数"

        arrival_time = data.get("arrival_time")
        if not arrival_time:
            return False, "到货时间不能为空"

        try:
            if isinstance(arrival_time, str):
                datetime.strptime(arrival_time, "%Y-%m-%d %H:%M")
        except ValueError:
            return False, "到货时间格式不正确，应为 YYYY-MM-DD HH:mm"

        remark = data.get("remark")
        if remark and len(str(remark)) > 500:
            return False, "备注长度不能超过500字符"

        submitter = data.get("submitter")
        if submitter and len(str(submitter)) > 100:
            return False, "提交人长度不能超过100字符"

        return True, ""

    def save(
        self,
        project_id: int,
        part_code: str,
        arrival_qty: int,
        arrival_time: str,
        remark: Optional[str] = None,
        submitter: Optional[str] = None,
    ) -> int:
        """保存到件记录"""
        return save_arrival_record(
            project_id,
            part_code.strip(),
            arrival_qty,
            arrival_time,
            remark.strip() if remark else None,
            submitter.strip() if submitter else None,
        )