# Inkline 前端架构

本文档定义 Inkline 前端的技术选型、分层方式和组件模式。目标是让阅读器核心足够稳定、高性能、可测试，同时允许 UI 层快速使用现代前端技术打磨交互体验。

## 技术栈偏好

前端优先采用最新稳定版本。引入或升级任何库之前，必须确认：

- 是否存在相关 Codex skill 或项目内约束。
- 官方文档对应的库版本是否与项目实际安装版本一致。
- 与 Tauri、Vite、React、TypeScript 和测试环境是否兼容。
- 是否会影响阅读器性能、包体积、启动速度或跨平台能力。

当前偏好技术：

- React + TypeScript。
- Vite，关注 Rolldown 稳定版本和 Tauri 兼容性。
- TanStack Router、TanStack Query、TanStack Virtual、TanStack Table 等 TanStack 生态。
- HeroUI 作为默认 UI token 和组件基础。
- Tailwind 用于布局、状态样式和产品 UI 组合。
- Motion 用于可控的界面动效。
- Biome 用于格式化和 lint。
- Vitest 用于单元测试、组件测试和 hooks 测试。
- Storybook 用于 UI 组件文档、交互验证和视觉状态覆盖。
- 原生 `fetch`，不使用 Axios。

## 分层结构

前端代码按职责分层，禁止把核心逻辑、React 状态、视觉实现和页面组合混在一个文件里。

```text
src/
  core/
    domain/
    reader/
    library/
    task/
    settings/
  react/
    hooks/
    providers/
    components/
  ui/
    components/
    theme/
    motion/
  app/
    routes/
    layouts/
    pages/
```

### `core`

`core` 是纯 TypeScript 功能层。

- 不依赖 React。
- 不依赖 HeroUI、Tailwind、Motion 或浏览器 DOM。
- 不直接调用 Tauri commands。
- 负责领域模型、排序、分页、阅读器状态计算、任务状态转换、适配器接口和纯函数。
- 必须高度可测试，覆盖率目标接近 100%。

### `react`

`react` 层把 `core` 包装成 React hooks、context provider 和 headless compound components。

- 可以依赖 React 和 TanStack。
- 不直接依赖 HeroUI 视觉组件。
- 暴露 compound slot components 模式。
- 管理键盘、触控、焦点、可访问性、临时 UI 状态和事件绑定。

示例形态：

```tsx
<Reader.Root>
  <Reader.Viewport />
  <Reader.Toolbar>
    <Reader.ZoomControls />
    <Reader.LayoutModeSelect />
    <Reader.PageProgress />
  </Reader.Toolbar>
</Reader.Root>
```

### `ui`

`ui` 层提供默认视觉实现。

- 可以使用 HeroUI、Tailwind 和 Motion。
- 消费 `react` 层提供的 headless components、hooks 和 slot props。
- 负责主题 token、动效、布局密度、标题栏、弹窗、菜单和产品级视觉语言。
- 所有导出的 UI 组件必须有 Storybook story。

### `app`

`app` 层负责产品页面组合。

- 路由、布局、页面、命令入口、全局 provider 组装放在这里。
- 页面不应沉积复杂业务逻辑，复杂逻辑应下沉到 `core` 或 `react`。
- 页面可以组合多个 UI 组件，但不能成为单文件大杂烩。

## 数据访问

- 前端通过 Tauri command client 或 query function 访问后端能力。
- TanStack Query 负责异步状态、缓存、重试和失效。
- query key 必须结构化、集中定义，避免字符串散落。
- 网络请求默认使用原生 `fetch`。
- 在线源、网盘和凭据相关请求优先由 Rust 后端或受控 adapter 处理。

## 性能优先级

性能和交互流畅度是前端第一优先级。

- 阅读器翻页、缩放、滚动、预加载和图片释放路径必须避免不必要 render。
- 长列表使用虚拟化。
- 图片加载和解码需要明确缓存与取消策略。
- Motion 动效必须可关闭，并尊重 reduced motion。
- 任何复杂计算优先放在 `core` 纯函数中，必要时迁移到 Rust 或 worker-like 后台能力。

## 不确定性处理

当产品行为、交互取舍、架构边界或依赖选择不确定时，先询问项目负责人。不得为了快速推进擅自固化高影响决策。
