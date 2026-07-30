# -*- coding: utf-8 -*-
"""
WMS 仓库爬虫
从 spiderV4 spider_main.py 改造而来，核心逻辑保持一致

关键设计：
- 增量同步：通过 API 的 filter 字段（嵌套括号结构）向服务端传入
  RECIVE_TIME > last_time，由服务端直接返回时间范围内的新数据
- 全量同步：清空表后拉取全量数据
- 连接复用：requests.Session + 数据库连接在任务内复用
- 重试机制：网络超时自动指数退避重试
- 日志共享：使用全局 log_buffer 供前端/manager 读取
"""

import time
import requests
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

from backend.database import query_all, execute
from backend.config import settings
from backend.logger import get_logger
from backend.crawlers.base import BaseCrawler, SyncType, CrawlerStatus, CrawlerResult

logger = get_logger('crawler.wms')

# 常量
PAGE_SIZE = 2000
SLEEP_SECONDS = 0.3
MAX_RETRIES = 3
# 注意：数据库和 di360 API 都使用北京时间（UTC+8），
# 不再做时区加减，直接比较即可。

# 入库字段顺序（与 delivery_detail 表字段一致）
DB_COLUMNS = [
    "DELIVERY_CODE", "APPLY_CODE", "PRO_CODE", "PRO_NAME",
    "MATTER_CODE", "MATTER_NAME", "STYLIST_USERNAME", "ZYS_USERNAME",
    "STATE", "FROM_ORDER_CODE",
    "ORDER_NUM", "SEND_NUM", "RECIVE_NUM", "IN_NUM", "CANT_NUM",
    "SEND_WH_NAME", "WH_NAME", "RECIVE_USERNAME", "RECIVE_TIME"
]


class WMSCrawler(BaseCrawler):
    """di360 WMS 仓库爬虫"""

    source_name = "wms"

    def __init__(self):
        self._status = CrawlerStatus.IDLE
        self._last_result = None
        # 运行日志：供 manager 与前端实时读取（每个 entry = 一行）
        self._logs: List[Dict[str, Any]] = []
        self._progress: Dict[str, Any] = {
            "current_page": 0,
            "total_pages": 0,
            "inserted": 0,
            "processed": 0,
        }
        # 停止标志：manager 设置 True 后，循环会在下一次检查时退出
        self._stop_requested: bool = False

    # ---------- 凭证 ----------
    def _get_credentials(self) -> Dict[str, Any]:
        """从数据库获取凭证（兼容 V4 和 V5 格式）"""
        row = query_all(
            "SELECT authorization, cookie, username, password "
            "FROM spider_credentials WHERE source = 'wms' AND is_active = 1 LIMIT 1"
        )
        if not row:
            return {}
        first = row[0] or {}
        return {
            "authorization": first.get("authorization", ""),
            "cookie": first.get("cookie", ""),
            "username": first.get("username", ""),
            "password": first.get("password", ""),
        }

    def _login(self, session: requests.Session) -> bool:
        """初始化 session 请求头，使用数据库中保存的 token"""
        creds = self._get_credentials()
        auth = creds.get("authorization", "")
        if not auth:
            self._log("warn", "凭证无效（缺少 Authorization），请在系统设置中配置")
            return False
        session.headers.update({
            "Accept": "application/json, text/plain, */*",
            "Accept-Encoding": "gzip, deflate, br, zstd",
            "Accept-Language": "zh-CN,zh;q=0.9",
            "Authorization": auth,
            "Connection": "keep-alive",
            "Content-Type": "application/json;charset=UTF-8",
            "Host": "di360.dfmc.com.cn:24664",
            "Origin": "https://di360.dfmc.com.cn:24664/home",
            "Referer": "https://di360.dfmc.com.cn:24664/home",
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-origin",
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36 UOS",
        })
        if creds.get("cookie"):
            session.headers["Cookie"] = creds["cookie"]
        session.verify = False
        try:
            requests.packages.urllib3.disable_warnings()
        except Exception:
            pass
        return True

    # ---------- 日志（供前端读取） ----------
    def _log(self, level: str, msg: str) -> None:
        ts = datetime.now().strftime("%H:%M:%S")
        entry = {"time": ts, "level": level, "source": "wms", "msg": msg}
        self._logs.append(entry)
        # 限制缓冲区最多 500 行，避免无限增长
        if len(self._logs) > 500:
            self._logs = self._logs[-500:]
        # 同时写到文件日志
        log_func = getattr(logger, level, logger.info)
        log_func(msg)

    def get_logs(self) -> List[Dict[str, Any]]:
        """读取当前运行日志快照"""
        return list(self._logs)

    # ---------- 服务端过滤参数构建 ----------
    def _build_time_filter(self, start_time_str: Optional[str]) -> List[Dict[str, Any]]:
        """根据抓包结构构建时间过滤 filter 数组。

        传入的 start_time_str 必须是**UTC 时间字符串**（di360 API 按 UTC 存储和比较）
        由 _filter_time_from_db 负责把数据库的北京时间 -8h 后转换
        格式：嵌套括号分组 + RECIVE_TIME > start_time_str 条件节点
        """
        if not start_time_str:
            return []
        return [
            {"field": "", "value": "", "operation": "(", "andOrFlag": "AND", "key": "relation-origin-prefix"},
            {"field": "", "value": "", "operation": "(", "andOrFlag": "", "key": "prefix-0-0", "onlyRead": "false"},
            {"field": "", "value": "", "operation": "(", "andOrFlag": "AND", "key": "arrPrefix-0-0"},
            {
                "field": "RECIVE_TIME",
                "value": start_time_str,
                "operation": ">",  # 严格大于，避免重复插入最后一条
                "andOrFlag": "AND",
                "key": "RECIVE_TIME-0-0-0",
                "onlyRead": "false",
            },
            {"field": "", "value": "", "operation": ")", "andOrFlag": "AND", "key": "arrSuffix-0-0"},
            {"field": "", "value": "", "operation": ")", "andOrFlag": "", "key": "suffix-0-0", "onlyRead": "false"},
            {"field": "", "value": "", "operation": ")", "andOrFlag": "AND", "key": "relation-origin-suffix"},
        ]

    def _build_request_body(self, page: int, page_size: int, start_time_str: Optional[str]) -> Dict[str, Any]:
        """构建请求体（带时间过滤）——与参考脚本保持一致
        start_time_str 必须是 UTC 时间字符串（di360 按 UTC 存储）
        """
        body = {
            "page": page,
            "pageSize": page_size,
            "viewName": "BU_WH_DELIVERY_DETAIL_QUERY_LISTVIEW",
            "lang": "zhs",
            "connect": "TMP",
            "appId": "P_SYS_APPLICATION_fb58d48cbfc84d898ae5a1dacc7967f7",
            "companyId": "P_SYS_COMPANY_155f6a331e804b69a6fc47e6273699fc",
            "filter": self._build_time_filter(start_time_str),
            "navKey": "buWmDeliveryDetailQuery:list",
            "objectType": "",
            "orgId": "P_SYS_ORG_000000",
            "pageNo": page,
            "projectCode": "TMP",
            "purview": "all",
            "ruleValue": False,
            "timeZone": "8",
            "userDept": "P_SYS_DEPT_37210",
            "userGroup": "P_SYS_ORG_000000",
        }
        return body

    def _fetch_page(self, session: requests.Session, page: int, page_size: int,
                    start_time_str: Optional[str], max_retries: int = MAX_RETRIES):
        """请求一页数据，带指数退避重试。返回 (records_list, total_count)"""
        body = self._build_request_body(page, page_size, start_time_str)
        for attempt in range(max_retries):
            try:
                res = session.post(
                    settings.QUERY_URL,
                    json=body,
                    timeout=(30, 120),
                )
                res.raise_for_status()
                res_json = res.json()
                if res_json.get("code") == 200 or res_json.get("success"):
                    data = res_json.get("data", {}) or {}
                    records = data.get("records", []) or []
                    total = data.get("total", 0) or 0
                    return list(records), int(total)
                else:
                    self._log("warn", f"接口返回异常: {res_json.get('msg', '未知')}")
                    return [], 0
            except requests.exceptions.Timeout:
                wait = 2 ** attempt
                self._log("warn", f"请求超时，{wait}秒后重试({attempt+1}/{max_retries})")
                time.sleep(wait)
            except requests.exceptions.ConnectionError as e:
                wait = 2 ** attempt
                self._log("warn", f"连接失败，{wait}秒后重试: {e}")
                time.sleep(wait)
            except Exception as e:
                self._log("error", f"请求异常: {e}")
                return [], 0
        self._log("error", f"{max_retries} 次重试全部失败")
        return [], 0

    # ---------- 数据库操作 ----------
    def _get_last_sync_time(self) -> Optional[datetime]:
        """获取数据库中最新的 RECIVE_TIME"""
        try:
            rows = query_all(
                "SELECT MAX(RECIVE_TIME) AS max_time "
                "FROM delivery_detail "
                "WHERE RECIVE_TIME IS NOT NULL AND RECIVE_TIME != '0000-00-00 00:00:00'"
            )
            if rows and rows[0].get("max_time"):
                val = rows[0]["max_time"]
                if isinstance(val, datetime):
                    return val
                # datetime 字符串
                try:
                    return datetime.strptime(str(val)[:19], "%Y-%m-%d %H:%M:%S")
                except Exception:
                    return None
        except Exception as e:
            self._log("warn", f"获取上次同步时间失败: {e}")
        return None

    def _normalize_recive_time(self, val) -> str:
        """di360 API 返回的 RECIVE_TIME 是 UTC 时间，
        数据库存北京时间（UTC+8），所以需要 +8 小时。
        例如：API 返回 2026-07-02 09:42:19 (UTC)
              → 数据库存 2026-07-02 17:42:19 (北京时间)
        """
        if val is None:
            return ""
        try:
            if isinstance(val, datetime):
                return (val + timedelta(hours=8)).strftime("%Y-%m-%d %H:%M:%S")
            s = str(val).strip().replace("T", " ")[:19]
            if not s:
                return ""
            try:
                dt = datetime.strptime(s, "%Y-%m-%d %H:%M:%S")
            except ValueError:
                dt = datetime.fromisoformat(s.replace(" ", "T"))
            return (dt + timedelta(hours=8)).strftime("%Y-%m-%d %H:%M:%S")
        except Exception:
            s = str(val).strip().replace("T", " ")[:19]
            return s

    def _filter_time_from_db(self, db_time: datetime) -> str:
        """数据库存的是北京时间（UTC+8），向 di360 API 传过滤条件时
        需要转回 UTC（-8 小时），因为 di360 按 UTC 存储和比较时间。
        例如：数据库最新 2026-07-02 17:42:19 (北京时间)
              → 传给 API 的过滤值 2026-07-02 09:42:19 (UTC)
        """
        if not db_time:
            return ""
        try:
            return (db_time - timedelta(hours=8)).strftime("%Y-%m-%d %H:%M:%S")
        except Exception:
            return str(db_time)[:19]

    def _insert_batch(self, records: List[Dict[str, Any]]) -> int:
        """批量插入（使用 executemany + INSERT IGNORE 自动去重）"""
        if not records:
            return 0

        insert_sql = (
            "INSERT IGNORE INTO delivery_detail ("
            + ", ".join(DB_COLUMNS)
            + ") VALUES ("
            + ", ".join(["%s"] * len(DB_COLUMNS))
            + ")"
        )

        data_rows = []
        for row in records:
            item = []
            for col in DB_COLUMNS:
                if col == "RECIVE_TIME":
                    item.append(self._normalize_recive_time(row.get(col, "")))
                elif col in ("ORDER_NUM", "SEND_NUM", "RECIVE_NUM", "IN_NUM", "CANT_NUM"):
                    v = row.get(col, 0)
                    try:
                        item.append(int(v) if v is not None and v != "" else 0)
                    except (TypeError, ValueError):
                        item.append(0)
                else:
                    v = row.get(col, "")
                    item.append("" if v is None else str(v))
            data_rows.append(tuple(item))

        try:
            # 使用 execute_all 封装（它底层走 connection + executemany + commit）
            from backend.database import execute_all
            affected = execute_all(insert_sql, data_rows)
            return affected or 0
        except Exception as e:
            self._log("error", f"批量插入失败: {e}")
            return 0

    # ---------- 主流程 ----------
    def run(self, sync_type: SyncType = SyncType.AUTO) -> CrawlerResult:
        """执行爬取

        逻辑：
        1. 判模式 → 全量先 TRUNCATE，增量读取 MAX(RECIVE_TIME)
        2. 构造 filter 数组传入 API（= 服务端直接返回新数据）
        3. 从 page=1 开始循环，直到 total_pages 或 records 为空
        4. 每页批量插入（INSERT IGNORE 自动去重）
        5. 写入共享日志，供前端 /crawlers/status 读取
        """
        start_time_epoch = time.time()
        self._status = CrawlerStatus.RUNNING
        self._logs = []  # 清空上次日志
        self._progress = {"current_page": 0, "total_pages": 0, "inserted": 0, "processed": 0}

        self._log("info", "=" * 48)
        self._log("info", f"WMS 爬虫开始执行, sync_type={sync_type.value}")
        self._log("info", "=" * 48)

        try:
            # 自动识别同步模式
            if sync_type == SyncType.AUTO:
                has_data_row = query_all("SELECT COUNT(*) AS cnt FROM delivery_detail")
                has_data = has_data_row and has_data_row[0].get("cnt", 0) > 0
                if has_data:
                    sync_type = SyncType.INCREMENTAL
                    self._log("info", "自动模式: 数据库已有数据，切换为增量同步")
                else:
                    sync_type = SyncType.FULL
                    self._log("info", "自动模式: 数据库为空，切换为全量同步")

            # 全量同步先清空
            if sync_type == SyncType.FULL:
                self._log("info", "全量同步模式: 清空 delivery_detail 表")
                execute("TRUNCATE TABLE delivery_detail")

            # 取上次同步时间（增量条件）
            # 数据库和 di360 API 都使用北京时间（UTC+8），直接比较即可
            last_sync = None
            filter_time_str = None
            if sync_type == SyncType.INCREMENTAL:
                last_sync = self._get_last_sync_time()
                if last_sync:
                    filter_time_str = self._filter_time_from_db(last_sync)
                    self._log(
                        "info",
                        f"增量条件: RECIVE_TIME > '{filter_time_str}' "
                        f"(DB 与 di360 都使用北京时间，无需转换)"
                    )
                else:
                    self._log("info", "数据库中无有效 RECIVE_TIME，按全量拉取")

            # 登录 / 初始化请求头
            session = requests.Session()
            if not self._login(session):
                self._status = CrawlerStatus.FAILED
                self._log("error", "凭证无效，请在系统设置中配置 WMS 凭证")
                return CrawlerResult(
                    source=self.source_name,
                    status=CrawlerStatus.FAILED,
                    error="凭证无效，请在系统设置中配置 WMS 凭证",
                )

            # 先测试第 1 页拿 total
            first_records, total_count = self._fetch_page(session, 1, PAGE_SIZE, filter_time_str)
            total_pages = (total_count + PAGE_SIZE - 1) // PAGE_SIZE if total_count > 0 else 1
            self._progress["total_pages"] = total_pages
            self._log(
                "info",
                f"API 总记录: {total_count}, 共 {total_pages} 页"
            )

            total_inserted = 0
            fail_pages = []

            # 先处理第 1 页（已请求过，不再重复请求）
            if first_records:
                processed = self._insert_batch(first_records)
                total_inserted += processed
                self._progress["current_page"] = 1
                self._progress["inserted"] = total_inserted
                self._progress["processed"] += len(first_records)
                self._log(
                    "info",
                    f"第 1/{total_pages} 页: 获取 {len(first_records)} 条, 入库 {processed} 条"
                )
            time.sleep(SLEEP_SECONDS)

            # 第 2 页开始循环
            for page in range(2, total_pages + 1):
                # —— 停止检查（优先检查 manager 的全局标志，其次自己的）——
                if getattr(self, "_stop_requested", False):
                    self._log("warn", f"收到停止请求，在第 {page} 页提前退出（当前进度 {total_inserted} 条已入库）")
                    self._status = CrawlerStatus.CANCELLED
                    return CrawlerResult(
                        source=self.source_name,
                        status=CrawlerStatus.CANCELLED,
                        total=total_count,
                        inserted=total_inserted,
                        message=f"爬虫被手动停止（在第 {page}/{total_pages} 页退出，已入库 {total_inserted} 条）",
                        error="stopped_by_user",
                    )
                records, _ = self._fetch_page(session, page, PAGE_SIZE, filter_time_str)
                self._progress["current_page"] = page

                if not records:
                    self._log("info", f"第 {page}/{total_pages} 页: 无数据，跳过")
                    time.sleep(SLEEP_SECONDS)
                    continue

                processed = self._insert_batch(records)
                total_inserted += processed
                self._progress["inserted"] = total_inserted
                self._progress["processed"] += len(records)

                self._log(
                    "info",
                    f"第 {page}/{total_pages} 页: 获取 {len(records)} 条, 入库 {processed} 条"
                )
                time.sleep(SLEEP_SECONDS)

            # 重试失败页（简单实现：若某页 records=[] 且 < total_pages，视为可能失败；这里不做复杂重试）

            cost_time = round(time.time() - start_time_epoch, 2)
            self._status = CrawlerStatus.SUCCESS
            message = (
                f"WMS 爬取完成: 共 {total_count} 条, 新增入库 {total_inserted} 条, "
                f"耗时 {cost_time} 秒"
            )
            if last_sync and filter_time_str:
                message += (
                    f"（DB 时间 {last_sync.strftime('%H:%M:%S')} → di360 时间 {filter_time_str.split(' ')[1] if ' ' in filter_time_str else filter_time_str}）"
                )
            self._log("success", message)

            result = CrawlerResult(
                source=self.source_name,
                status=CrawlerStatus.SUCCESS,
                total=total_count,
                inserted=total_inserted,
                updated=0,
                message=message,
            )
            self._last_result = result
            return result

        except Exception as e:
            self._status = CrawlerStatus.FAILED
            error_msg = f"WMS 爬虫异常: {str(e)}"
            self._log("error", error_msg)
            return CrawlerResult(
                source=self.source_name,
                status=CrawlerStatus.FAILED,
                error=error_msg,
            )

    def get_status(self) -> Dict[str, Any]:
        """爬虫状态快照（含运行日志，供前端读取）"""
        return {
            "source": self.source_name,
            "status": self._status.value,
            "progress": dict(self._progress),
            "logs": self.get_logs(),
            "last_result": self._last_result.to_dict() if self._last_result else None,
        }