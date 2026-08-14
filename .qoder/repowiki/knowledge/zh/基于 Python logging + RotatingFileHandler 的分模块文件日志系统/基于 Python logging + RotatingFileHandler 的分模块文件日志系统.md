---
kind: logging_system
name: 基于 Python logging + RotatingFileHandler 的分模块文件日志系统
category: logging_system
scope:
    - '**'
source_files:
    - backend/logger.py
    - backend/main.py
    - backend/config.py
    - backend/crawlers/feishu_crawler.py
    - backend/crawlers/wms_crawler.py
    - backend/crawlers/crawler_manager.py
    - backend/crawlers/router.py
    - backend/pbom/router.py
    - backend/scheduling/scheduler.py
    - backend/system/credentials.py
---

## 1. 使用的系统与框架

项目未引入第三方日志库（如 loguru、structlog），而是直接使用 Python 标准库 `logging`，并通过 `logging.handlers.RotatingFileHandler` 实现按大小轮转的文件输出。所有业务模块通过统一入口 `backend/logger.py` 获取 logger 实例。

## 2. 核心文件与位置

- **日志初始化**：`backend/logger.py` — 定义日志格式、轮转策略、控制台/文件双处理器，并提供 `get_logger(name)` 工厂函数。
- **应用入口**：`backend/main.py` — 启动时导入并调用 `logger.info(...)` 记录服务启动、调度器启停等生命周期事件。
- **配置来源**：`backend/config.py` 中的 `settings.DEBUG` 控制日志级别（DEBUG/INFO 切换）。
- **日志输出目录**：仓库根 `logs/` 下按模块名生成独立 `.log` 文件（如 `spider_v5.log`、`crawler.feishu.log`、`pbom.parser.log` 等）。

## 3. 架构与约定

### 3.1 命名空间隔离
每个模块通过 `get_logger('<模块名>')` 创建带层次名称的 logger 实例，例如：
- 主应用：`get_logger('spider_v5')`
- 爬虫模块：`get_logger('crawler.feishu')`、`get_logger('crawler.wms')`、`get_logger('crawler.purchase')`、`get_logger('crawler.router')`、`get_logger('crawler.manager')`
- PBOM 模块：`get_logger('pbom.detector')`、`get_logger('pbom.parser')`、`get_logger('pbom.matcher')`、`get_logger('pbom.router')`
- 其他：`get_logger('projects.router')`、`get_logger('scheduler')`、`get_logger('system.credentials')`、`get_logger('init_db')`、`get_logger('migrate_scores')`

这种命名方式使每个模块自动获得独立的 `RotatingFileHandler`，写入 `logs/<name>.log` 单文件。

### 3.2 轮转与保留策略
- 单个日志文件最大 10MB（`maxBytes=10 * 1024 * 1024`）。
- 最多保留 7 个历史备份文件（`backupCount=7`）。
- 编码为 UTF-8，确保中文日志正常输出。

### 3.3 日志格式
固定格式字符串：`'%(asctime)s [%(levelname)s] %(name)s: %(message)s'`，日期格式 `%Y-%m-%d %H:%M:%S`。每条日志包含时间戳、级别、logger 名称和消息体。

### 3.4 级别策略
- 当 `settings.DEBUG=True`（默认）时，logger 级别设为 `DEBUG`。
- 生产环境（`DEBUG=False`）自动降级为 `INFO`。
- Uvicorn 启动时显式设置 `log_level="info"`，覆盖其内置访问日志级别。

### 3.5 运行时日志缓冲（爬虫特有）
爬虫类（`FeishuCrawler`、`WMSCrawler`）在 `_log()` 方法中同时做两件事：
1. 将结构化条目（`time`、`level`、`source`、`msg`）追加到内存列表 `self._logs`，限制最多 500 条，供前端实时读取（`get_logs()`）。
2. 通过反射 `getattr(logger, level, logger.info)` 调用对应级别的底层 logger，写入文件。

## 4. 约定与约束

- **禁止直接 `import logging.getLogger`**：所有模块应通过 `from backend.logger import get_logger` 获取 logger，以保证统一的轮转、格式和级别策略。
- **每个模块一个 logger**：模块级变量 `logger = get_logger('<模块名>')`，不使用全局共享 logger 实例。
- **日志级别使用规范**：业务信息用 `info`，异常堆栈用 `exception`，可恢复问题用 `warning`，严重错误用 `error`；爬虫内部还通过 `_log("warn", ...)` 等字符串级别调用以复用内存缓冲逻辑。
- **日志文件路径固定**：全部输出到项目根 `logs/` 目录，由 `logger.py` 中的相对路径计算并自动创建。
- **无结构化 JSON 日志**：当前日志为纯文本行，未采用 JSON 序列化字段；但爬虫内存缓冲使用字典结构以便 API 返回。
- **无异步日志队列**：日志同步写入文件和 stdout，未使用异步 handler。
- **无集中式日志收集**：仅本地文件 + 控制台输出，未集成 ELK、Fluentd、CloudWatch 等外部 sink。
- **数据库层也写日志**：`backend/database.py` 通过同一 logger 记录连接失败等错误，保持全链路一致。

## 5. 已知局限

- 日志级别依赖环境变量 `DEBUG` 切换，缺少按模块精细调优的能力。
- 没有请求 ID / 追踪 ID 贯穿 HTTP 请求链路，难以关联同一请求的多条日志。
- 爬虫内存日志缓冲区（500 条）是进程内状态，重启后丢失，仅作为调试快照用途。
- 未对 `RotatingFileHandler` 的轮转进行监控或告警，磁盘满风险需人工关注。
