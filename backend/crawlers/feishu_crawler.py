# -*- coding: utf-8 -*-
"""
飞书共享表爬虫
从飞书表格获取仓库工联单到货登记数据，写入 feishu_detail 表
"""

import time
import requests
from datetime import datetime
from typing import List, Dict, Any, Optional

from backend.database import query_all, execute
from backend.system.credentials import get_feishu_token
from backend.config import settings
from backend.logger import get_logger
from backend.crawlers.base import BaseCrawler, SyncType, CrawlerStatus, CrawlerResult

logger = get_logger('crawler.feishu')

MAX_RETRIES = 3
SLEEP_SECONDS = 0.5

SPREADSHEET_TOKEN = "A5t0s2M4OhNwyUtLHkCcvpCRnZc"
SHEET_ID = "0RJlIN"

FEISHU_SHEETS_BASE_URL = f"https://open.feishu.cn/open-apis/sheets/v2/spreadsheets/{SPREADSHEET_TOKEN}/values"

DB_COLUMNS = [
    "DELIVERY_CODE", "APPLY_CODE", "PRO_CODE", "PRO_NAME",
    "MATTER_CODE", "MATTER_NAME", "ORDER_NUM", "RECIVE_NUM",
    "RECIVE_TIME", "CONTACT_NODE", "PROGRESS_TRACKING",
    "REPLY_DEADLINE", "STATE", "FROM_ORDER_CODE", "ZYS_USERNAME", "WH_NAME"
]

COLUMN_MAPPING = {
    "APPLY_CODE": 10,
    "PRO_NAME": 19,
    "MATTER_CODE": 12,
    "MATTER_NAME": 14,
    "ORDER_NUM": 15,
    "RECIVE_NUM": 16,
    "CONTACT_NODE": 8,
    "PROGRESS_TRACKING": 3,
    "REPLY_DEADLINE": 4,
    "STATE": 7,
    "FROM_ORDER_CODE": 9,
    "ZYS_USERNAME": 23,
    "WH_NAME": 25,
}

HEADER_ROW = 1
DATA_START_ROW = 2


class FeishuCrawler(BaseCrawler):
    """飞书共享表爬虫"""

    source_name = "feishu"

    def __init__(self):
        self._status = CrawlerStatus.IDLE
        self._last_result = None
        self._logs: List[Dict[str, Any]] = []
        self._progress: Dict[str, Any] = {
            "current_page": 0,
            "total_pages": 0,
            "inserted": 0,
            "processed": 0,
        }
        self._stop_requested: bool = False

    def _log(self, level: str, msg: str) -> None:
        ts = datetime.now().strftime("%H:%M:%S")
        entry = {"time": ts, "level": level, "source": "feishu", "msg": msg}
        self._logs.append(entry)
        if len(self._logs) > 500:
            self._logs = self._logs[-500:]
        log_func = getattr(logger, level, logger.info)
        log_func(msg)

    def get_logs(self) -> List[Dict[str, Any]]:
        return list(self._logs)

    def _normalize_value(self, value, col_name: str):
        """规范化单元格值"""
        if value is None:
            return ""
        v = str(value).strip()
        if not v:
            return ""

        if col_name in ("ORDER_NUM", "RECIVE_NUM"):
            try:
                return int(float(v.replace(",", "")))
            except (TypeError, ValueError):
                return 0

        if col_name == "RECIVE_TIME":
            for fmt in ["%Y-%m-%d %H:%M:%S", "%Y/%m/%d %H:%M:%S",
                        "%Y-%m-%d", "%Y/%m/%d", "%Y年%m月%d日",
                        "%m月%d日", "%m/%d"]:
                try:
                    if fmt in ["%m月%d日", "%m/%d"]:
                        v = f"2025-{v.replace('月', '-').replace('日', '')}"
                        return datetime.strptime(v, "%Y-%m-%d").strftime("%Y-%m-%d %H:%M:%S")
                    return datetime.strptime(v[:20], fmt).strftime("%Y-%m-%d %H:%M:%S")
                except ValueError:
                    continue
            return v[:19]

        return v

    def _normalize_warehouse(self, wh_name: str) -> str:
        """归一化收货仓库名称。"""
        if not wh_name:
            return wh_name

        wh_str = str(wh_name).strip()

        inner_keywords = ["内库", "5号门仓库", "珠⼭湖⼤道663号", "珠山湖大道663号"]
        for kw in inner_keywords:
            if kw in wh_str:
                return "总院试制内库"

        outer_keywords = ["外库", "军⼭街凤亭⼆路12号圣普CSP产业园", "军山街凤亭二路12号圣普CSP产业园"]
        for kw in outer_keywords:
            if kw in wh_str:
                return "总院试制外库"

        return wh_str

    def _fetch_sheet_data(self, token: str, max_rows: int = 15000) -> List[List[Any]]:
        """获取飞书表格数据（使用 v2 API，分页读取避免10MB限制）"""
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

        all_values = []
        batch_size = 1000
        start_row = 1
        consecutive_empty = 0
        max_consecutive_empty = 3

        while start_row <= max_rows and consecutive_empty < max_consecutive_empty:
            end_row = min(start_row + batch_size - 1, max_rows)
            sheet_range = f"{SHEET_ID}!A{start_row}:ZZ{end_row}"

            for attempt in range(MAX_RETRIES):
                try:
                    url = f"{FEISHU_SHEETS_BASE_URL}/{sheet_range}"
                    params = {
                        "valueRenderOption": "ToString",
                        "dateTimeRenderOption": "FormattedString"
                    }

                    resp = requests.get(url, headers=headers, params=params, timeout=60)
                    resp.raise_for_status()
                    result = resp.json()

                    if result.get("code") != 0:
                        self._log("warn", f"飞书API返回错误: {result.get('msg')}")
                        if attempt < MAX_RETRIES - 1:
                            time.sleep(2 ** attempt)
                            continue
                        return all_values

                    data = result.get("data", {})
                    value_range = data.get("valueRange", {})
                    values = value_range.get("values", [])

                    if len(all_values) == 0:
                        all_values.extend(values)
                    else:
                        all_values.extend(values[1:] if len(values) > 0 else [])

                    self._log("info", f"获取第 {start_row}-{end_row} 行，累计 {len(all_values)} 行")

                    if len(values) == 0:
                        consecutive_empty += 1
                    else:
                        consecutive_empty = 0

                    break

                except requests.exceptions.Timeout:
                    wait = 2 ** attempt
                    self._log("warn", f"请求超时，{wait}秒后重试({attempt+1}/{MAX_RETRIES})")
                    time.sleep(wait)
                except requests.exceptions.HTTPError as e:
                    self._log("error", f"获取表格数据失败: {e}")
                    if attempt < MAX_RETRIES - 1:
                        time.sleep(2 ** attempt)
                        continue
                    return all_values
                except Exception as e:
                    self._log("error", f"获取表格数据失败: {e}")
                    if attempt < MAX_RETRIES - 1:
                        time.sleep(2 ** attempt)
                        continue
                    return all_values

            start_row = end_row + 1
            time.sleep(SLEEP_SECONDS)

        return all_values

    def _get_last_sync_time(self) -> Optional[str]:
        """获取数据库中最新的 RECIVE_TIME"""
        try:
            rows = query_all(
                "SELECT MAX(RECIVE_TIME) AS max_time "
                "FROM feishu_detail "
                "WHERE RECIVE_TIME IS NOT NULL AND RECIVE_TIME != '0000-00-00 00:00:00'"
            )
            if rows and rows[0].get("max_time"):
                val = rows[0]["max_time"]
                if isinstance(val, datetime):
                    return val.strftime("%Y-%m-%d %H:%M:%S")
                return str(val)[:19]
        except Exception as e:
            self._log("warn", f"获取上次同步时间失败: {e}")
        return None

    def _insert_batch(self, records: List[Dict[str, Any]]) -> int:
        """批量插入数据"""
        if not records:
            return 0

        insert_sql = (
            "INSERT IGNORE INTO feishu_detail ("
            + ", ".join(DB_COLUMNS)
            + ") VALUES ("
            + ", ".join(["%s"] * len(DB_COLUMNS))
            + ")"
        )

        data_rows = []
        for row in records:
            item = []
            for col in DB_COLUMNS:
                v = row.get(col, "")
                item.append(self._normalize_value(v, col))
            data_rows.append(tuple(item))

        try:
            from backend.database import execute_all
            affected = execute_all(insert_sql, data_rows)
            return affected or 0
        except Exception as e:
            self._log("error", f"批量插入失败: {e}")
            return 0

    def run(self, sync_type: SyncType = SyncType.AUTO) -> CrawlerResult:
        """执行爬取"""
        start_time_epoch = time.time()
        self._status = CrawlerStatus.RUNNING
        self._logs = []
        self._progress = {"current_page": 0, "total_pages": 0, "inserted": 0, "processed": 0}

        self._log("info", "=" * 48)
        self._log("info", f"飞书爬虫开始执行, sync_type={sync_type.value}")
        self._log("info", "=" * 48)

        try:
            token = get_feishu_token()
            if not token:
                self._status = CrawlerStatus.FAILED
                self._log("error", "获取飞书Token失败，请在系统设置中配置飞书凭证")
                return CrawlerResult(
                    source=self.source_name,
                    status=CrawlerStatus.FAILED,
                    error="获取飞书Token失败，请在系统设置中配置飞书凭证",
                )

            if sync_type == SyncType.AUTO:
                has_data_row = query_all("SELECT COUNT(*) AS cnt FROM feishu_detail")
                has_data = has_data_row and has_data_row[0].get("cnt", 0) > 0
                if has_data:
                    sync_type = SyncType.INCREMENTAL
                    self._log("info", "自动模式: 数据库已有数据，切换为增量同步")
                else:
                    sync_type = SyncType.FULL
                    self._log("info", "自动模式: 数据库为空，切换为全量同步")

            if sync_type == SyncType.FULL:
                self._log("info", "全量同步模式: 清空 feishu_detail 表")
                execute("TRUNCATE TABLE feishu_detail")

            last_sync_time = None
            if sync_type == SyncType.INCREMENTAL:
                last_sync_time = self._get_last_sync_time()
                if last_sync_time:
                    self._log("info", f"增量同步模式: 只处理 RECIVE_TIME > '{last_sync_time}' 的记录")
                else:
                    self._log("info", "增量同步模式: 数据库中无有效 RECIVE_TIME，按全量处理")

            self._log("info", "正在获取飞书表格数据...")
            sheet_data = self._fetch_sheet_data(token)

            if not sheet_data or len(sheet_data) < 2:
                self._status = CrawlerStatus.SUCCESS
                message = "飞书表格无数据或仅有表头"
                self._log("info", message)
                return CrawlerResult(
                    source=self.source_name,
                    status=CrawlerStatus.SUCCESS,
                    total=0,
                    inserted=0,
                    message=message,
                )

            headers = sheet_data[HEADER_ROW]
            self._log("info", f"表头行: 第 {HEADER_ROW + 1} 行")
            self._log("info", f"表头列数: {len(headers)}")

            records = []
            filtered_count = 0
            for row_idx, row in enumerate(sheet_data[DATA_START_ROW:], start=DATA_START_ROW + 1):
                if getattr(self, "_stop_requested", False):
                    self._log("warn", f"收到停止请求，在第 {row_idx} 行提前退出（当前进度 {self._progress['inserted']} 条已入库）")
                    self._status = CrawlerStatus.CANCELLED
                    return CrawlerResult(
                        source=self.source_name,
                        status=CrawlerStatus.CANCELLED,
                        total=len(sheet_data) - DATA_START_ROW,
                        inserted=self._progress["inserted"],
                        message=f"爬虫被手动停止（在第 {row_idx} 行退出，已入库 {self._progress['inserted']} 条）",
                        error="stopped_by_user",
                    )

                record = {}
                has_data = False

                for col_name in DB_COLUMNS:
                    if col_name in COLUMN_MAPPING:
                        idx = COLUMN_MAPPING[col_name]
                        if idx < len(row):
                            record[col_name] = row[idx]
                            if row[idx]:
                                has_data = True
                        else:
                            record[col_name] = ""
                    else:
                        record[col_name] = ""

                record["DELIVERY_CODE"] = ""
                record["PRO_CODE"] = ""
                record["RECIVE_TIME"] = ""
                record["WAREHOUSE"] = ""

                if not has_data:
                    row_has_any_value = any(str(cell).strip() for cell in row)
                    if not row_has_any_value:
                        continue

                if last_sync_time and "RECIVE_TIME" in record:
                    record_time = self._normalize_value(record["RECIVE_TIME"], "RECIVE_TIME")
                    if record_time and record_time <= last_sync_time:
                        filtered_count += 1
                        continue

                record["WH_NAME"] = self._normalize_warehouse(record.get("WH_NAME", ""))

                records.append(record)

                if len(records) >= 500:
                    processed = self._insert_batch(records)
                    self._progress["inserted"] += processed
                    self._progress["processed"] += len(records)
                    self._log("info", f"已处理 {self._progress['processed']} 条，入库 {self._progress['inserted']} 条")
                    records = []

                time.sleep(0.01)

            if records:
                processed = self._insert_batch(records)
                self._progress["inserted"] += processed
                self._progress["processed"] += len(records)
                self._log("info", f"已处理 {self._progress['processed']} 条，入库 {self._progress['inserted']} 条")

            if filtered_count > 0:
                self._log("info", f"增量过滤: 跳过 {filtered_count} 条已有记录")

            cost_time = round(time.time() - start_time_epoch, 2)
            self._status = CrawlerStatus.SUCCESS
            message = (
                f"飞书爬取完成: 共 {len(sheet_data) - 1} 条, 新增入库 {self._progress['inserted']} 条, "
                f"耗时 {cost_time} 秒"
            )
            self._log("success", message)

            result = CrawlerResult(
                source=self.source_name,
                status=CrawlerStatus.SUCCESS,
                total=len(sheet_data) - 1,
                inserted=self._progress["inserted"],
                updated=0,
                message=message,
            )
            self._last_result = result
            return result

        except Exception as e:
            self._status = CrawlerStatus.FAILED
            error_msg = f"飞书爬虫异常: {str(e)}"
            self._log("error", error_msg)
            return CrawlerResult(
                source=self.source_name,
                status=CrawlerStatus.FAILED,
                error=error_msg,
            )

    def get_status(self) -> Dict[str, Any]:
        return {
            "source": self.source_name,
            "status": self._status.value,
            "progress": dict(self._progress),
            "logs": self.get_logs(),
            "last_result": self._last_result.to_dict() if self._last_result else None,
        }
