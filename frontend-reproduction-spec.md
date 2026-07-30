# spiderV5 — PBOM 智能装配系统 前端设计文档

> 本文档完整描述当前系统的前端页面结构、设计规范、功能逻辑与数据模型，与 `index.html` 保持同步。

---

## 一、产品概述

| 维度 | 说明 |
|------|------|
| **产品类型** | 工业制造 Web 管理平台 |
| **目标用户** | 整车试制技术室工艺主管、物料管理员、专业师 |
| **核心价值** | 基于 PBOM 智能解析与多源到货数据融合，实现零件到货预判、关键件风险识别与装车计划 AI 推荐（BFWS · CP-SAT） |
| **界面语言** | 中文 |
| **导航模式** | 左侧可收折 Sidebar（手风琴二级展开）+ 顶部面包屑 + 二级 Tab 页签 |
| **设计风格** | 淡蓝色 + 灰白色简洁干练风格，小圆角，扁平化 |

---

## 二、设计规范（淡蓝色 + 灰白色）

### 2.1 配色体系

| 角色 | CSS 变量 | 色值 | 用途 |
|------|----------|------|------|
| 页面底色 | `--bg` | `#f5f7fa` | 全局页面背景 |
| 卡片面 | `--surface` | `#ffffff` | 白色内容卡片 |
| 柔和底色 | `--surface-soft` | `#eef3f8` | 浅色区块背景 |
| 主文字 | `--text` | `#1e293b` | 标题与关键数值 |
| 辅助文字 | `--muted` | `#64748b` | 描述文案、次要标签 |
| 强调色 | `--accent` | `#3b82f6` | 按钮、激活态、链接 |
| 强调色柔和 | `--accent-soft` | `#dbeafe` | 选中态背景 |
| 边框 | `--border` | `#e2e8f0` | 卡片描边 |
| 柔和边框 | `--border-soft` | `#f1f5f9` | 轻描边 |

**语义状态色**：

| 状态 | CSS 变量 | 色值 | 用途 |
|------|----------|------|------|
| 安全/正常 | `--emerald` | `#22c55e` | 到货率 ≥90%、已入库 |
| 柔和绿 | `--emerald-soft` | `#dcfce7` | 绿色背景 |
| 预警 | `--amber` | `#f59e0b` | 到货率 70-90%、部分入库 |
| 柔和黄 | `--amber-soft` | `#fef3c7` | 黄色背景 |
| 危险 | `--rose` | `#ef4444` | 到货率 <70%、不合格 |
| 柔和红 | `--rose-soft` | `#fee2e2` | 红色背景 |
| 信息 | `--sky` | `#0ea5e9` | 信息提示 |
| 柔和天蓝 | `--sky-soft` | `#e0f2fe` | 天蓝背景 |
| 靛蓝 | `--indigo` | `#3b82f6` | 图表辅助色 |

### 2.2 字体排版

| 用途 | 字体栈 |
|------|--------|
| 全局 | `Inter, 'PingFang SC', 'Microsoft YaHei', sans-serif` |
| 数据/编码 | `'SF Mono', Consolas, monospace`（class: `.mono`） |

**排版层级**：

| 层级 | 字号 | 字重 | 用途 |
|------|------|------|------|
| 页面主标题 | 16px | 700 | `h2` 页面顶部标题 |
| 区块标题 | 13px | 700 | 卡片标题 `.card-title` |
| 正文 | 13px | 400 | 全局 `body` |
| 辅助说明 | 11px | 400 | 时间戳、标签 `.card-sub` |
| KPI 大数字 | 28px | 700 | 统计卡片 `.kpi-value` |
| 数据值 | 12px | 400 | 等宽字体 `.mono` |

### 2.3 圆角系统

| 类型 | CSS 变量 | 值 | 用途 |
|------|----------|-----|------|
| 小圆角 | `--radius-sm` | 4px | 按钮、标签、输入框 |
| 标准圆角 | `--radius` | 8px | 卡片、面板 |
| 大圆角 | `--radius-lg` | 12px | 特殊容器 |

### 2.4 间距系统

| 层级 | 值 | 用途 |
|------|-----|------|
| 内容区最大宽度 | 1400px | 主容器 `.nav-inner` / `.crumb-inner` |
| 页面内边距 | `1.5rem` | 主内容区域 `main` |
| 卡片间距 | `1rem` | 网格 `gap` |
| 卡片内边距 | `1.25rem` | 标准卡片 `.card` |

### 2.5 阴影系统

- 标准卡片：无阴影，`border: 1px solid var(--border)`
- 悬停态：`box-shadow: 0 1px 3px rgba(0,0,0,0.06)` + `border-color: var(--accent)`

### 2.6 组件规范

**按钮**：
- 主按钮 `.btn-primary`：`background: var(--accent); color: white; border-radius: var(--radius-sm);`（蓝底白字）
- 次按钮 `.btn-outline`：`background: var(--surface); border: 1px solid var(--border); color: var(--text); border-radius: var(--radius-sm);`
- 字体：13px，font-weight: 600，padding: 0.5rem 0.9rem

**卡片**：
- 标准卡片 `.card`：`background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 1.25rem;`
- 卡片头 `.card-header`：底部 1px 分隔线，包含 `.card-title`（13px 700）和 `.card-sub`（11px muted）
- 悬停反馈：`box-shadow` + `border-color: var(--accent)`

**状态徽章 `.badge`**：
- 基础：`font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: var(--radius-sm);`
- 安全 `.badge-emerald`：`background: var(--emerald-soft); color: var(--emerald);`
- 预警 `.badge-amber`：`background: var(--amber-soft); color: var(--amber);`
- 危险 `.badge-rose`：`background: var(--rose-soft); color: var(--rose);`
- 信息 `.badge-indigo`：`background: var(--accent-soft); color: var(--accent);`
- 灰 `.badge-muted`：`background: var(--border-soft); color: var(--muted);`

**数据表格**：
- 容器 `.table-wrap`：`overflow-x: auto;`
- 表头：11px，font-weight: 600，color: var(--muted)，uppercase，底部 2px solid var(--border)
- 单元格：padding: 0.65rem 0.75rem，font-size: 12px
- 行悬停：`background: var(--border-soft);`

**输入框 `.input`**：
- `background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 12px; padding: 0.45rem 0.7rem;`

**KPI 卡片 `.kpi`**：
- `background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 1.25rem;`
- `.kpi-label`：11px，font-weight: 600，color: var(--muted)
- `.kpi-value`：28px，font-weight: 700
- `.kpi-foot`：11px，color: var(--muted)

**面包屑**：
- 容器 `.crumb-bar`：`background: var(--surface); border-bottom: 1px solid var(--border);`
- 已访问：color: var(--muted)，可点击
- 分隔符：`›`，color: var(--border)
- 当前页：font-weight: 600，color: var(--text)

---

## 三、全局布局结构

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ┌──────────┐  ┌──────────────────────────────────────────────────────┐│
│  │  Sidebar │  │ 面包屑路径                                  二级Tab  ││
│  │  (可收折) │  │──────────────────────────────────────────────────────││
│  │  ┌────┐  │  │                                                      ││
│  │  │Logo│  │  │                                                      ││
│  │  └────┘  │  │                 主内容区域 (main)                      ││
│  │ ▸ 项目管理 │  │                 overflow-y: auto                      ││
│  │   项目列表 │  │                                                      ││
│  │ ▾ 数据处理 │  │                                                      ││
│  │   多源去重 │  │                                                      ││
│  │   配置检测 │  │                                                      ││
│  │ ▸ 到货可视化│  │                                                      ││
│  │ ▸ 系统设置 │  │                                                      ││
│  │  ┌────┐  │  │                                                      ││
│  │  │用户│  │  │                                                      ││
│  │  └────┘  │  │                                                      ││
│  └──────────┘  └──────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
│←── 240px ──→│  ←────────────────── flex: 1 ──────────────────────────→│
│←─ 64px ─→│              (collapsed)
```

- **Sidebar**: 宽 240px，收起后 64px，右侧带悬浮切换按钮，固定在左侧
- **手风琴菜单**: 点击一级标题展开/收起二级子项，同一时间仅一个分组展开
- **面包屑栏**: 顶部显示当前路径，右侧显示二级 Tab 页签（项目详情页的 PBOM/关键件/装配）
- **主内容区**: flex: 1，overflow-y: auto 独立滚动

**Sidebar 样式**：
- 背景：白色 `#ffffff`
- 边框：右侧 `1px solid var(--border)`
- 一级父项：flex 两端对齐，右侧 chevron 箭头，展开态 ▾，收起态 ▸（旋转 -90deg）
- 父项激活态：`background: var(--accent-soft); color: var(--accent);`
- 二级子项：左缩进 1.75rem，字号 12px，激活态蓝色加粗
- 收起/展开按钮：圆形，border，悬浮在 sidebar 右侧边缘
- 收起态：隐藏 chevron 和所有子项，父项居中显示

**Breadcrumb Bar**：
- 背景：白色 `#ffffff`
- 边框：底部 `1px solid var(--border)`
- 左侧面包屑路径 + 右侧二级 Tab 页签

---

## 四、导航结构

### 4.1 一级导航（左侧 Sidebar 手风琴）

| 一级分类 | 二级子项 | 说明 |
|---------|---------|------|
| 项目管理 | 项目列表 | 点击展开子项，选择进入项目列表 |
| 数据处理 | 多源去重合并、三层配置列检测 | 点击展开子项，选择具体功能 |
| 到货可视化 | 到货率看板、仓库到货明细 | 点击展开子项，选择具体看板 |
| 系统设置 | 爬虫凭证管理、系统参数 | 点击展开子项，选择配置项 |

**交互规则**：
- 点击一级标题：展开/收起二级子项，同一时间仅一个分组展开
- 点击二级子项：切换到对应页面，子项高亮
- 收起态点击一级标题：自动展开 Sidebar 后再展开子项
- 进入项目详情后：面包屑区显示 PBOM/关键件/装配的二级 Tab，Sidebar 保持"项目管理"高亮

### 4.2 二级 Tab 页签

| 一级分类 | 二级 Tab | 页面 ID | 说明 |
|---------|---------|---------|------|
| 项目管理 | 项目列表 | `page-project-list` | 项目卡片网格 |
| 项目管理→项目详情 | PBOM 清单 | `page-projectDetail-pbom` | 零件清单与上传 |
| 项目管理→项目详情 | 关键件评分 | `page-projectDetail-critical` | 四维评分 + 仪表盘 |
| 项目管理→项目详情 | 装配顺序推荐 | `page-projectDetail-assembly` | BFWS 排程推荐 |
| 数据处理 | 多源去重合并 | `page-data-dedup` | 5 维匹配去重 |
| 数据处理 | 三层配置列检测 | `page-data-detect` | 规则引擎 + LLM |
| 到货可视化 | 到货率看板 | `page-arrival-dashboard` | 各项目到货率对比 |
| 到货可视化 | 仓库到货明细 | `page-arrival-warehouse` | delivery_detail 表 |
| 系统设置 | 爬虫凭证管理 | `page-system-spider` | 数据源与爬虫控制 |
| 系统设置 | 系统参数 | `page-system-params` | 阈值配置 |

### 4.3 面包屑规则

| 一级分类 | 二级 Tab | 面包屑显示 |
|---------|---------|-----------|
| 项目管理 | 项目列表 | 项目管理 › 项目列表 |
| 项目管理→详情 | PBOM/关键件/装配 | 项目管理 › 项目名称 › 子页名称 |
| 数据处理 | 去重/检测 | 数据处理 › 子页名称 |
| 到货可视化 | 看板/明细 | 到货可视化 › 子页名称 |
| 系统设置 | 凭证/参数 | 系统设置 › 子页名称 |

---

## 五、各页面详细规格

### 5.1 项目列表 `page-project-list`

**KPI 卡片**（4 列 grid）：
1. 项目总数：6（覆盖 BEV / PHEV / ICE）
2. 平均到货率：85.6%（较上周 +2.4%）
3. 关键件齐套率：79.7%（较上周 -1.1%）
4. 高风险项目：2（⚠ 到货率 < 80%）

**项目卡片网格**：
- 布局：`grid-template-columns: repeat(auto-fill, minmax(360px, 1fr))`
- 每张卡片包含：
  - 顶部 4px 色条：emerald ≥90% / amber 80-90% / rose <80%
  - 项目名称 + 项目号 + 申请单号
  - 核心指标：到货率、关键件齐套率、零件总数
  - 进度条：到货率百分比可视化
  - 状态标签
- 数据来源：`projectData` 数组（6 条硬编码测试数据）
- 交互：点击卡片 → `openProject(name)` → 进入项目详情

### 5.2 PBOM 清单 `page-projectDetail-pbom`

**功能**：
- 文件上传区域（拖拽 .xlsx / .csv）
- 下载模板按钮：生成标准 CSV 模板（含 M101-M124 配置列）
- 零件清单表格：零件号、零件名、需求量、已入库数、供应商、到货日期、关键件标签
- 三层递进配置列检测入口
- 返回项目列表按钮

### 5.3 关键件评分 `page-projectDetail-critical`

**功能**：
- 左侧：SVG 圆环进度仪表盘 + 风险计数卡片（红/黄/绿）
- 右侧：4 维度权重滑块（安全 30%、大件 20%、紧缺 30%、工艺 20%）
- 权重可拖拽调整，实时联动；重置按钮恢复默认
- 关键件评分表格：零件号、零件名、4 维度评分、综合评分、等级标签
- 评分规则：1-5 分制，综合分 = Σ(维度分 × 权重)，≥4.0 红色 / 3.0-3.9 黄色 / <3.0 绿色

### 5.4 装配顺序推荐 `page-projectDetail-assembly`

**功能**：
- BFWS（阻塞流水车间调度）排程推荐
- 多目标优化：α 齐套 0.4 + β 工时 0.3 + γ 风险 0.3
- 权重滑块调节
- 推荐排序卡片列表（车型/配置名、关键件齐套率、状态标签、缺件清单）
- What-if 模拟：拖拽调整触发对比面板
- 返回项目列表按钮

### 5.5 多源去重合并 `page-data-dedup`

**功能**：
- 4 张匹配统计卡片：原始记录数、强匹配合并、弱匹配核验、唯一源记录
- 匹配规则说明（AI 信息框）
- 5 维匹配键：零件号 + 数量 + 批次号 + 供应商 + 到货日期
- 4 级分级：🟢强匹配 / 🟡弱匹配 / 🔴模糊匹配 / ⚪唯一源
- 去重匹配明细表格

### 5.6 三层配置列检测 `page-data-detect`

**功能**：
- 3 步进度卡片：规则引擎排除法(86%) → LLM 语义补刀(12列) → 用户确认兜底(3列)
- 检测结果表格
- 重新检测 / 导出 JSON 按钮

### 5.7 到货率看板 `page-arrival-dashboard`

**功能**（独立一级页面，不依赖项目上下文）：
- 各项目到货率对比柱状图（ECharts）
- 近 14 天到货趋势折线图
- 关键件到货状态矩阵（按配置分组）
- 导出 PDF 按钮

### 5.8 仓库到货明细 `page-arrival-warehouse`

**数据源**：基于 `delivery_detail` 表结构（仓库 WMS）+ `delivery_no_order`（飞书共享表）

**delivery_detail 表字段**：

| 字段 | 说明 |
|------|------|
| DELIVERY_CODE | 送货单号 |
| APPLY_CODE | 试制申请单号 |
| PRO_CODE | 项目号 |
| PRO_NAME | 项目名称 |
| MATTER_CODE | 零件号 |
| MATTER_NAME | 零件名 |
| STATE | 单据状态（已入库/部分入库/待收货/不合格） |
| ORDER_NUM | 订单数量 |
| SEND_NUM | 发货数量 |
| RECIVE_NUM | 收货数量 |
| IN_NUM | 入库数量 |
| CANT_NUM | 不合格数量 |
| WH_NAME | 到货仓库 |
| SEND_WH_NAME | 发货仓库 |
| ZYS_USERNAME | 专业师 |
| STYLIST_USERNAME | 设计师 |
| RECIVE_TIME | 收货时间 |

**入库判断逻辑**：`IN_NUM >= ORDER_NUM`（入库数量 >= 订单数量）视为已入库完成

**KPI 卡片**（4 列）：
1. 送货单总数：372（近 14 天）
2. 订单总量：8,642（ORDER_NUM 合计）
3. 已入库总量：7,918（IN_NUM 合计 · 入库率 91.6%）
4. 不合格总量：140（CANT_NUM 合计 · 占比 1.6%）

**图表区域**：
- 单据状态分布柱状图（双数据源对比）：已入库 / 部分入库 / 待收货 / 不合格
- 数据源占比环形饼图：delivery_detail vs delivery_no_order
- 到货趋势折线图（近 14 天，双数据源）
- 按周统计水平条形图（周一至周日）
- Top 10 供应商表格（按 IN_NUM 排序，入库率进度条，状态标签）

**明细表格**（14 列）：
送货单号 | 试制申请单号 | 项目号 | 零件号 | 零件名 | 单据状态 | 订单数量 | 发货数量 | 收货数量 | 入库数量 | 不合格数 | 到货仓库 | 专业师 | 收货时间

**筛选与搜索**：
- 数据源下拉：全部 / 仅 delivery_detail / 仅 delivery_no_order
- 时间范围：近 7/14/30/90 天
- 日期选择器
- 搜索框：支持送货单号/零件号/项目号/零件名/仓库/专业师
- 状态过滤：全部 / 已入库 / 部分入库 / 待收货 / 不合格

**导出**：CSV 格式（UTF-8 BOM），17 列完整字段，文件名 `delivery_detail_YYYY-MM-DD.csv`

### 5.9 爬虫凭证管理 `page-system-spider`

**功能**：
- 3 个数据源状态卡片：仓库 WMS / 飞书共享表 / 采购系统
- 爬虫控制：自动调度开关 + 执行频率
- 同步操作：仓库系统增量/全量，飞书增量/全量
- 终端风格日志面板（深色背景，INFO/WARN/ERROR 级别标签）

### 5.10 系统参数 `page-system-params`

**功能**：
- 关键件评分阈值设置
- 到货率阈值设置（红黄绿分界值，默认 95%/80%）
- 多目标优化权重默认值配置

---

## 六、数据模型

### 6.1 项目（projectData）

```javascript
{
  name: string,           // 项目名称
  code: string,           // 项目号
  applyCode: string,      // 试制申请单号
  parts: number,          // PBOM 零件总数
  delivery: number,       // 到货率 (0-100)
  critical: number,       // 关键件齐套率 (0-100)
  risk: string,           // 风险等级 (safe/warning/danger)
  trend: number[]         // 近 7 天趋势数据
}
```

### 6.2 到货记录（arrivalDetailData）

```javascript
{
  deliveryCode: string,   // DELIVERY_CODE 送货单号
  applyCode: string,      // APPLY_CODE 试制申请单号
  proCode: string,        // PRO_CODE 项目号
  proName: string,        // PRO_NAME 项目名称
  matterCode: string,     // MATTER_CODE 零件号
  matterName: string,     // MATTER_NAME 零件名
  state: string,          // STATE 单据状态
  orderNum: number,       // ORDER_NUM 订单数量
  sendNum: number,        // SEND_NUM 发货数量
  reciveNum: number,      // RECIVE_NUM 收货数量
  inNum: number,          // IN_NUM 入库数量
  cantNum: number,        // CANT_NUM 不合格数量
  whName: string,         // WH_NAME 到货仓库
  sendWhName: string,     // SEND_WH_NAME 发货仓库
  zysUser: string,        // ZYS_USERNAME 专业师
  stylistUser: string,    // STYLIST_USERNAME 设计师
  reciveTime: string,     // RECIVE_TIME 收货时间
  source: string          // 数据源 (delivery_detail / delivery_no_order)
}
```

### 6.3 供应商（arrivalVendorData）

```javascript
{
  rank: number,           // 排名
  vendor: string,         // 供应商名称
  source: string,         // 数据源
  inNum: number,          // 入库数量
  orderNum: number,       // 订单数量
  onTime: number,         // 入库率 (0-100)
  status: string          // 状态 (normal/delayed/lost)
}
```

---

## 七、导航状态管理

### 7.1 核心变量

```javascript
let currentCategory = 'project';           // 当前一级分类
let currentSubTab = {                      // 每个分类的当前二级 Tab
  project: 'list',
  projectDetail: 'pbom',
  data: 'dedup',
  arrival: 'dashboard',
  system: 'spider'
};
let currentProject = null;                 // 当前打开的项目名
```

### 7.2 核心函数

| 函数 | 说明 |
|------|------|
| `toggleSidebar()` | 切换 Sidebar 收起/展开状态，更新箭头方向 |
| `toggleSidebarGroup(cat)` | 展开/收起 Sidebar 手风琴分组，收起态自动展开 Sidebar |
| `updateSidebarActive(cat, subKey)` | 同步 Sidebar 父项和子项的高亮状态 |
| `switchSubTab(cat, key)` | 切换二级 Tab，更新面包屑，显示对应页面，同步 Sidebar |
| `renderSubTabs(cat)` | 渲染面包屑区二级 Tab 页签 HTML |
| `renderPageContent(cat, subKey)` | 显示页面 + 初始化图表 |
| `openProject(name)` | 进入项目详情，设置 currentProject |
| `backToProjectList()` | 返回项目列表，恢复 Sidebar 状态 |

### 7.3 页面切换逻辑

- 所有页面默认 `display: none`，active 页面 `display: block`
- 切换时：移除所有 `.page.active`，激活目标 `.page`
- 图表初始化仅在目标页面可见时执行（`offsetParent !== null` 检查）
- 切换页面时销毁旧图表实例，避免内存泄漏

---

## 八、图表配置

| 图表 | 容器 ID | 库 | 页面 |
|------|---------|-----|------|
| 项目到货率柱状图 | `barChart` | ECharts | 到货率看板 |
| 到货趋势折线图 | `lineChart` | ECharts | 到货率看板 |
| 单据状态分布柱状图 | `statusChart` | ECharts | 仓库到货明细 |
| 数据源占比饼图 | `sourcePieChart` | ECharts | 仓库到货明细 |
| 到货趋势折线图 | `trendChart` | ECharts | 仓库到货明细 |
| 按周统计条形图 | `shiftChart` | ECharts | 仓库到货明细 |
| 关键件仪表盘 | `gaugeOuter` | SVG | 关键件评分 |

---

## 九、关键交互逻辑

### 9.1 项目卡片 → 详情页导航
- 点击项目卡片 → `openProject(name)` → 设置 `currentProject`
- 面包屑更新：`项目管理 › 项目名称`
- 二级 Tab 切换为项目详情子页签
- 默认显示 PBOM 清单页

### 9.2 项目详情内 Tab 切换
- 在同一 `currentProject` 上下文内切换 PBOM / 关键件 / 装配推荐
- 面包屑：`项目管理 › 项目名称 › 子页名称`
- 返回按钮：`backToProjectList()` → 回到项目列表

### 9.3 到货可视化独立页面
- 不依赖项目上下文
- 到货率看板：展示所有项目维度的到货率对比
- 仓库到货明细：基于 delivery_detail 表结构，展示全量到货数据

### 9.4 实时筛选
- 搜索框和下拉筛选器绑定 `input` / `change` 事件
- 筛选后实时重绘表格，不发起网络请求
- `filterArrivalData()` 函数处理仓库到货明细的筛选逻辑

### 9.5 数据导出
- `exportArrivalData()` 生成 CSV 下载
- UTF-8 BOM 头确保 Excel 中文兼容
- 文件名自动带日期

---

## 十、技术栈

| 类别 | 技术 |
|------|------|
| 语言 | HTML5 + CSS3 + Vanilla JavaScript (ES6+) |
| 图表 | ECharts 5.4.3（CDN） |
| 样式方案 | 纯 CSS 变量 + 内联样式 |
| 数据 | 硬编码测试数据（50 条到货记录，6 个项目） |
| 部署 | 静态文件，`python3 -m http.server` |

---

## 十一、文件结构

```
spiderV5/
├── index.html                           # 主页面（单文件应用）
├── frontend-reproduction-spec.md        # 本文档
├── 需求文档_V2_综合版.md                # 需求文档 V2
├── 需求文档_V3_BFWS_CPSAT.md            # 需求文档 V3（BFWS + CP-SAT）
└── 需求文档_V5_综合设计.md              # 需求文档 V5（综合设计）
```

---

## 十二、后续迭代方向

1. **PBOM 上传解析**：接入真实 Excel 解析（SheetJS），替换当前演示数据
2. **三层配置列检测**：接入 LLM API（GPT-4o-mini）实现语义识别
3. **BFWS 排程引擎**：集成 Google OR-Tools CP-SAT 求解器
4. **多源数据同步**：连接真实仓库 WMS 和飞书 API
5. **用户认证**：登录系统与权限管理
6. **操作日志**：审计日志记录与查询
7. **响应式适配**：移动端/平板适配