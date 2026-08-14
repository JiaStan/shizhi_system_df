---
kind: error_handling
name: FastAPI + NestJS 双后端错误处理体系：BusinessError 全局异常与统一响应
category: error_handling
scope:
    - '**'
source_files:
    - backend/core/exceptions.py
    - backend/main.py
    - backend/crawlers/router.py
    - backend/pbom/router.py
    - backend/projects/router.py
    - backend/critical_parts/router.py
    - backend/qr_arrival/router.py
    - backend/delivery/router.py
    - backend/logger.py
    - webui_ref/server/common/filters/exception.filter.ts
    - webui_ref/server/app.module.ts
---

## 1. 整体方案

本仓库包含两套后端实现，各自维护独立的错误处理体系：

- **spiderV5 FastAPI 后端**（`backend/`）：基于 FastAPI + Uvicorn，通过自定义 `BusinessError` 异常类 + 应用级 `@app.exception_handler` 捕获并返回 JSON 错误。
- **webui_ref NestJS 参考后端**（`webui_ref/server/`）：基于 NestJS，通过全局 `ExceptionFilter`（`GlobalExceptionFilter`）统一捕获所有未处理异常，并按业务异常、HTTP 异常、数据库异常、未知异常分类输出统一格式的 `ApiErrorResponse`。

两套系统均遵循“业务异常显式抛出、基础设施异常由全局处理器兜底”的分层思路。

## 2. 关键文件与位置

| 子系统 | 文件 | 职责 |
|---|---|---|
| FastAPI | `backend/core/exceptions.py` | 定义 `BusinessError(Exception)` 基类，携带 `message` 与 `code` |
| FastAPI | `backend/main.py` | 注册 `@app.exception_handler(BusinessError)`，将 `BusinessError` 转为 `{error: message}` JSON |
| FastAPI | 各模块 `router.py` | 在路由中抛 `BusinessError` 或 `HTTPException`，或在 `try/except Exception` 中记录日志后返回 `{success, error}` |
| NestJS | `webui_ref/server/common/filters/exception.filter.ts` | 全局 `@Catch()` 过滤器，按异常类型映射为统一响应体 |
| NestJS | `webui_ref/server/app.module.ts` | 通过 `APP_FILTER` 注入 `GlobalExceptionFilter` |
| NestJS | `webui_ref/server/common/interfaces/exception.interface.ts` | 定义 `BusinessException` 接口（含 `code`、`httpStatus`、`details`、`fieldErrors`） |
| NestJS | `webui_ref/server/common/constants/api_response_code.ts` | HTTP 状态码到业务响应码的映射表 |
| 日志 | `backend/logger.py` | 基于 `logging.handlers.RotatingFileHandler`，按模块名分文件滚动（10MB × 7 份） |

## 3. 架构与约定

### FastAPI 后端

- **业务异常模型**：`BusinessError(message: str, code: int = 400)`。子类化 `Exception`，仅承载消息与 HTTP 状态码。
- **全局转换**：`main.py` 中的 `business_error_handler` 把 `BusinessError` 转换为 `JSONResponse(status_code=exc.code, content={"error": exc.message})`。
- **使用方式**：在路由中遇到参数校验失败、资源不存在、解析失败等场景时直接 `raise BusinessError("...", 400)`；对于更细粒度的 HTTP 语义（如 404、400），也可直接抛 `fastapi.HTTPException`。
- **局部容错**：爬虫相关路由（`crawlers/router.py`）大量使用 `try/except Exception` 包裹外部调用，记录 `logger.error(...)` 后返回 `{success: False, error: str(e)}`，避免单点故障导致整个请求崩溃。
- **启动/关闭钩子**：`startup_event` / `shutdown_event` / `handle_exit` 信号处理器内用 `try/except Exception` 保护调度器与爬虫管理器停止逻辑，确保进程退出时尽量清理资源。
- **日志策略**：每个 router 通过 `get_logger('xxx.router')` 获取独立 logger，异常路径统一 `logger.exception(...)` 或 `logger.error(...)`，输出到 `logs/<name>.log`。

### NestJS 参考后端

- **全局异常过滤器**：`GlobalExceptionFilter` 在 `catch` 中区分四类异常：
  1. `BusinessException` → 使用其 `httpStatus`、`code`、`message`、`details`、`fieldErrors` 构造响应。
  2. `HttpException` → 通过 `HTTP_STATUS_TO_RESPONSE_CODE_MAP` 映射为业务码，`message`/`details` 来自 `exception.getResponse()`。
  3. PostgreSQL 错误码 `22P02`（非法文本表示）→ 降级为 `NOT_FOUND` 语义，避免 500 噪声。
  4. 其他未知异常 → `INTERNAL_SERVER_ERROR`，附带 `stack` 与 `cause`。
- **统一响应格式**：所有错误统一输出 `{ error: { code, message, details?, fieldErrors?, timestamp } }`，前端可据此统一处理。
- **注册方式**：在 `AppModule` 中以 `provide: APP_FILTER, useClass: GlobalExceptionFilter` 全局注入。

## 4. 约定与约束

- **FastAPI 侧**：
  - 业务层面的参数/数据校验失败应抛 `BusinessError`，以便被全局 handler 统一包装为 `{error}` JSON。
  - 资源不存在、权限不足等标准 HTTP 语义优先使用 `HTTPException(status_code=...)`。
  - 对第三方依赖（爬虫、调度器、LLM 等）的调用必须包裹 `try/except Exception`，记录日志后返回结构化 `{success, error}`，不得让异常冒泡至全局 handler。
  - 所有异常路径需配合 `logger` 输出，便于定位问题。
- **NestJS 侧**：
  - 业务异常需实现 `BusinessException` 接口并设置 `httpStatus`、`code`、`message`。
  - 不要手动 `response.status().json()` 绕过过滤器；让 `GlobalExceptionFilter` 统一收敛。
  - 数据库层抛出的 `22P02` 等已知错误会被识别为 `NOT_FOUND`，无需在业务层特殊处理。
- **跨端一致**：两套后端都采用“业务异常 + 全局处理器”的模式，前端可按统一结构消费错误响应。

## 5. 观察到的不一致点

- FastAPI 的 `BusinessError` 只返回 `{error: message}`，而 NestJS 的 `BusinessException` 支持 `details`、`fieldErrors` 等扩展字段，两者前端错误展示策略可能不同。
- 部分 FastAPI 路由（如 `projects/router.py`、`critical_parts/router.py`）直接使用 `HTTPException`，而另一些（如 `pbom/router.py`）改用 `BusinessError`，同一工程内风格不完全统一。
- `delivery/router.py` 的 merge 接口在找不到项目时返回 `{error: "项目不存在"}` 而非抛异常，与其他路由行为不一致。
