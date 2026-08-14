---
kind: external_dependency
name: di360 WMS 仓库到货接口
slug: di360-wms
category: external_dependency
category_hints:
    - auth_protocol
    - client_constraint
scope:
    - '**'
source_files:
    - backend/crawlers/wms_crawler.py
    - backend/system/credentials.py
    - backend/config.py
---

### di360 WMS
- 角色：到货数据的主要来源，通过其内部 Web API 拉取仓库到货明细写入 `delivery_detail` 表。
- 认证协议：HTTP JWT Token，登录端点 `https://di360.dfmc.com.cn:24664/api/auth/login`，成功后提取 `token/authorization/access_token/tokenHead` 任一字段存入 `spider_credentials.authorization`；请求时在 `Authorization` 头携带，同时附带 `Cookie` 与固定 `Host/Origin/Referer` 等浏览器反爬头。
- 查询接口：POST `QUERY_URL`（默认 `https://di360.dfmc.com.cn:24664/api/tmp/warehouse/buWhDeliveryDetailQuery/list`），请求体包含 `viewName=BU_WH_DELIVERY_DETAIL_QUERY_LISTVIEW`、`appId/companyId/orgId` 等固定标识，分页通过 `page/pageSize` 控制，每页 2000 条。
- 客户端约束：
  - 时间字段 `RECIVE_TIME` 在 di360 侧以 UTC 存储，入库需 +8 小时转为北京时间；增量同步时传给 API 的过滤值需 -8 小时转回 UTC。
  - 服务端 filter 采用嵌套括号分组结构（`relation-origin-prefix/prefix-0-0/arrPrefix-0-0` 等 key），不能简化为普通 JSON 条件。
  - 公司内网才能访问，外网连接失败时仅保存用户名密码供后续重试。
- 验证要点：`timeZone=8`、`connect=TMP`、`projectCode=TMP` 等字段必须保持与抓包一致。