# 现场-仓储同步系统 — 前端复现需求文档

> 本文档完整描述当前系统的前端页面结构、设计规范、功能逻辑与数据模型，可用于从零复现整个前端界面。

---

## 一、产品概述

| 维度 | 说明 |
|------|------|
| **产品类型** | 工业制造 Web 管理平台 |
| **目标用户** | 整车试制技术室工艺主管、物料管理员、专业师 |
| **核心价值** | 基于 PBOM 智能解析与多源到货数据融合，实现零件到货预判、关键件风险识别与装车计划 AI 推荐 |
| **界面语言** | 中文 |
| **导航模式** | 左侧 Sidebar 路径导航 |
| **设计风格** | 薄荷荧光（Mint Lime）— 杂志编辑式排版 + 大圆角卡片 + 荧光色点缀 |

---

## 二、设计规范（Mint Lime 薄荷荧光）

### 2.1 配色体系

| 角色 | 色值 | 用途 |
|------|------|------|
| 页面底色 bg | `#f0f2f1` | 全局页面背景 |
| 卡片面 surface | `#ffffff` | 白色内容卡片 |
| 主卡片 header | `#d6e9e9` | 薄荷青，重点区块背景 |
| 主文字 text | `#1a1a1a` | 标题与关键数值 |
| 辅助文字 muted | `#94a3b8` | 描述文案、次要标签 |
| 强调色 accent | `#e2f163` | 荧光黄绿徽章、增长标记（每屏 ≤3 处） |
| 边框 border | `#f1f5f9` | 卡片描边 |

**语义状态色**：

| 状态 | 色值 | 用途 |
|------|------|------|
| 安全/正常 | `#10b981` (emerald) | 到货率 ≥95%、入库完成、可装 |
| 预警 | `#f59e0b` (amber) | 到货率 80-95%、待检 |
| 危险/阻塞 | `#fb7185` (rose) | 到货率 <80%、不合格、阻塞 |
| 信息 | `#6366f1` (indigo) | 已检待入库、CTA 深色卡片 |

**图表配色序列**：`#6366f1` → `#10b981` → `#f59e0b` → `#3b82f6` → `#ec4899` → `#8b5cf6`

### 2.2 字体排版

| 用途 | 字体栈 |
|------|--------|
| 全局 | `'Inter', 'SF Pro Display', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif` |
| 数据/零件号 | `'JetBrains Mono', 'SF Mono', 'Fira Code', Consolas, monospace` |

**排版层级**：

| 层级 | 字号 | 字重 | 用途 |
|------|------|------|------|
| 页面主标题 | text-2xl ~ text-3xl | bold (700) | 页面顶部标题 |
| 区块标题 | text-lg ~ text-xl | semibold (600) | Section 标题 |
| 卡片标题 | text-lg | bold (700) | 卡片头部 |
| 正文 | text-sm ~ text-base | normal (400) | 正文内容 |
| 辅助说明 | text-xs | normal (400) | 时间戳、标签 |
| KPI 大数字 | text-3xl ~ text-4xl | bold (700) | 统计卡片数值 |
| 数据值 | text-sm ~ text-base | medium (500) | 零件号、百分比（等宽字体） |

### 2.3 圆角系统

| 类型 | 值 | 用途 |
|------|-----|------|
| 页面主卡片 | `2rem` (32px) | 重点展示区域 |
| 标准卡片 | `1rem` (16px, rounded-2xl) | 普通内容卡片 |
| 按钮/交互 | `1rem` (16px, rounded-2xl) | 按钮、输入框 |
| 徽章/标签 | `9999px` (rounded-full) | 状态标签、胶囊 |

### 2.4 间距系统

| 层级 | 值 | 用途 |
|------|-----|------|
| 内容区最大宽度 | 1400px | 主容器 max-width |
| 页面内边距 | `px-6 lg:px-10 py-8` | 主内容区域 |
| 区块间距 | `space-y-6` (24px) | Section 之间 |
| 卡片间距 | `gap-6` (24px) | 网格间距 |
| 卡片内边距 | `p-6` ~ `p-8` | 标准/大卡片 |

### 2.5 阴影系统

- 标准卡片：`shadow-sm`（轻微浮层）
- 悬停态：`hover:shadow-md`
- 深色 CTA：`shadow-xl`
- 其余场景：无阴影，依靠 border 建立层级

### 2.6 组件规范

**按钮**：
- 主按钮：`bg-[#1a1a1a] text-white rounded-2xl`（黑底白字）
- 次按钮：`bg-white border border-slate-200 text-[#1a1a1a] rounded-2xl`
- 幽灵按钮：透明背景，hover 时 `bg-slate-50`

**卡片**：
- 标准卡片：`bg-white rounded-2xl shadow-sm border border-slate-100 p-6`
- 薄荷青重点卡片：`bg-[#d6e9e9] rounded-2xl p-8`
- 悬停反馈：`hover:border-slate-200 hover:shadow-md`

**状态徽章**：
- 安全：`bg-emerald-50 text-emerald-600 border-emerald-200 rounded-full`
- 预警：`bg-amber-50 text-amber-600 border-amber-200 rounded-full`
- 危险：`bg-rose-50 text-rose-600 border-rose-200 rounded-full`
- 荧光强调：`bg-[#e2f163] text-[#1a1a1a] rounded-full`

**数据表格**：
- 容器：`bg-white rounded-2xl shadow-sm border border-slate-100`
- 表头：`bg-slate-50 text-slate-400 text-xs font-semibold uppercase tracking-wider`
- 单元格：`px-6 py-4`
- 行悬停：`hover:bg-slate-50`
- 行分割：`divide-y divide-slate-100`

**面包屑**：
- 已访问：`text-slate-400 hover:text-[#1a1a1a]`
- 分隔符：`>` 图标，`text-slate-200`
- 当前页：`text-[#1a1a1a] font-medium`

---

## 三、全局布局结构

```
┌──────────────────────────────────────────────────────────┐
│  Sidebar (w-64, 白色)  │  Main Content Area              │
│                          │                                │
│  ┌──────────────────┐   │  ┌──────────────────────────┐  │
│  │ Logo + 系统名     │   │  │ Header Bar (面包屑+用户)  │  │
│  │ [薄荷青底 + 荧光线]│   │  │ sticky, bg-white/80      │  │
│  └──────────────────┘   │  │ backdrop-blur-sm          │  │
│                          │  └──────────────────────────┘  │
│  ┌──────────────────┐   │                                │
│  │ 导航项            │   │  ┌──────────────────────────┐  │
│  │ ● 项目概览        │   │  │ Page Content              │  │
│  │   仓库到货        │   │  │ max-w-[1400px]            │  │
│  │   操作日志        │   │  │ px-6 lg:px-10 py-8       │  │
│  │   系统设置        │   │  │                           │  │
│  └──────────────────┘   │  │  [Outlet 渲染路由组件]      │  │
│                          │  └──────────────────────────┘  │
│  ┌──────────────────┐   │                                │
│  │ 用户头像 + 姓名    │   │                                │
│  └──────────────────┘   │                                │
└──────────────────────────────────────────────────────────┘
```

**Sidebar 样式**：
- 背景：白色 `#ffffff`
- 边框：右侧 `1px #e2e8f0`
- 导航默认态：`text-slate-500`
- 导航悬停态：`bg-slate-50 text-[#1a1a1a]`
- 导航激活态：`bg-[#1a1a1a] text-white`（黑底白字）
- Logo 区域：薄荷青底 `#d6e9e9` + 荧光绿 `#e2f163` 2px 装饰线

**Header Bar**：
- 背景：`bg-white/80 backdrop-blur-sm`（毛玻璃效果）
- 边框：底部 `1px #f1f5f9`
- 内容：左侧面包屑 + 右侧搜索按钮 + 通知中心 + 用户名

---

## 四、页面结构与路由

### 4.1 路由表

| 路由 | 页面 | 导航入口 | 说明 |
|------|------|---------|------|
| `/` | ProjectsPage | 侧边栏「项目概览」 | 首页，项目列表与统计 |
| `/projects/:id` | ProjectDetailPage | 项目卡片点击 | 项目详情（到货监控 Tab） |
| `/projects/:id/assembly-plan` | ProjectDetailPage | 项目详情「装车计划」Tab | 装车计划（内嵌 Tab 切换） |
| `/projects/:id/pending-inspection` | PendingInspectionPage | 项目详情跳转 | 待检明细 |
| `/projects/:id/unqualified-pending` | UnqualifiedPendingPage | 项目详情跳转 | 不合格待判定 |
| `/all-parts` | AllPartsPage | 侧边栏「仓库到货」 | 全量零件到货总览 |
| `/audit-log` | AuditLogPage | 侧边栏「操作日志」 | 操作日志 |
| `/settings` | SystemSettingsPage | 侧边栏「系统设置」 | 系统设置 |

### 4.2 面包屑规则

| 页面 | 面包屑显示 |
|------|-----------|
| `/` | `项目概览`（纯文本，无链接） |
| `/all-parts`、`/audit-log`、`/settings` | `项目概览` > `当前页面名` |
| `/projects/:id` | `项目概览` > `项目名称` |
| `/projects/:id/assembly-plan` | `项目概览` > `项目名称`（与详情同级，Tab 切换不改面包屑） |
| `/projects/:id/pending-inspection` | `项目概览` > `项目名称` > `待检明细` |
| `/projects/:id/unqualified-pending` | `项目概览` > `项目名称` > `不合格待判定` |

---

## 五、各页面详细规格

### 5.1 项目概览与列表 `/`

**Section 组成**：

| Section | 说明 |
|---------|------|
| StatisticsCardsSection | 4 张 KPI 统计卡片 |
| ProjectRiskChartSection | 项目风险分布图表 |
| ProjectListSection | 项目卡片网格 + CRUD 操作 |

**StatisticsCardsSection** — 4 张统计卡片：
1. **项目总数**：从 projects.json 计算 count
2. **平均到货率**：所有项目 delivery_rate 的平均值
3. **关键件齐套率**：所有项目 critical_ready_rate 的平均值
4. **风险项目数**：delivery_rate < 80% 的项目数量

每张卡片样式：`bg-white rounded-2xl shadow-sm border border-slate-100 p-6`，右上角图标区 `rounded-xl`，数值 `text-4xl font-bold`。

**ProjectListSection** — 项目卡片网格：
- 工具栏：左侧标题 + 项目数徽章 + 风险数徽章，右侧「新建项目」按钮（黑底白字）
- 卡片网格：`grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6`
- 每张卡片包含：
  - 头部：项目名称、项目号、申请单号
  - 核心指标：到货率、关键件齐套率、零件总数（三列等分）
  - 进度条：到货率百分比可视化
  - 底部：风险状态徽章 + 最近更新时间 + 迷你趋势折线图
- 卡片顶部 2px 色条：emerald ≥95% / amber 80-95% / rose <80%
- 交互：点击进入详情，悬停显示编辑/删除按钮
- 新建/编辑弹窗：项目名称（选填）、项目号（必填）、试制申请单号（必填）

**迷你趋势折线图**：
- 64×24px SVG，嵌入卡片右下角
- 颜色随风险等级变化（emerald/amber/rose）
- 右侧趋势箭头图标：上升/下降/持平

---

### 5.2 项目详情 `/projects/:id`

**Tab 切换**：顶部两个标签页
- 「到货监控」（默认激活）
- 「装车计划」（切换到 assembly-plan 内容）

Tab 样式：底部黑色下划线 `h-0.5 bg-[#1a1a1a]`，激活态 `text-[#1a1a1a]`，非激活 `text-slate-400`。

**到货监控 Tab — Section 组成**：

| Section | 说明 |
|---------|------|
| ProjectKpiSection | 项目级 KPI 指标 |
| PbomUploadSection | PBOM 文件上传与解析 |
| CriticalPartsSection | 关键件识别与评分卡 |
| DeliveryStatusSection | 到货状态饼状图 |
| CriticalReadinessSection | 关键件到货率仪表盘 |
| DeliveryDetailSection | 到货明细表格 |
| UnmatchedPartsSection | 未到货零件追踪 |

**PbomUploadSection**：
- 文件上传区域：支持 .xlsx 拖拽上传
- 解析后展示零件清单表格
- 配置列三层检测确认（AI 辅助）

**CriticalPartsSection**：
- 四维度评分（安全件/大件/紧缺件/工艺件）
- 评分结果以标签色标识：🔴4.0+ / 🟡3.0-3.9 / 🟢<3.0
- 使用 `critical-part-scorer` AI 插件

**DeliveryStatusSection**：
- 饼状图：按 STATE 分类统计（入库完成/已检待入库/待检/不合格待判定/其他）
- 点击扇区跳转对应子页面

**DeliveryDetailSection**：
- 到货明细表格：送货单号、状态、零件号、零件名、订单数量、收货数量、入库数量、仓库、专业师
- 多源数据标识：🏭仓库系统 / 📋飞书共享表
- 匹配级别标识：🟢强匹配 / 🟡弱匹配 / 🔴模糊匹配 / ⚪唯一源

**装车计划 Tab — Section 组成**：

| Section | 说明 |
|---------|------|
| AssemblyPlanImportSection | 装车计划 Excel 导入 |
| RecommendationListSection | AI 推荐排序卡片列表 |
| WeightControlSection | 多目标权重滑块调节 |
| AiExplanationSection | AI 推理白盒解释（流式） |

**AssemblyPlanImportSection**：
- 文件上传 + 预览表格
- 导入后数据存入 sessionStorage，供推荐排序读取

**RecommendationListSection**：
- 可拖拽排序的推荐卡片列表
- 每张卡片：车型/配置名、关键件齐套率、状态标签、缺件清单
- 导入计划匹配时额外显示：车型(REV/BEV)、用途、用车人、装配地点
- What-if 模拟：拖拽调整触发对比面板

**WeightControlSection**：
- 三个滑块：齐套率权重(α)、工时均衡权重(β)、风险分散权重(γ)
- 实时重新排列推荐顺序

**AiExplanationSection**：
- 使用 `assembly-explainer` AI 插件生成流式解释
- 琥珀色左边框标记 AI 生成内容

---

### 5.3 待检明细 `/projects/:id/pending-inspection`

| Section | 说明 |
|---------|------|
| SummaryStatsSection | 按专业师分组统计待检数量 |
| InspectionListSection | 待检明细列表表格 |

- 面包屑：`项目概览 > 项目名称 > 待检明细`
- 表格字段：送货单号、零件号、零件名、专业师、订单数量、收货数量
- 支持按专业师筛选

---

### 5.4 不合格待判定 `/projects/:id/unqualified-pending`

| Section | 说明 |
|---------|------|
| UnqualifiedSummarySection | 按专业师分组统计不合格数量 |
| UnqualifiedListSection | 不合格明细列表表格 |

- 面包屑：`项目概览 > 项目名称 > 不合格待判定`
- 表格字段：送货单号、零件号、零件名、专业师、不合格数量、订单数量、不合格率
- 支持按专业师筛选

---

### 5.5 仓库到货 `/all-parts`

| Section | 说明 |
|---------|------|
| DeliveryOverviewSection | 到货数据总览 |
| AllPartsTableSection | 全量零件到货表格（复用 ProjectsPage 组件） |

---

### 5.6 操作日志 `/audit-log`

| Section | 说明 |
|---------|------|
| AuditLogListSection | 操作日志列表 |

---

### 5.7 系统设置 `/settings`

| Section | 说明 |
|---------|------|
| CredentialsSection | 仓库系统凭证管理 |
| FeishuCredentialsSection | 飞书凭证管理 |
| SpiderControlSection | 爬虫控制台 + 运行日志 |
| SystemParamsSection | 系统参数配置 |

**SpiderControlSection** 详细功能：
- 运行状态面板：🟢运行中 / ⚪空闲 / 🔴异常 / 🟡已暂停
- 自动调度开关 + 执行频率选择（30min ~ 24h）
- 仓库系统同步：增量/全量
- 飞书共享表同步：增量/全量
- 终端风格日志面板：
  - 深色背景 `bg-[#1a1a1a]`，模拟终端窗口
  - 日志行：时间戳 + 级别标签(INFO/WARN/ERROR) + 内容
  - ERROR 行：整行红色背景高亮
  - WARN 行：整行黄色背景高亮
  - 每行 hover 显示单行复制按钮
  - 底部「复制全部」按钮
- 同步历史折叠面板

**SystemParamsSection**：
- 关键件评分阈值设置
- 到货率阈值设置（红黄绿分界值，默认 95%/80%）

---

## 六、数据模型

### 6.1 项目（IProject）

```typescript
interface IProject {
  id: number;              // 项目 ID
  project_name: string | null;  // 项目名称
  project_code: string;    // 项目号
  apply_code: string;      // 试制申请单号
  parts_count: number;     // PBOM 零件总数
  delivery_rate: number;   // 到货率 (0-100)
  critical_ready_rate: number; // 关键件齐套率 (0-100)
  created_at: string;      // 创建时间 ISO
}
```

### 6.2 零件（IPart）

```typescript
interface IPart {
  id: number;
  project_id: number;
  part_code: string;       // 零件号
  part_name: string;       // 零件名
  demand_quantity: number; // 需求量
  critical_level: string;  // 关键件等级
  critical_reason: string; // 关键件原因
  safety: number;          // 安全件评分 (1-5)
  size: number;            // 大件评分 (1-5)
  scarcity: number;        // 紧缺件评分 (1-5)
  process: number;         // 工艺件评分 (1-5)
}
```

### 6.3 到货记录（IDelivery）

```typescript
interface IDelivery {
  id: number;
  project_id: number;
  delivery_code: string;   // 送货单号
  state: string;           // 状态（入库完成/已检待入库/待检/不合格待判定/其他）
  part_code: string;       // 零件号
  part_name: string;       // 零件名
  order_qty: number;       // 订单数量
  received_qty: number;    // 收货数量
  in_qty: number;          // 入库数量
  unqualified_qty: number; // 不合格数量
  warehouse: string;       // 到货仓库
  professional: string;    // 专业师
  source: string;          // 数据来源（warehouse/feishu）
  match_level: string;     // 匹配级别（strong/weak/fuzzy/unique）
  recive_time: string;     // 收货时间
}
```

### 6.4 车型配置（IProjectConfig）

```typescript
interface IProjectConfig {
  id: number;
  project_id: number;
  config_name: string;     // 配置名称
  config_alias: string;    // 配置别名
  part_count: number;      // 零件数量
  value_range: string;     // 值范围
  key_parts_total: number; // 关键件总数
  key_parts_ready: number; // 已就绪关键件数
  ready_rate: number;      // 齐套率 (0-100)
  status: string;          // 状态（ready/warning/blocked）
}
```

### 6.5 全局共享数据

| 存储键名 | 类型 | 使用场景 |
|---------|------|---------|
| `__global_dfmc_currentProject` | IProject | 当前选中项目（sessionStorage） |
| `__global_dfmc_assemblyWeights` | IAssemblyWeights | 装车计划权重配置 |
| `__global_dfmc_importedPlan` | { headers, rows } | 导入的装车计划数据 |

---

## 七、AI 插件集成

| 插件实例 ID | 基于插件 | 业务用途 | 所属页面 |
|------------|---------|---------|---------|
| pbom-column-detector | ai-text-to-json | PBOM 列头智能识别 | 项目详情 |
| critical-part-scorer | ai-text-to-json | 关键件四维评分 | 项目详情 |
| loading-plan-whitebox-explain | ai-text-generate | 装车计划白盒解释 | 装车计划 AI 推荐 |

调用方式：前端通过 `capabilityClient.load(id).callStream(actionKey, input)` 调用。

---

## 八、动效规范

| 场景 | 方案 | 参数 |
|------|------|------|
| 页面入场 | framer-motion | opacity 0→1, y 8→0, 200ms easeOut |
| 列表项入场 | framer-motion stagger | staggerChildren 80ms, delayChildren 50ms |
| 卡片入场 | framer-motion | opacity 0→1, scale 0.96→1, 180ms easeOut |
| Tab 下划线 | framer-motion layoutId | 共享 layoutId 实现滑动切换 |
| 进度条填充 | framer-motion | width 0→N%, 500ms easeOut, delay 100ms |
| 拖拽排序 | framer-motion drag | drag="y", 弹性 0.1, 无惯性 |
| 悬停反馈 | Tailwind transition | transition-shadow / transition-colors |
| 骨架屏 | Tailwind animate-pulse | bg-slate-100 animate-pulse |

---

## 九、技术栈

| 类别 | 技术 |
|------|------|
| 框架 | React 19 + TypeScript |
| 路由 | React Router DOM v6 |
| 样式 | Tailwind CSS + styled-jsx |
| 动画 | Framer Motion |
| 组件库 | shadcn/ui v4 |
| 图标 | Lucide React |
| 图表 | ReactECharts |
| 表格 | @lark-apaas/client-toolkit/antd-table |
| 表单 | React Hook Form + Zod |
| Toast | sonner |

---

## 十、文件结构

```
client/src/
├── app.tsx                          # 路由配置
├── index.tsx                        # React 渲染入口
├── tailwind-theme.css               # 主题变量（Mint Lime）
├── components/
│   ├── Layout.tsx                   # 全局 Sidebar + Header + Outlet
│   ├── GlobalSearch.tsx             # 全局搜索弹窗
│   ├── NotificationCenter.tsx       # 通知中心
│   └── ui/                          # shadcn/ui 组件库
├── pages/
│   ├── ProjectsPage/                # 项目概览
│   │   ├── ProjectsPage.tsx
│   │   ├── StatisticsCardsSection.tsx
│   │   ├── ProjectRiskChartSection.tsx
│   │   ├── ProjectListSection.tsx
│   │   └── AllPartsTableSection.tsx
│   ├── ProjectDetailPage/           # 项目详情
│   │   ├── ProjectDetailPage.tsx
│   │   ├── ProjectKpiSection.tsx
│   │   ├── PbomUploadSection.tsx
│   │   ├── CriticalPartsSection.tsx
│   │   ├── DeliveryStatusSection.tsx
│   │   ├── DeliveryDetailSection.tsx
│   │   ├── UnmatchedPartsSection.tsx
│   │   └── CriticalReadinessSection.tsx
│   ├── AssemblyPlanPage/            # 装车计划 AI 推荐
│   │   ├── AssemblyPlanPage.tsx
│   │   ├── AssemblyPlanImportSection.tsx
│   │   ├── RecommendationListSection.tsx
│   │   ├── WeightControlSection.tsx
│   │   └── AiExplanationSection.tsx
│   ├── PendingInspectionPage/       # 待检明细
│   ├── UnqualifiedPendingPage/      # 不合格待判定
│   ├── AllPartsPage/                # 仓库到货
│   ├── AuditLogPage/                # 操作日志
│   ├── SystemSettingsPage/          # 系统设置
│   └── NotFound/                    # 404
├── types/
│   └── index.ts                     # 全局类型定义
└── hooks/                           # 自定义 Hooks

shared/static/                       # 静态数据
├── projects.json                    # 项目数据（6 条）
├── parts.json                       # 零件数据
├── delivery.json                    # 到货记录数据
└── configs.json                     # 车型配置数据
```

---

## 十一、关键交互逻辑

### 11.1 项目卡片 → 详情页导航
- 点击项目卡片时，先将项目数据写入 `sessionStorage('__global_dfmc_currentProject')`
- 然后 `navigate('/projects/:id')`
- 面包屑立即从 sessionStorage 读取项目名显示

### 11.2 Tab 切换（到货监控 ↔ 装车计划）
- 在同一页面内切换，不跳转路由
- 两个 Tab 共享相同的 Sidebar、面包屑、项目上下文
- URL `/projects/:id/assembly-plan` 直接访问时自动定位到装车计划 Tab

### 11.3 装车计划导入 → AI 推荐联动
- 导入 Excel 后，解析数据存入 `sessionStorage('__global_dfmc_importedPlan')`
- 推荐排序 Section 监听 storage 事件，自动读取导入数据
- 匹配到的配置卡片显示额外信息：车型、用途、用车人、装配地点

### 11.4 数据筛选/排序
- 使用组件内部 state 管理
- 不依赖 URL Search Params（单页面内筛选）

### 11.5 风险等级判定规则
- 到货率 ≥ 95%：安全（emerald）
- 到货率 80-95%：预警（amber）
- 到货率 < 80%：危险（rose）
