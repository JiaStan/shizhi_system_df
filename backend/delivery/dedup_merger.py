from collections import defaultdict
from datetime import datetime, timedelta
from backend.database import query_all
from backend.logger import logger


class DedupMerger:
    """多源到货数据去重合并器

    5维匹配键: (项目号, 零件号, 数量, 时间(天级), 单据号)
    匹配规则:
    - 同一天内，同一项目号+零件号+数量+单据号 → 认为是同一条记录
    - 来源数 > 1 → 标记为多源重复
    - 同一合并键下数量不一致 → 标记为异常
    """

    def __init__(self, project_id: int, days: int = 7):
        self.project_id = project_id
        self.days = days

    def _build_merge_key(self, pro_code: str, matter_code: str, order_num: int,
                         receive_time, delivery_code: str = "") -> str:
        """构建5维合并键"""
        date_str = ""
        if receive_time:
            if isinstance(receive_time, datetime):
                date_str = receive_time.strftime("%Y%m%d")
            elif isinstance(receive_time, str):
                try:
                    date_str = datetime.strptime(receive_time[:10], "%Y-%m-%d").strftime("%Y%m%d")
                except ValueError:
                    date_str = receive_time[:10].replace("-", "")
        code = (delivery_code or "").strip()
        return f"{pro_code}|{matter_code}|{order_num}|{date_str}|{code}"

    def _fetch_raw_data(self):
        """获取原始 delivery_detail 数据"""
        start_date = (datetime.now() - timedelta(days=self.days)).strftime("%Y-%m-%d")
        sql = """
            SELECT id, PRO_CODE, MATTER_CODE, MATTER_NAME, ORDER_NUM, IN_NUM,
                   DELIVERY_CODE, RECIVE_TIME, STATE, CANT_NUM, DATA_SOURCE
            FROM delivery_detail
            WHERE RECIVE_TIME >= %s
            ORDER BY RECIVE_TIME DESC
        """
        return query_all(sql, (start_date,))

    def merge(self) -> dict:
        """执行去重合并

        Returns:
            {
                "total_raw": 原始记录数,
                "merged_count": 合并后记录数,
                "duplicate_count": 多源重复数,
                "anomaly_count": 异常记录数,
                "records": [合并后的记录列表]
            }
        """
        rows = self._fetch_raw_data()
        total_raw = len(rows)
        logger.info("去重合并: 获取 %d 条原始记录", total_raw)

        groups = defaultdict(list)
        for row in rows:
            key = self._build_merge_key(
                row.get("PRO_CODE", ""),
                row.get("MATTER_CODE", ""),
                row.get("ORDER_NUM", 0) or 0,
                row.get("RECIVE_TIME"),
                row.get("DELIVERY_CODE", ""),
            )
            groups[key].append(row)

        merged = []
        duplicate_count = 0
        anomaly_count = 0

        for key, group in groups.items():
            parts = key.split("|")
            pro_code = parts[0]
            matter_code = parts[1]
            order_num = int(parts[2]) if parts[2] else 0
            date_str = parts[3] if len(parts) > 3 else ""

            sources = []
            in_nums = set()
            for r in group:
                src = r.get("DATA_SOURCE", "unknown")
                if src and src not in sources:
                    sources.append(src)
                in_nums.add(r.get("IN_NUM", 0) or 0)

            is_duplicate = len(sources) > 1
            is_anomaly = len(in_nums) > 1

            if is_duplicate:
                duplicate_count += 1
            if is_anomaly:
                anomaly_count += 1

            first = group[0]
            merged.append({
                "merge_key": key,
                "pro_code": first.get("PRO_CODE", ""),
                "matter_code": first.get("MATTER_CODE", ""),
                "matter_name": first.get("MATTER_NAME", ""),
                "order_num": order_num,
                "in_num": first.get("IN_NUM", 0) or 0,
                "receive_time": first.get("RECIVE_TIME"),
                "sources": sources,
                "source_count": len(sources),
                "is_duplicate": is_duplicate,
                "is_anomaly": is_anomaly,
            })

        logger.info(
            "合并完成: 原始=%d, 合并=%d, 重复=%d, 异常=%d",
            total_raw, len(merged), duplicate_count, anomaly_count,
        )

        return {
            "total_raw": total_raw,
            "merged_count": len(merged),
            "duplicate_count": duplicate_count,
            "anomaly_count": anomaly_count,
            "records": merged,
        }