---
kind: frontend_style
name: 前端样式体系：Tailwind CSS + shadcn/ui + Lark 设计系统（webui_ref）与 Demo 独立暗色主题
category: frontend_style
scope:
    - '**'
source_files:
    - webui_ref/tailwind.config.ts
    - webui_ref/client/src/index.css
    - webui_ref/client/src/tailwind-theme.css
    - webui_ref/client/src/typography.css
    - webui_ref/components.json
    - webui_ref/package.json
    - demo/assets/css/theme.css
---

## 1. 整体方案

本仓库包含两套前端样式体系，分别服务于不同用途：

- **webui_ref/client**：基于 Tailwind CSS v4 + shadcn/ui + Lark 企业级设计系统的 React+Vite 全栈参考工程，是正式 UI 的参考实现。
- **demo/**：纯静态 HTML + 内联/外链 CSS 的演示页面集，采用独立的暗色主题，不依赖任何构建工具。

后端 `backend/` 为 FastAPI Python 服务，不包含前端样式代码。

## 2. 核心文件与包

### webui_ref（主样式体系）
- `tailwind.config.ts`：通过 `@lark-apaas/fullstack-presets` 的 `createTailwindPresetOfSimple()` 加载预设，扫描 `client/src/**/*.{ts,tsx,css}`。
- `client/src/index.css`：入口样式，依次引入 `@lark-apaas/client-toolkit/lib/index.css`、`tw-animate-css`、自定义主题 `tailwind-theme.css`、排版 `typography.css`，并通过 `@source` 暴露 `streamdown` 组件类名，通过 `@config` 指向根目录配置。
- `client/src/tailwind-theme.css`：定义完整的 CSS 变量主题系统，包括背景、前景、卡片、侧边栏、信息/危险/成功/警告等语义色，以及字体、圆角、阴影层级、图表色板；通过 `@theme inline` 将 CSS 变量映射到 Tailwind 的 `--color-*`、`--font-*`、`--radius-*`、`--shadow-*` 等设计令牌。
- `client/src/typography.css`：启用 `@tailwindcss/typography` 插件并覆盖 `prose` 类的正文/标题/链接/表格等颜色，使其跟随主题变量。
- `components.json`：shadcn/ui 配置，使用 `new-york` 风格、`neutral` 基础色、CSS 变量模式，别名 `@/components`、`@/lib`、`@/ui`、`@/hooks`，图标库为 `lucide`。
- `package.json` 关键依赖：`tailwindcss ^4.1.13`、`@tailwindcss/postcss ^4.1.13`、`@tailwindcss/typography ^0.5.19`、`@lark-apaas/fullstack-presets`、`@lark-apaas/client-toolkit`、`radix-ui` 全家桶、`class-variance-authority`、`clsx`、`tailwind-merge`、`tw-animate-css`、`sonner`、`framer-motion`、`echarts`/`recharts`。

### demo（独立静态主题）
- `demo/assets/css/theme.css`：约 1600 行的完整暗色主题 CSS，定义 `:root` 中的 `--bg-primary`、`--brand-primary`、`--success`、`--warning`、`--danger`、`--info`、`--border-color`、`--text-*` 等设计令牌，并提供 `app-layout`（Grid 布局：header/sidebar/main/statusbar）、KPI 卡片、设备网格、告警列表、任务进度条、表格、分页、按钮等通用组件样式。
- 各 `.html` 页面直接通过 `<link>` 引入该 CSS，配合 `assets/js/*.js` 中的 Mock 数据渲染。

## 3. 架构与设计约定

### Tailwind + CSS 变量主题（webui_ref）
- 所有颜色、字体、圆角、阴影均通过 CSS 自定义属性在 `:root` 中集中声明，再通过 `@theme inline` 暴露给 Tailwind 原子类使用。换肤只需修改 `:root` 变量。
- 主题命名为“Mint Lime · 薄荷荧光主题”，强调高对比度的亮色主色 `#e2f163` 搭配深色文字，适合工业/制造场景。
- 使用 Lark 企业级预设 `createTailwindPresetOfSimple()` 作为基线，再叠加项目自定义主题。
- 通过 `@lark-apaas/client-toolkit` 提供基础 UI 样式，结合 Radix UI 无样式原子组件与 shadcn/ui 组合出业务组件。
- 排版通过 `@tailwindcss/typography` 的 `prose` 类统一文章/文档样式，并覆盖正/反色两套变量。
- 动画通过 `tw-animate-css` 提供原子化动画类。

### shadcn/ui 组件组织
- 通过 `components.json` 的别名将组件、工具函数、UI 原子组件、Hooks 分别映射到 `@/components`、`@/lib/utils`、`@/components/ui`、`@/hooks`。
- 使用 `class-variance-authority` + `clsx` + `tailwind-merge` 组合生成可变的组件 class，支持 variant/size/state 等变体。

### Demo 静态主题
- 采用 BEM 风格的命名（如 `.kpi-card`、`.device-cell.idle|occupied|fault|maintenance`、`.alarm-item.critical|warning|info`），通过 CSS 修饰符区分状态。
- 使用 CSS Grid 定义全局应用布局（`app-layout`），并通过 `@media (max-width: 1400px)`、`1024px` 做响应式断点。
- 通过 `::-webkit-scrollbar` 自定义滚动条样式，保持暗色一致。

## 4. 规范与约束

- **Tailwind 内容扫描范围**：仅扫描 `client/src/**/*.{ts,tsx,css}`，避免打包无关文件（见 `tailwind.config.ts`）。
- **样式入口唯一性**：所有样式必须经 `client/src/index.css` 引入，确保主题、排版、动画顺序正确（见 `index.css` 的 `@import` 链）。
- **主题扩展方式**：新增颜色/字体/阴影应优先以 CSS 变量形式添加到 `:root`，再通过 `@theme inline` 映射，而非直接写死 Tailwind 配置（见 `tailwind-theme.css` 的模式）。
- **shadcn/ui 组件生成**：遵循 `components.json` 约定的别名路径与 `new-york` 风格，图标统一使用 `lucide-react`。
- **Demo 页面**：不使用构建工具，样式集中在 `demo/assets/css/theme.css`，页面通过 class 组合复用通用组件样式。
- **Lint 规则**：`package.json` 提供 `stylelint` 脚本对 `client/src/**/*.css` 进行校验，表明存在样式 lint 约束（具体规则由 `.stylelintrc.js` 管理）。
- **PostCSS 配置**：通过 `postcss.config.js` 集成 Tailwind v4 PostCSS 处理器，确保 `@source`、`@config` 等指令生效。

## 5. 适用性说明

本仓库的前端样式体系主要集中在 `webui_ref/client`（生产级参考实现）和 `demo/`（静态演示）。后端 `backend/` 为纯 Python/FastAPI 服务，不含前端样式代码。因此本类别适用于整个仓库的“前端样式”关注点，但实际样式代码仅存在于上述两个子目录中。