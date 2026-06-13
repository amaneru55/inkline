# Inkline UI 系统

Inkline 的 UI 系统必须支持高性能阅读体验、主题自定义和跨平台一致性。默认视觉层使用 HeroUI token、Tailwind 和 Motion，但核心行为不能绑定到具体 UI 库。

## 主题与外观模式

`theme` 和 `color mode` 是两个概念：

- `themeName` 表示主题套装，例如 `default`、`inkline`，未来可以扩展为更多品牌或用户自定义主题。
- `themeMode` 表示外观模式，取值为 `system`、`light`、`dark`。
- `resolvedColorMode` 是系统偏好和用户选择共同解析出来的实际模式，取值为 `light` 或 `dark`。
- `themeFullName` 是最终应用到 DOM 的 token 名称，例如 `light`、`dark`、`inkline-light`、`inkline-dark`。

每个主题都必须同时提供亮色和暗色 token。禁止把 `dark` 或 `light` 当成主题本身。

默认模式是 `system`。当系统明暗色变化时，Inkline 必须自动更新 DOM token、Tailwind `dark` class、CSS `color-scheme`，并尽量同步 Tauri 原生窗口 theme。

## Token 覆盖范围

主题基于 HeroUI token 建立，覆盖范围包括：

- 应用背景、前景色和表面色
- 原生或自定义标题栏
- 侧边栏、工具栏、菜单、弹窗和浮层
- 阅读器背景、双语层、OCR/翻译任务状态
- 输入控件、按钮、状态提示和通知
- 圆角、间距、阴影、字体和动效时长

业务组件不得散落不可追踪的硬编码颜色。

## 标题栏

原生标题栏不能像自定义标题栏一样完全使用应用 token。桌面端策略是：

- 使用原生标题栏时，不在 `tauri.conf.json` 固定 `theme`，让系统默认行为生效。
- 当用户手动选择 `light` 或 `dark` 时，通过 Tauri app/window theme API 尽量同步原生标题栏。
- 当用户选择 `system` 时，把 Tauri theme 设回系统跟随状态。
- 如果未来改成自定义标题栏，标题栏必须使用同一套 `themeFullName` token。

## 组件模式

UI 组件优先采用 compound slot components：

- `Root` 管理上下文和状态。
- `Trigger`、`Content`、`Toolbar`、`Item`、`Viewport` 等 slot 提供组合能力。
- 默认视觉组件消费 headless 层提供的 props。
- HeroUI 组件只出现在默认 UI 实现层，不进入 `core`。

## Motion

- Motion 用于提升交互反馈，不用于掩盖性能问题。
- 阅读器翻页、缩放、滚动的关键路径必须以流畅和低延迟为先。
- 动效必须尊重 reduced motion。
- 大面积动画需要可关闭或降级。

## Storybook

所有 UI 组件必须有 Storybook story。每个组件至少覆盖：

- 默认状态
- 禁用、加载、错误和空状态，如果适用
- 亮色与暗色模式
- 至少一个非默认主题
- 长文本和多语言文本
- 窄屏或紧凑尺寸
- hover、focus、selected、pressed 等交互状态

阅读器、工具栏、菜单、设置项、任务队列和主题组件需要额外覆盖键盘和触控交互。

## 可访问性

- 图标按钮必须有可访问名称。
- 弹窗、菜单、popover、toast 和 reader overlay 必须处理焦点。
- 键盘操作不能是后补功能，阅读器必须从第一阶段考虑键盘路径。
- 文本不能依赖颜色单独表达状态。
