# InkNest 代码风格

本文档定义 InkNest 的代码组织、类型约束和实现风格。

## 总原则

- 函数式优先，避免隐式共享状态。
- 小模块、小文件、清晰边界。
- 性能和交互体验优先于实现便利。
- 有不确定的地方先询问项目负责人。
- 引入任何依赖前确认最新稳定版本、官方文档、当前项目版本和兼容性。
- 代码应为测试服务，难以测试的实现需要重新拆分。

## TypeScript

- 禁止使用 `any`，包括显式 `any` 和隐式 `any`。
- 不确定输入使用 `unknown`，在边界层做类型收窄或 schema 校验。
- 公共函数、hooks、组件 props、Tauri command 返回值必须有明确类型。
- 优先使用 discriminated union 表达状态，而不是多个布尔值。
- 不用 `enum` 表达简单字符串集合，优先使用 `as const` tuple 或 union。
- 避免 class 作为默认业务抽象，优先使用纯函数、不可变数据和组合。
- 禁止把数据获取、业务规则、视觉实现和路由组合写在同一个组件文件。

## React

- 组件优先函数式实现。
- 复杂组件使用 compound slot components 模式。
- headless 行为在 `src/react`，默认视觉在 `src/ui`。
- 页面组件只负责组合，不承载核心业务算法。
- hooks 命名必须描述能力，例如 `useReaderState`、`useLibraryItemsQuery`。
- 事件处理函数应稳定，阅读器关键路径避免制造大量新对象。

## Rust

- Rust 侧负责文件系统、数据库、压缩包、缓存、任务队列、系统权限和凭据。
- 模块按领域拆分，例如 `library`、`reader`、`task`、`settings`、`storage`。
- Tauri command 保持粗粒度，不让前端拼接复杂业务流程。
- 错误类型分层：用户可读错误、诊断信息、内部错误。
- 涉及路径、凭据、外部请求的日志必须脱敏。

## 文件组织

- 一个文件只承担一个明确职责。
- 文件过长时优先按领域、状态、纯函数、UI slot、story 和测试拆分。
- 测试文件与被测模块保持邻近或使用清晰镜像目录。
- Storybook story 与 UI 组件同层或在统一 stories 目录中，但必须容易发现。

## 命名

- 产品名使用 `Inkline`。
- 项目和生态名使用 `InkNest`。
- 中文名使用 `墨线`。
- Tauri command 使用 snake_case，例如 `library_import_path`。
- TypeScript 类型使用 PascalCase。
- 文件名按项目约定统一，React 组件文件使用 PascalCase，纯工具模块使用 kebab-case 或 camelCase 时需保持目录内一致。

## 注释

- 只在复杂算法、性能取舍、平台差异和安全边界处写注释。
- 不写重复代码含义的注释。
- TODO 必须说明阻塞原因或后续动作。
