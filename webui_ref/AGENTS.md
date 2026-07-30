# 现场-仓储同步系统 - 需求拆解文档

## 产品概述

- **产品类型**: 工业制造 Web 管理平台
- **场景类型**: <scene_type>prototype-app</scene_type>
- **目标用户**: 整车试制技术室工艺主管、物料管理员、专业师
- **核心价值**: 基于 PBOM 智能解析与多源到货数据融合，实现零件到货预判、关键件风险识别与装车计划 AI 推荐，降低装配等待时间
- **界面语言**: 中文
- **主题偏好**: 浅色
- **导航模式**: 路径导航
- **导航布局**: Sidebar

---

## 页面结构总览

> **说明**：此表为页面生成的唯一数据源，包含所有页面（一级+二级）

| 页面名称 | 文件名 | 路由 | 页面类型 | 入口来源 |
|---------|-------|------|---------|---------|
| 项目概览与列表 | `ProjectsPage.tsx` | `/` | 一级 | 导航 |
| 项目详情 | `ProjectDetailPage.tsx` | `/projects/:id` | 二级 | 项目概览与列表 → 项目卡片/列表项点击 |
| 待检明细 | `PendingInspectionPage.tsx` | `/projects/:id/pending-inspection` | 二级 | 项目详情页 → 饼状图"待检"扇区点击 |
| 不合格待判定 | `UnqualifiedPendingPage.tsx` | `/projects/:id/unqualified-pending` | 二级 | 项目详情页 → 饼状图"不合格待判定"扇区点击 |
| 装车计划AI推荐 | `AssemblyPlanPage.tsx` | `/projects/:id/assembly-plan` | 二级 | 项目详情页 → "装车计划"标签页切换 |
| 系统设置 | `SystemSettingsPage.tsx` | `/settings` | 一级 | 导航 |

---

## 插件规划

| 插件实例名称 | 基于官方插件 | 业务用途 | 输出模式 | 所属页面 |
|------------|-----------|---------|---------|---------|
| pbom-column-detector | `ai-text-to-json` | PBOM 列头智能识别：分析 Excel 列名，判断哪些是配置列、哪些是元数据列（三层检测第2层） | stream | 项目详情页 |
| critical-part-scorer | `ai-text-to-json` | 关键件四维评分：对候选零件按安全件/大件/紧缺件/工艺件四维度输出 1-5 分结构化评分 | stream | 项目详情页 |
| assembly-explainer | `ai-text-generate` | 装车计划白盒解释：为 AI 推荐的装配顺序生成可读的推理说明（为什么这样排） | stream | 装车计划AI推荐页 |

---

## 导航配置

> **说明**：此表为导航生成的数据源，路由需与页面结构总览一致

- **导航布局**: Sidebar
- **导航项**（仅一级页面）:

| 导航文字 | 路由 | 图标(可选) |
|---------|------|-----------|
| 项目概览 | `/` | LayoutDashboard |
| 系统设置 | `/settings` | Settings |

---

## 功能列表

> **说明**：每个页面/区块的功能点，供页面生成使用

---

- **页面**: 项目概览与列表 `ProjectsPage.tsx`
  - **页面目标**: 全局项目状态一览与项目生命周期管理入口
  - **功能点**:
    - **项目统计卡片**: 顶部展示汇总指标——项目总数、整体平均到货率、关键件齐套率、风险项目数（到货率<80%的项目数量）
    - **项目列表/卡片视图**: 以表格或卡片展示所有项目，每个项目显示项目名称、项目号、申请单号、零件总数、到货率（带红黄绿状态色）、关键件齐套率
    - **新建项目弹窗**: 表单录入项目名称（选填）、项目号（必填）、试制申请单号（必填），提交后创建项目
    - **项目操作**: 编辑（弹窗修改项目信息）、删除（二次确认后级联删除关联零件数据）、进入详情
    - **风险项目高亮**: 到货率 <80% 的项目行标红提示，80%-95% 标黄，≥95% 标绿

---

- **页面**: 项目详情 `ProjectDetailPage.tsx`
  - **页面目标**: 单个项目的 PBOM 管理、到货匹配监控与关键件风险识别（系统核心页面）
  - **功能点**:
    - **PBOM 上传与解析**: 上传 .xlsx 文件，后端解析提取零件号/零件名/需求量，支持相同零件号合并（需求量求和），展示解析后的零件清单表格
    - **配置列三层检测确认（AI 辅助）**: 上传后自动识别配置列（如 M101/M102），弹出确认对话框——展示候选配置列、零件数量、值范围，支持用户勾选/取消/重命名配置名，使用 `pbom-column-detector` 插件辅助不确定列的判断
    - **关键件识别与评分卡（AI 辅助）**: 对零件清单进行四维度评分（安全件30%/大件20%/紧缺件30%/工艺件20%），使用 `critical-part-scorer` 插件，以标签色标识关键件（🔴4.0+/🟡3.0-3.9/🟢<3.0），表格中展示评分与理由
    - **到货状态饼状图**: 基于 delivery_detail 的 STATE 字段分类统计——🟢入库完成 / 🔵已检待入库 / 🟡待检 / 🔴不合格待判定 / ⚪其他，点击"待检"或"不合格待判定"扇区跳转对应子页面
    - **到货明细表格**: 展示匹配到的到货记录——送货单号、状态、零件号、零件名、订单数量、收货数量、入库数量、到货仓库、专业师，支持按 STATE 筛选
    - **多源数据标识**: 到货记录标注来源（🏭仓库系统 / 📋飞书共享表），展示匹配级别（🟢强匹配/🟡弱匹配/🔴模糊匹配/⚪唯一源）
    - **未到货零件追踪**: 展示需求量 − 已入库数量 > 0 的零件清单，高亮关键件缺料项，显示预计到货日（若有在途信息）
    - **关键件到货率仪表盘**: 按车型/配置展示关键件齐套率——🟢≥95%可装 / 🟡80-95%预警 / 🔴<80%阻塞，显示缺料清单与预计到货日

---

- **页面**: 待检明细 `PendingInspectionPage.tsx`
  - **页面目标**: 聚焦"待检"状态零件，按专业室分配检验任务
  - **功能点**:
    - **专业室汇总统计**: 按专业师（ZYS_USERNAME）分组统计待检数量和送货单数，以卡片或汇总表格呈现
    - **待检明细列表**: 展示字段——送货单号、零件号、零件名、专业师、订单数量、收货数量，支持按专业师筛选
    - **面包屑导航**: 显示"项目概览 > {项目名称} > 待检明细"，支持返回项目详情

---

- **页面**: 不合格待判定 `UnqualifiedPendingPage.tsx`
  - **页面目标**: 聚焦"不合格待判定"零件，辅助质量判定决策
  - **功能点**:
    - **专业室汇总统计**: 按专业师分组统计不合格数量和涉及送货单数
    - **不合格明细列表**: 展示字段——送货单号、零件号、零件名、专业师、不合格数量、订单数量、不合格率，支持按专业师筛选
    - **面包屑导航**: 显示"项目概览 > {项目名称} > 不合格待判定"，支持返回项目详情

---

- **页面**: 装车计划AI推荐 `AssemblyPlanPage.tsx`
  - **页面目标**: 基于四步推理与多目标优化，生成装车顺序建议并提供可解释的 AI 决策依据
  - **功能点**:
    - **装配顺序推荐列表**: 以卡片列表展示推荐装车顺序，每项显示——车型/配置名、关键件齐套率（带红黄绿状态）、当前状态标签（🟢可装/🟡预警/🔴阻塞）、缺件清单（若有）
    - **AI 推理白盒解释（流式）**: 使用 `assembly-explainer` 插件为每条推荐生成可读解释——为什么这个配置优先/推后，涉及哪些供应商风险、工艺连续性等因素，流式渲染展示
    - **多目标权重调节**: 提供三个滑块调节齐套率权重(α)、工时均衡权重(β)、风险分散权重(γ)，实时重新排列推荐顺序
    - **What-if 模拟**: 支持手动拖拽调整某车型优先级，触发全表重排，对比调整前后的齐套率和风险变化
    - **关键件缺料时间线**: 对阻塞状态（🔴）的配置，以时间线展示缺件预计到货日期，辅助判断推后到何时可装

---

- **页面**: 系统设置 `SystemSettingsPage.tsx`
  - **页面目标**: 管理爬虫凭证、控制数据同步、配置系统参数
  - **功能点**:
    - **凭证自动获取**: 输入用户名和密码，点击"登录获取凭证"，系统模拟登录 di360.dfmc.com.cn 获取 Authorization 和 Cookie，展示获取状态（✅有效/❌无效）
    - **凭证手动更新**: 提供 NEW_AUTHORIZATION 和 NEW_COOKIE 的文本输入框，支持手动粘贴保存，保存后可点击"验证凭证"测试有效性
    - **爬虫控制台**: 显示运行状态（🟢运行中/⚪空闲/🔴异常）、上次执行时间、下次执行时间，提供"手动触发爬虫"按钮
    - **爬虫运行日志**: 以终端风格展示最近的爬虫执行日志（时间戳 + 级别 + 内容），支持滚动查看
    - **系统参数配置**: 关键件评分阈值设置（关键件/次关键/常规的分数分界点）、到货率阈值设置（红黄绿分界值，默认95%/80%）

---

## 数据共享配置

| 存储键名 | 数据说明 | 使用页面 |
|---------|---------|---------|
| `__global_dfmc_currentProject` | 当前选中项目的基本信息，类型为 `IProject` | 项目详情页、待检明细页、不合格待判定页、装车计划AI推荐页 |
| `__global_dfmc_assemblyWeights` | 装车计划多目标权重配置，类型为 `IAssemblyWeights` | 装车计划AI推荐页 |

```ts
interface IProject {
  /** 项目ID */
  id: number;
  /** 项目名称 */
  project_name: string | null;
  /** 项目号，对应 delivery_detail.PRO_CODE */
  project_code: string;
  /** 试制申请单号，对应 delivery_detail.APPLY_CODE */
  apply_code: string;
  /** PBOM零件总数 */
  parts_count: number;
  /** 到货率（0-100） */
  delivery_rate: number;
  /** 关键件齐套率（0-100） */
  critical_ready_rate: number;
  /** 创建时间 */
  created_at: string;
}

interface IAssemblyWeights {
  /** 齐套率权重 α，默认 0.5 */
  completeness: number;
  /** 工时均衡权重 β，默认 0.3 */
  workload_balance: number;
  /** 风险分散权重 γ，默认 0.2 */
  risk_dispersion: number;
}

-------

# UI 设计指南

> **场景类型**: <scene_type>prototype-app</scene_type>（应用架构设计）
> **确认检查**: 本指南适用于可交互的多页面工业管理系统。如果产出物是静态报告或演示，请使用对应场景的模板。

> ℹ️ Section 1-2 为设计意图与决策上下文。Code agent 实现时以 Section 3 及之后的具体参数为准。

## 1. Design Archetype (设计原型)

### 1.1 内容理解
- **目标用户**: 东风汽车研发总院整车试制技术室的工艺主管、物料管理员、专业师。日常在办公室使用 PC 浏览器操作，需要快速扫描项目状态、识别缺料风险、做出装配决策。
- **核心目的**: 风险预判与决策支持——从 PBOM 解析到到货匹配、关键件识别、装车推荐，全链路降低装配等待时间。
- **期望情绪**: **掌控感**（全局状态一目了然）、**信赖感**（AI 建议有据可查）、**高效感**（关键信息一眼可见）。
- **需避免的感受**: 信息过载导致的焦虑、工业系统的冰冷感、AI 黑箱带来的不信任。

### 1.2 设计语言
- **Aesthetic Direction**: 「工业信号台」——以深色侧边栏为控制基底，琥珀色为信号指示，大面积留白承载密集数据，像精密仪器的操作面板。
- **Visual Signature**:
  1. 深岩灰侧边栏 (hsl(215 28% 12%)) 作为全局导航锚点
  2. 琥珀信号色 (hsl(42 96% 52%)) 仅用于可行动元素
  3. 3px 琥珀色左边框作为卡片/区块的视觉签名
  4. 等宽字体 (JetBrains Mono) 呈现所有数值与零件号
  5. 红黄绿三色胶囊标签标识风险等级（🟢≥95% / 🟡80-95% / 🔴<80%）
- **Emotional Tone**: 「冷静精准 + 温暖信号」——钢蓝色中性底色传递专业冷静，琥珀暖色在关键节点提供温暖引导。
- **Design Style**: **Muji 极简 + Grid 网格混合** — 数据密集的工业管理平台需要 Muji 的极细边框与充裕留白来降噪，同时借 Grid 的结构化分隔线建立信息秩序。
- **Application Type**: Multi-page Management System — Sidebar Layout，6 个页面。

## 2. Design Principles (设计理念)

1. **信号优先，噪声归零**：用色彩语义（红黄绿）直接传递风险等级，用户无需阅读文字即可判断状态。所有装饰性元素让位于数据可读性。
2. **AI 透明化**：每一条 AI 推荐都必须附带可展开的推理链条。设计上用左侧琥珀色竖线标记 AI 生成内容，与普通数据区块形成视觉区分。
3. **工业精密感**：等宽字体对齐数值、极细分隔线划分区域、紧凑但不拥挤的数据行距——像精密量具的刻度盘。
4. **渐进式信息揭示**：概览层只展示核心指标，详情层展开完整数据，决策层提供 AI 推理。三层信息按需展开，避免一屏过载。

## 3. Color System (色彩系统)

> **配色设计理由**：汽车制造试制场景需要专业、可信赖的视觉基调。深岩灰侧边栏借鉴工业控制台的设计语言，琥珀色作为「信号灯」引导用户行动，钢蓝色调的中性色系贯穿全局以传递精密与稳重。琥珀色在汽车制造语境中呼应施工警示灯和工程车辆涂装，兼具辨识度与行业关联性。

### 3.1 主题颜色

| 角色 | CSS 变量 | Tailwind Class | HSL 值 | 设计说明 |
|-----|---------|----------------|--------|---------|
| bg | `--background` | `bg-background` | hsl(215 18% 97%) | 钢蓝微灰底色，减轻纯白的刺眼感 |
| surface | `--card` | `bg-card` | hsl(0 0% 100%) | 纯白卡片，承载数据内容 |
| text | `--foreground` | `text-foreground` | hsl(215 30% 14%) | 深钢蓝近黑色，主文字 |
| textMuted | `--muted-foreground` | `text-muted-foreground` | hsl(215 14% 48%) | 中灰钢蓝，辅助说明文字 |
| primary | `--primary` | `bg-primary` | hsl(42 96% 52%) | 琥珀信号色，主行动按钮 |
| primary-foreground | `--primary-foreground` | `text-primary-foreground` | hsl(38 100% 12%) | 深琥珀近黑，primary 上的文字 |
| accent | `--accent` | `bg-accent` | hsl(215 14% 93%) | 浅钢蓝，hover/focus 反馈背景 |
| accent-foreground | `--accent-foreground` | `text-accent-foreground` | hsl(215 25% 22%) | 深钢蓝，accent 区域上的文字 |
| border | `--border` | `border-border` | hsl(215 16% 90%) | 钢蓝浅灰，分隔线与边框 |
| ring | `--ring` | `ring-ring` | hsl(42 96% 52%) | 琥珀色，聚焦环 |

> **Color Token 语义速查（供 code agent 参考）**:
> - `primary` → 主行动：按钮填充、激活态高亮、关键操作 CTA
> - `accent` → 状态反馈：Ghost/Outline 按钮 hover、DropdownMenu focus、Toggle 激活、Skeleton 占位背景
> - `muted` → 静态非交互：禁用态背景、次级说明背景、占位文字色（`text-muted-foreground`）
> - **选择原则**：用户"可以点击" → primary；交互"正在发生" → accent；内容"不可操作" → muted

### 3.2 Sidebar 颜色

| 角色 | CSS 变量 | Tailwind Class | HSL 值 | 设计说明 |
|-----|---------|----------------|--------|---------|
| sidebar | `--sidebar` | `bg-sidebar` | hsl(215 28% 12%) | 深岩灰，工业控制台基底 |
| sidebar-foreground | `--sidebar-foreground` | `text-sidebar-foreground` | hsl(215 12% 76%) | 浅灰，侧边栏默认文字 |
| sidebar-primary | `--sidebar-primary` | `bg-sidebar-primary` | hsl(42 90% 46%) | 琥珀深变体，激活态背景 |
| sidebar-primary-foreground | `--sidebar-primary-foreground` | `text-sidebar-primary-foreground` | hsl(38 100% 12%) | 深琥珀文字，激活态文字 |
| sidebar-accent | `--sidebar-accent` | `bg-sidebar-accent` | hsl(215 24% 18%) | 略浅岩灰，hover 态背景 |
| sidebar-accent-foreground | `--sidebar-accent-foreground` | `text-sidebar-accent-foreground` | hsl(215 10% 90%) | 近白灰，hover 态文字 |
| sidebar-border | `--sidebar-border` | `border-sidebar-border` | hsl(215 22% 20%) | 微亮岩灰，侧边栏分隔线 |
| sidebar-ring | `--sidebar-ring` | `ring-sidebar-ring` | hsl(42 96% 52%) | 琥珀色，聚焦环 |

### 3.2.1 Topbar 颜色

> 本系统不使用独立 Topbar 组件。页面顶部的面包屑导航与用户信息条使用 `bg-card` + `border-b border-border` 实现轻量分隔，无需额外色彩变量。

### 3.3 语义颜色

> 到货状态与风险等级的语义色彩，直接服务于核心业务逻辑。

| 语义 | 背景色 | 边框色 | 文字色 | 应用场景 |
|-----|-------|-------|-------|---------|
| 🟢 安全/可装/已入库 | hsl(152 45% 95%) | hsl(152 55% 40%) | hsl(152 60% 22%) | 到货率≥95%、入库完成、可装状态 |
| 🟡 预警/待检 | hsl(40 75% 94%) | hsl(40 70% 50%) | hsl(40 65% 25%) | 到货率80-95%、待检状态、预警 |
| 🔴 危险/阻塞/不合格 | hsl(4 55% 95%) | hsl(4 65% 48%) | hsl(4 60% 28%) | 到货率<80%、不合格、阻塞状态 |
| 🔵 已检待入库 | hsl(210 55% 95%) | hsl(210 60% 48%) | hsl(210 55% 25%) | 已检待入库状态 |
| ⚪ 其他/中性 | hsl(215 10% 95%) | hsl(215 12% 75%) | hsl(215 14% 38%) | 其他状态、唯一源标识 |

## 4. Typography (字体排版)

- **Heading**: `'Inter'`, `'SF Pro Display'`, `'PingFang SC'`, `'Microsoft YaHei'`, system-ui, sans-serif
- **Body**: `'Inter'`, `'SF Pro Text'`, `'PingFang SC'`, `'Microsoft YaHei'`, system-ui, sans-serif
- **Monospace (数据/零件号)**: `'JetBrains Mono'`, `'SF Mono'`, `'Fira Code'`, `'Cascadia Code'`, Consolas, monospace
- **字体导入**: `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');`

**排版层级**:

| 层级 | 字号 | 字重 | 用途 |
|-----|------|------|------|
| Display | text-2xl ~ text-3xl | font-bold (700) | 页面主标题 |
| Section | text-lg ~ text-xl | font-semibold (600) | 区块标题 |
| Subsection | text-base | font-medium (500) | 子区块标题、表格表头 |
| Body | text-sm ~ text-base | font-normal (400) | 正文、表格内容 |
| Caption | text-xs | font-normal (400) | 辅助说明、时间戳 |
| Data | text-sm ~ text-base | font-medium (500) | 数值、零件号（JetBrains Mono） |
| KPI | text-3xl ~ text-4xl | font-bold (700) | 统计卡片大数字（JetBrains Mono） |

## 5. Global Layout Structure (全局布局结构)

### 5.1 Page Content Zones (页面区块配置)

> ⚠️ **全局统一规则**：所有页面共享相同的 max-w 容器和 Sidebar 布局。

**Sidebar + Content 双栏布局**:
- **Sidebar**: 固定 `w-64` (256px)，深色背景 hsl(215 28% 12%)，全视口高度 `h-screen sticky top-0`
- **Main Content**: `flex-1`，内部 `max-w-7xl mx-auto px-6 lg:px-8 py-6`
- **Content Header（面包屑条）**: `w-full border-b border-border bg-card px-6 lg:px-8 py-3`，包含面包屑导航 + 右侧用户信息

**Standard Content Zone（全页面统一）**:
- **Maximum Width**: `max-w-7xl`（1280px）
- **Padding**: `px-6 lg:px-8 py-6`
- **Alignment**: `mx-auto`
- **Vertical Spacing**: `space-y-6`（区块间距）

**宽内容溢出策略**：当表格/甘特图超出宽度时，外层使用 `overflow-x-auto`，禁止放大容器 max-w。

### 5.2 全局骨架

```html
<div class="flex min-h-screen bg-[hsl(215_18%_97%)]">
  <!-- Sidebar -->
  <aside class="w-64 h-screen sticky top-0 bg-[hsl(215_28%_12%)] flex flex-col border-r border-[hsl(215_22%_20%)]">
    <!-- Logo/系统名 -->
    <div class="px-5 py-5 border-b border-[hsl(215_22%_20%)]">
      <h1 class="text-base font-bold text-[hsl(215_10%_90%)] tracking-tight">现场-仓储同步</h1>
      <p class="text-xs text-[hsl(215_12%_56%)] mt-0.5">PBOM 智能装配系统</p>
    </div>
    <!-- 导航项 -->
    <nav class="flex-1 px-3 py-4 space-y-1">
      <!-- 激活项: bg-[hsl(42_90%_46%)] text-[hsl(38_100%_12%)] -->
      <!-- 默认项: text-[hsl(215_12%_76%)] hover:bg-[hsl(215_24%_18%)] hover:text-[hsl(215_10%_90%)] -->
    </nav>
  </aside>

  <!-- Main Content Area -->
  <div class="flex-1 flex flex-col min-w-0">
    <!-- Content Header (面包屑条) -->
    <header class="w-full border-b border-[hsl(215_16%_90%)] bg-[hsl(0_0%_100%)] px-6 lg:px-8 py-3 flex items-center justify-between">
      <nav class="flex items-center gap-2 text-sm text-[hsl(215_14%_48%)]">
        <!-- 面包屑 -->
      </nav>
      <div class="flex items-center gap-3">
        <!-- 用户信息/通知 -->
      </div>
    </header>

    <!-- Page Content -->
    <main class="flex-1 max-w-7xl w-full mx-auto px-6 lg:px-8 py-6">
      <!-- 页面内容 -->
    </main>
  </div>
</div>
```

## 6. Visual Effects & Motion (视觉效果与动效)

- **Header/Hero 视觉方案**: 无独立 Hero 区。管理工具以效率优先，页面顶部为统计卡片组，不使用大面积装饰背景。
- **装饰手法**: 卡片左侧 3px 琥珀色竖线 (`border-l-3 border-[hsl(42_96%_52%)]`) 作为 AI 生成内容/关键洞察的视觉签名；Sidebar Logo 区域底部琥珀色 2px 细线装饰。
- **圆角**: 容器与卡片 `rounded-sm` (2px)；按钮与交互元素 `rounded-md` (6px)；胶囊标签 `rounded-full`
- **阴影**: 全局 `shadow-none`，依靠 `border border-[hsl(215_16%_90%)]` 建立层级。仅 Modal/Popover 使用 `shadow-lg`
- **复杂背景文字处理**:
  - 渐变背景: 不使用
  - 图片背景: 不使用
  - 有色背景（Sidebar）: 文字使用 `hsl(215 12% 76%)`，对比度 ≈ 5.2:1 ✅

### 6.1 动效意图

- **整体动效风格**: 克制、短促、以 opacity + 微位移为主，体现工业系统的精准利落
- **页面入场**: 内容区以微微上移淡入（约 150-200ms），sidebar 保持静态不动
- **滚动揭示**: 无——管理工具不需要滚动动画
- **列表项动效 · 变更模式**: 增量增删 + 整批替换（筛选/排序触发）
- **列表项动效 · 意图**: 快速利落（150ms 内），新行从上方滑入、旧行淡出，stagger 间隔极短（30ms），整体感强但不拖沓
- **对话框/弹层**: 以微缩放（95%→100%）+ 淡入打开，退场比入场更快（约 100ms），传递干脆感
- **关键交互微动效**:
  1. 按钮点击时轻微下沉（translateY 1px）+ 回弹，传递物理反馈
  2. 风险状态标签（🔴）在 hover 时微微脉冲，暗示需关注
  3. AI 流式输出区域以光标闪烁 + 文字逐字显现，节奏适中（约 30ms/字），传递"正在思考"

## 7. Components (组件指南)

> 所有颜色引用 Color System 中的语义角色。

### Buttons
- **Primary**: 背景 `bg-primary` / 文字 `text-primary-foreground` / Hover `bg-primary/90` / Active `bg-primary/80 scale-[0.98]` / Disabled `bg-primary/40 cursor-not-allowed`
  - 圆角 `rounded-md`，内边距 `px-4 py-2 text-sm font-medium`
- **Secondary**: 背景 `bg-card` / 边框 `border border-border` / 文字 `text-foreground` / Hover `bg-accent text-accent-foreground`
- **Ghost**: 背景 透明 / 文字 `text-foreground` / Hover `bg-accent text-accent-foreground`
- **Outline**: 背景 透明 / 边框 `border border-border` / Hover `bg-accent text-accent-foreground`
- **Danger**: 背景 `bg-[hsl(4_65%_48%)]` / 文字 `text-white` / Hover `bg-[hsl(4_65%_42%)]`

### Form Elements
- **输入框**: 背景 `bg-card` / 边框 `border border-border` / Focus `border-primary ring-2 ring-ring/20` / Disabled `bg-accent/50 cursor-not-allowed`
- **Placeholder**: `text-muted-foreground`
- **Select**: 同输入框，右侧箭头图标
- **Checkbox/Radio**: 边框 `border-border` / Checked `bg-primary border-primary` / 勾选图标 `text-primary-foreground`

### Cards
- **标准卡片**: 背景 `bg-card` / 边框 `border border-border` / 圆角 `rounded-sm` / 内边距 `p-5` / 无阴影
- **AI 洞察卡片**: 同上 + `border-l-3 border-l-primary`（琥珀色左竖线）
- **KPI 统计卡片**: 同上 + 顶部 `border-t-2` 语义色条（绿/黄/红根据状态）
- **Hover 态**: `hover:border-border/80 hover:shadow-sm`（微弱反馈）

### Tables (数据表格)
- **表头**: `bg-accent/50 text-foreground text-xs font-semibold uppercase tracking-wider` / 下边框 `border-b border-border`
- **单元格**: `text-sm text-foreground py-3 px-4` / 下边框 `border-b border-border/60`
- **数据数值**: `font-mono text-sm font-medium`（JetBrains Mono）
- **Hover 行**: `hover:bg-accent/30`
- **风险行高亮**: 🔴行 `bg-[hsl(4_55%_95%)]` / 🟡行 `bg-[hsl(40_75%_94%)]`

### Status Tags (状态胶囊标签)
- **结构**: `inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium`
- **🟢 安全**: `bg-[hsl(152_45%_95%)] text-[hsl(152_60%_22%)] border border-[hsl(152_55%_40%)]`
- **🟡 预警**: `bg-[hsl(40_75%_94%)] text-[hsl(40_65%_25%)] border border-[hsl(40_70%_50%)]`
- **🔴 危险**: `bg-[hsl(4_55%_95%)] text-[hsl(4_60%_28%)] border border-[hsl(4_65%_48%)]`
- **🔵 信息**: `bg-[hsl(210_55%_95%)] text-[hsl(210_55%_25%)] border border-[hsl(210_60%_48%)]`

### Menu / Dropdown
- **菜单容器**: `bg-card border border-border rounded-md shadow-lg`
- **菜单项**: `px-3 py-2 text-sm` / Focus/Hover `bg-accent text-accent-foreground`

### Skeleton
- **加载占位**: `bg-accent rounded-sm animate-pulse`

### Breadcrumbs (面包屑)
- **结构**: `flex items-center gap-2 text-sm`
- **已访问**: `text-muted-foreground hover:text-foreground cursor-pointer`
- **分隔符**: `/ ` 使用 `text-border`
- **当前页**: `text-foreground font-medium`

### Modal / Dialog
- **遮罩层**: `bg-foreground/20 backdrop-blur-sm`
- **弹窗容器**: `bg-card border border-border rounded-md shadow-2xl max-w-lg mx-auto p-6`

### Slider (权重调节器)
- **轨道**: `bg-border rounded-full h-1.5`
- **填充**: `bg-primary`
- **滑块**: `w-4 h-4 rounded-full bg-primary border-2 border-card shadow-sm`

### AI 流式输出区
- **容器**: 卡片样式 + `border-l-3 border-l-primary`
- **文字**: `text-sm text-foreground leading-relaxed`
- **光标**: 琥珀色闪烁光标（`after:content-['▍'] text-primary animate-pulse`）

## 8. Flexibility Note (灵活性说明)

> **一致性优先原则**：所有页面必须使用相同的核心参数（Sidebar 宽度、max-w-7xl、rounded-sm 卡片、shadow-none、border-based 层级），确保整体设计语言统一。
>
> **允许的微调范围**（code agent 可自行判断）：
> - 响应式断点适配（移动端 Sidebar 可折叠为 icon-only 或 drawer）
> - 页面内部的局部间距（如 KPI 卡片内部 padding）
> - Modal/Popover 的独立样式（shadow-lg/shadow-2xl）
> - 表格列宽根据内容自适应
>
> **禁止的随意变更**：
> - ❌ 不同页面使用不同的最大宽度
> - ❌ 不同页面使用不同的圆角/阴影风格
> - ❌ 不同页面使用不同的 Sidebar 颜色
> - ❌ 将 primary 色用于非交互元素（如装饰、背景）

## 9. Signature & Constraints (设计签名与禁区)

### DO (视觉签名)

1. **琥珀信号条**: AI 洞察卡片/推荐区块使用 `border-l-3 border-l-[hsl(42_96%_52%)]` 左边框，建立「AI 生成内容」的统一视觉识别
   ```
   class="border-l-3 border-l-[hsl(42_96%_52%)] pl-4"
   ```

2. **KPI 顶部语义色条**: 统计卡片顶部 2px 色条对应该指标的风险等级
   ```
   class="border-t-2 border-t-[hsl(152_55%_40%)]" /* 绿色=安全 */
   class="border-t-2 border-t-[hsl(4_65%_48%)]"   /* 红色=危险 */
   ```

3. **等宽数据列**: 所有数值、零件号、百分比统一使用 `font-mono font-medium`
   ```
   class="font-mono text-sm font-medium tracking-tight"
   ```

4. **深岩灰 Sidebar**: 全高度深色侧边栏 + 琥珀色激活态，工业控制台标志性外观
   ```
   class="w-64 h-screen sticky top-0 bg-[hsl(215_28%_12%)]"
   /* 激活项 */ class="bg-[hsl(42_90%_46%)] text-[hsl(38_100%_12%)]"
   ```

5. **风险行渗透色**: 表格中风险行整行渗透浅语义底色，而非仅标签着色
   ```
   class="bg-[hsl(4_55%_95%)]" /* 🔴 行 */
   class="bg-[hsl(40_75%_94%)]" /* 🟡 行 */
   ```

### DON'T (禁止做法)
> 通用约束参见「通用约束」。以下为 Prototype 特有：

- ❌ **渐变装饰**: 禁止在卡片、按钮、Header 上使用多色渐变（工业工具不需要花哨装饰）
- ❌ **大圆角**: 禁止 `rounded-xl` / `rounded-2xl` 用于数据容器（保持精密感，最大 `rounded-md`）
- ❌ **彩色 Sidebar 图标**: Sidebar 导航图标使用文字色（默认浅灰、激活深琥珀），不使用多彩图标
- ❌ **primary 色泛滥**: 琥珀色仅用于可点击的按钮/链接/激活态，禁止用于大面积背景、装饰色块、标题文字