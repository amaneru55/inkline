# InkNest 架构设计

本文档描述 InkNest 的目标架构。InkNest 是项目与生态名，Inkline 是面向用户的产品名，中文名暂定“墨线”。它不是一次性定死的实现说明，而是为后续开发提供模块边界、数据流、扩展点和阶段性落地顺序。

InkNest 的核心判断是：阅读器体验、本地资料库、多来源接入和 AI 处理流水线必须解耦。漫画可以来自本地压缩包、图片文件夹、在线服务或网盘，但进入阅读器之后都应表现为一致的章节、页面和进度模型。

## 架构目标

- 本地优先：阅读、资料库、缓存、OCR、翻译和嵌字都应优先支持离线可用。
- 多来源统一：本地文件、在线源和网盘通过统一接口暴露给资料库和阅读器。
- 前后端分层：React 负责交互和状态展示，Tauri/Rust 负责文件、数据库、任务、系统权限和高性能处理。
- 插件化扩展：在线源、网盘、OCR、翻译、图像处理和元数据抓取都应能以适配器方式替换或扩展。
- 可恢复任务：导入、下载、索引、OCR、翻译和嵌字都应是可暂停、可恢复、可重试的后台任务。
- 隐私可控：任何外部网络请求、云同步和第三方翻译都必须可见、可配置、可关闭。
- 性能与交互优先：阅读器翻页、缩放、滚动、预加载、图片释放和长列表必须优先保证流畅。
- 可测试：核心逻辑、hooks、Tauri command 边界、UI 组件状态和关键交互都应配套测试。

## 总体分层

```text
┌──────────────────────────────────────────────┐
│ UI Layer                                      │
│ React views, reader canvas, settings, tasks   │
├──────────────────────────────────────────────┤
│ App Service Layer                             │
│ library, reader, search, source, cloud, AI     │
├──────────────────────────────────────────────┤
│ Domain Layer                                  │
│ manga, chapter, page, source, progress, task   │
├──────────────────────────────────────────────┤
│ Infrastructure Layer                          │
│ database, filesystem, archive, cache, network  │
├──────────────────────────────────────────────┤
│ Runtime / Platform Layer                      │
│ Tauri commands, OS permissions, mobile APIs    │
└──────────────────────────────────────────────┘
```

### UI Layer

React 前端只处理用户体验和轻量状态，不直接读写本地文件、数据库或凭据。

主要职责：

- 书架、搜索、详情页、阅读器、任务队列、设置页。
- 阅读器视图状态：缩放、翻页、滚动位置、布局模式、临时 UI 状态。
- 调用 Tauri commands 获取数据或触发任务。
- 订阅后台任务事件，例如导入进度、下载进度、OCR 进度和错误提示。

前端采用 `core -> react -> ui -> app` 的内部层级：

- `core`：纯 TypeScript 功能层，不依赖 React 或 UI 库。
- `react`：headless hooks、providers 和 compound slot components。
- `ui`：HeroUI token、Tailwind 和 Motion 的默认视觉实现。
- `app`：路由、页面、布局和产品级组合。

前端工程细则见 [FRONTEND_ARCHITECTURE.md](FRONTEND_ARCHITECTURE.md)。

### App Service Layer

应用服务层是前端和底层能力之间的边界，负责组织业务流程。

建议服务：

- `LibraryService`：资料库、书架、元数据、标签、搜索、导入。
- `ReaderService`：章节解析、页面列表、阅读进度、预加载、页面资源 URL。
- `SourceService`：在线漫画源搜索、详情、章节、分页和登录状态。
- `CloudService`：网盘目录、远程文件、远程压缩包、缓存策略。
- `TaskService`：后台任务队列、状态持久化、重试、取消、恢复。
- `AiService`：OCR、翻译、嵌字、人工校对和结果版本管理。
- `SettingsService`：配置、权限、隐私、模型路径、缓存路径。

### Domain Layer

领域层定义稳定的数据概念，尽量不依赖具体 UI、网络库或数据库实现。

核心实体：

- `Manga`：一本漫画的逻辑条目，可以来自本地、在线源或网盘。
- `Chapter`：章节或卷，包含页面集合和来源信息。
- `Page`：单页图像，可能是本地文件、压缩包内条目、远程 URL 或缓存文件。
- `Source`：内容来源，包括 local、online、cloud、generated。
- `LibraryItem`：资料库中的条目，保存用户侧元数据和管理状态。
- `ReadingProgress`：当前章节、页码、滚动位置、阅读时间和设备信息。
- `Annotation`：书签、标注、截图引用和页内笔记。
- `Task`：导入、下载、索引、OCR、翻译、嵌字等可恢复任务。
- `AiResult`：OCR 文本、翻译文本、文字区域、置信度、嵌字图和版本。

## 模块边界

### Library Module

资料库模块不关心页面如何被读取，只关心条目、索引和用户元数据。

职责：

- 管理书架条目和扫描目录。
- 维护标题、作者、标签、状态、评分和封面。
- 建立可搜索索引。
- 合并来自不同来源的同名或同系列条目。
- 记录阅读进度、最近阅读和收藏。

不应承担：

- 具体压缩包解码。
- 在线源请求细节。
- AI 图像处理。

### Reader Module

阅读器模块负责把任意来源的章节变成稳定的页面序列，并为 UI 提供高性能访问。

职责：

- 获取章节页列表。
- 根据阅读模式计算页序和双页组合。
- 管理页面预加载、缓存命中和释放策略。
- 保存阅读进度。
- 提供适宽、适高、裁边、旋转和图像增强参数。

关键原则：

- Reader 只消费 `PageProvider`，不直接关心页面来自 zip、文件夹、HTTP 还是 WebDAV。
- 页面图像应通过可缓存的资源句柄或临时 URL 交给前端。
- 长条漫画和传统分页漫画应共享页面模型，但布局算法独立。

### Import Module

导入模块负责把外部资源转成资料库可理解的条目。

输入：

- 单个压缩包。
- 图片文件夹。
- 包含多本漫画的目录。
- 网盘目录映射。
- 在线源收藏或搜索结果。

输出：

- `Manga`
- `Chapter`
- `Page`
- 封面候选
- 元数据候选
- 导入诊断信息

导入流程应作为后台任务运行，支持取消和恢复。

### Source Module

在线源模块提供统一的漫画服务接入接口。

建议接口能力：

- `search(query, filters)`
- `getManga(id)`
- `listChapters(mangaId)`
- `listPages(chapterId)`
- `getPage(pageId)`
- `login(credentials)`
- `refreshSession()`
- `getCapabilities()`

在线源适配器需要声明：

- 是否需要登录。
- 是否支持搜索。
- 是否支持订阅更新。
- 是否支持下载。
- 是否允许缓存。
- 速率限制和地区限制。

### Cloud Module

网盘模块与在线漫画源不同。它处理的是用户自己的远程文件，而不是漫画站点的章节结构。

建议接口能力：

- `list(path)`
- `stat(path)`
- `open(path)`
- `readRange(path, start, length)`
- `download(path)`
- `watch(path)`
- `getQuota()`

远程压缩包阅读优先依赖范围读取。如果某个网盘不支持 range read，则降级为后台下载到缓存后阅读。

### AI Module

AI 模块是一条可拆分、可缓存、可审阅的流水线。

```text
Page image
  -> preprocess
  -> detect text regions
  -> OCR
  -> translate
  -> layout text
  -> clean original text
  -> render embedded page
  -> review and persist
```

每个阶段都应保存中间结果：

- 原始页面引用。
- 预处理参数。
- 文本区域框。
- OCR 原文和置信度。
- 翻译结果和使用的术语表。
- 嵌字布局参数。
- 输出图像或图层。

这样做可以支持：

- 失败后从中间阶段重试。
- 用户只改译文，不重新 OCR。
- 更换翻译模型后复用 OCR 结果。
- 更换字体或嵌字样式后复用翻译结果。

## 数据与存储

### 本地数据库

建议使用 SQLite 作为本地数据库。它适合桌面端和移动端，便于备份、迁移和调试。

主要表方向：

- `manga`
- `chapter`
- `page`
- `source`
- `library_item`
- `reading_progress`
- `tag`
- `annotation`
- `task`
- `cache_entry`
- `ai_job`
- `ai_text_region`
- `ai_translation`
- `settings`

数据库只保存元数据、索引、状态和引用，不直接保存大图像内容。大文件放在缓存目录或资料库目录。

### 文件与缓存

建议拆分以下目录：

- `library/`：用户导入后选择由 InkNest 托管的文件。
- `cache/pages/`：页面解码缓存和远程页面缓存。
- `cache/covers/`：封面缓存。
- `cache/downloads/`：在线章节和网盘文件下载缓存。
- `ai/results/`：OCR、翻译、嵌字结果。
- `plugins/`：用户安装的插件。
- `logs/`：日志和诊断报告。

缓存条目必须可以从数据库重建或清理。用户删除缓存不应破坏资料库索引。

### 凭据存储

Cookie、Token、网盘密码和同步凭据必须交给系统安全存储或加密存储，不进入普通配置文件。

桌面端优先使用系统 Keychain、Credential Manager 或 Secret Service。移动端使用系统安全存储。

## Tauri 命令边界

前端通过 Tauri commands 调用后端。建议命令保持粗粒度，避免 UI 直接拼装复杂业务流程。

示例：

- `library_import_path(path, options)`
- `library_list_items(filter, pagination)`
- `reader_open_chapter(chapter_id)`
- `reader_get_page(page_id, render_options)`
- `source_search(source_id, query, filters)`
- `cloud_list(account_id, path)`
- `task_list(filter)`
- `task_cancel(task_id)`
- `ai_create_job(target, options)`
- `settings_get(namespace)`
- `settings_update(namespace, patch)`

后台任务通过事件推送进度：

- `task:created`
- `task:progress`
- `task:paused`
- `task:failed`
- `task:completed`
- `library:updated`
- `reader:page-ready`

## 插件架构

插件系统建议分阶段实现。

### 第一阶段：内置适配器

先在代码内实现统一接口和 1 到 2 个内置适配器，例如本地文件、WebDAV 或一个测试在线源。

目标是验证接口，而不是立刻开放第三方插件。

### 第二阶段：受控插件

开放本地插件目录，但插件只能使用受控 API。

插件需要声明：

- 插件类型：online source、cloud storage、translator、ocr、metadata。
- 权限：network、filesystem、credential、model、cache。
- 支持能力：search、download、login、range read、batch task。
- 版本和兼容的 InkNest API 版本。

### 第三阶段：插件仓库

提供插件索引、签名、更新和禁用机制。对在线源插件尤其需要版本管理和失效提示。

## 跨平台策略

### 桌面端

桌面端作为首要目标，承担完整能力：

- 本地文件和压缩包。
- 网盘。
- 在线源。
- 本地模型。
- 批量任务。
- 插件开发与调试。

### Android

Android 侧重点是阅读、缓存、同步和轻量 AI。

需要关注：

- SAF 文件访问。
- 后台任务限制。
- 存储权限。
- 触控阅读体验。
- 小内存设备的页面缓存策略。

### iOS

iOS 侧重点是阅读、同步、导入和受限后台能力。

需要关注：

- 文件 App 导入。
- 沙盒限制。
- 后台下载限制。
- 本地模型体积和性能。
- 插件机制可能需要更严格的约束。

## 关键数据流

### 本地导入到阅读

```text
User selects path
  -> Import Module scans files
  -> Archive/File Provider extracts page metadata
  -> Library Module creates manga/chapter/page records
  -> Cover cache generated
  -> Reader opens chapter
  -> PageProvider decodes current and nearby pages
  -> UI renders pages
  -> ReadingProgress persisted
```

### 在线章节下载到离线阅读

```text
User selects online chapter
  -> Source Adapter lists pages
  -> TaskService creates download task
  -> Network fetches pages with rate limits
  -> Cache stores page files
  -> Library links cached chapter
  -> Reader reads from cache first
```

### AI 翻译嵌字

```text
User creates AI job
  -> TaskService queues pages
  -> AiService runs OCR pipeline
  -> Translation adapter produces translated text
  -> Layout engine computes text placement
  -> Image processor removes original text and renders translated text
  -> Results stored as versioned AI output
  -> Reader can switch original / translated / overlay view
```

## 错误处理与恢复

所有长任务都应持久化状态。应用崩溃或退出后，下次启动可以显示未完成任务并允许继续、重试或放弃。

任务状态建议：

- `pending`
- `running`
- `paused`
- `blocked`
- `failed`
- `completed`
- `cancelled`

错误信息需要分层：

- 用户可读提示：例如文件损坏、登录过期、网络超时。
- 开发诊断信息：堆栈、适配器名称、请求 ID、文件路径、任务阶段。
- 脱敏日志：导出时移除 Token、Cookie、用户路径中的敏感片段。

## 性能原则

- 页面按需解码，不一次性解压整本漫画。
- 阅读器始终预加载当前页前后少量页面。
- 缓存策略按来源区分：本地文件缓存轻量，远程文件缓存积极。
- 长条漫画避免生成超大画布，优先分段渲染。
- AI 批处理限制并发，避免占满 CPU、GPU 或内存。
- 大任务应允许用户设置低功耗、平衡、高性能模式。
- 前端长列表默认使用虚拟化，阅读器关键路径避免不必要 render。
- Motion 动效必须尊重 reduced motion，并允许在阅读器关键路径降级或关闭。

## 工程规范

项目级工程约束拆分到以下文档：

- [FRONTEND_ARCHITECTURE.md](FRONTEND_ARCHITECTURE.md)
- [CODE_STYLE.md](CODE_STYLE.md)
- [UI_SYSTEM.md](UI_SYSTEM.md)
- [I18N.md](I18N.md)
- [TESTING.md](TESTING.md)

任何不确定的技术选型、产品交互、架构边界或隐私策略都应先询问项目负责人。新增依赖前必须确认最新稳定版本、官方文档和当前项目兼容性。

## 推荐落地顺序

1. 定义领域模型和 SQLite schema 草案。
2. 实现本地文件夹和 zip/cbz 的 `PageProvider`。
3. 实现基础资料库导入、书架和阅读进度。
4. 实现阅读器核心：分页、缩放、预加载、双页和长条模式。
5. 抽象 `SourceAdapter` 和 `CloudAdapter`，先接入一个最小可用适配器验证设计。
6. 实现后台任务系统，用于导入、下载和索引。
7. 实现 AI 流水线的任务模型和结果模型，先用可替换的 mock adapter 跑通闭环。
8. 再接入真实 OCR、翻译和嵌字能力。
9. 补齐同步、插件权限、安全存储和多平台差异处理。

## 当前阶段建议

当前仓库仍处在 Tauri + React 初始阶段，建议短期不要急着接在线源和 AI 模型。先把本地漫画阅读打穿，因为它会自然逼出最重要的底层抽象：

- `PageProvider`
- `LibraryItem`
- `Chapter`
- `ReadingProgress`
- `Task`
- `CacheEntry`

这些抽象稳定后，在线源、网盘和 AI 都可以挂到同一套阅读和资料库体验上。
