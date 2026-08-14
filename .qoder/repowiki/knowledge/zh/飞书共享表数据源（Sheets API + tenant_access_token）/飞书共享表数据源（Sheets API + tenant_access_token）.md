---
kind: external_dependency
name: 飞书共享表数据源（Sheets API + tenant_access_token）
slug: feishu-open-platform
category: external_dependency
category_hints:
    - auth_protocol
    - sdk_real_api
scope:
    - '**'
source_files:
    - backend/crawlers/feishu_crawler.py
    - backend/system/credentials.py
    - backend/.env.example
---

### 飞书开放平台
- 角色：作为到货登记数据的第二来源，从飞书共享表格增量拉取工联单到货信息写入 `feishu_detail` 表。
- SDK/接口形状：直接调用 Sheets v2/v3 REST API（`/sheets/v2/spreadsheets/{spreadsheet_token}/values/{range}`），按 1000 行分批分页读取，避免 10MB 限制；列映射通过 `COLUMN_MAPPING` 将飞书列索引映射到数据库字段。
- 凭证注入：优先从 `spider_credentials` 表中 `source='feishu'` 的 `authorization` 字段读取已缓存 token，`app_id/app_secret` 可从 `spider_credentials.config_json` 或 `.env` 的 `FEISHU_APP_ID/FEISHU_APP_SECRET` 获取。
- 验证要点：飞书 API 返回 `code != 0` 时视为错误，需重试；时间渲染使用 `valueRenderOption=ToString` 与 `dateTimeRenderOption=FormattedString` 保证日期格式稳定。