# PROJECT_NOTES

## 2026-08-22 GitHub Topic Social Preview 与正式模型素材归档

- 已确认 `dsh-plugin` Topic 卡片简介上方图片来自仓库 Social Preview（`repository-images.githubusercontent.com`），不是 README 首图；本仓库此前 `open_graph_image_url` 为空。
- 将已验收峰谷鲸鱼娘海报等比适配为 1280×640 Social Preview，完整保留原内容，仅使用蓝白背景补边；仓库追踪副本为 `docs/assets/dsh-damage-pulse-social-preview.png`。
- 将 GitHub v0.3.0 正式使用的 42 张运行态 PNG、3 张 README 模型图和 Social Preview 归档到桌面版本化素材包，并附 `MANIFEST.md` 与 SHA-256 清单；未覆盖旧 GIF，未混入赞赏码或未实装研究素材。

## 2026-08-22 Issue #3：DSH 0.1.1-rc.2 投影兼容性

- 根因：DSH 0.1.1-rc.2 将 `ProjectionDefinition` 从顶层 `schema + view` 改为 `stateSchema + wire { viewSchema, view }`；旧定义仍能提供余额与 charge-events，但 `SessionStatsBar` 无法取得 `tokenCost`。
- 修复：拆分 tokenCost 持久化 state/view schema，补充 `SessionProjectionStateMap` 类型声明，最低兼容版本更新为 0.1.1-rc.2，新增真实 `SessionProjectionRegistry` register/restore 回归测试。
- 发布：版本升至 `0.2.1`，提交 `9a955fc` 已推送 `master`，Issue #3 已回帖并关闭。13/13 tests、冻结安装、构建、标准 bundle 与打包检查通过。
- 依赖：四个投影相关 rc.2 包及工作区发布年龄豁免写入 `package.json`/`pnpm-workspace.yaml`；其他本地鲸鱼娘与预览 WIP 已从 stash 恢复，未进入公开提交。

## 2026-08-21 DeepSeek Vision 计价更新已推送

- 发布仓库 `https://github.com/wssfk12138/dsh-damage-pulse` 已将远端 `master` 与本地 Vision 计价更新合并并推送，远端提交为 `5ed62584ea3285a5cca9929759ee1b5a58508070`。
- 新增 `deepseek-v4-flash-vision-exp` 价格、最长前缀模型匹配，以及按 API 返回的 `usage.prompt_tokens`（图片 Token 已包含在内）计费，避免图片重复估算。
- 10 项计价测试、`pnpm build`、`pnpm check:bundle` 与 `pnpm pack --dry-run` 均通过。推送前通过 stash 保留了本地鲸鱼娘/预览未提交改动，未纳入公开提交。

## 2026-08-19 README 章节目录

- 在项目简介与演示图后新增两级目录，覆盖全部一级章节，以及安装和配置下的具体操作章节。
- 目录使用 GitHub Markdown 自动生成的中文标题锚点，方便用户直接定位安装、API Key、价格表、FAQ 和支持作者等内容。

## 2026-08-19 README 支持作者入口

- 将桌面赞赏码复制为 `docs/assets/support-author.jpg`，在 README 末尾新增“支持作者”栏目，以固定宽度展示。
- 明确赞赏完全自愿，不影响插件功能、技术支持或后续更新；不附加付费权益、AFF 或商业服务导流。

## 2026-08-18 Linux.do 发帖规范适配

- 移除 README 顶部 FastAiToken 注册/AFF、返利披露和中转站新手文档推广，避免公开仓库被 Linux.do 文章作为间接 AFF 或商业引流入口。
- 新增“社区与反馈”小节，使用普通 `https://linux.do/` 友链表达项目认可并连接社区；明确安装、运行和功能不依赖任何中转服务、充值渠道或返利计划。
- 目标：README 以开源项目功能和安装方式为主，适合配合 Linux.do「开源推广」规则使用。

## 2026-08-18 README 赞助商入口

- 在 README 项目简介后加入 FastAiToken 推荐词与注册链接，明确展示 0.06 倍率 ChatGPT 分组、5.6 Sol、5.6 Terra 和 Claude Fable 5，并披露链接包含推广参数。

## 2026-08-18 Issue #1：标准预编译组合包

- 根因：仓库原先只有 `plugins/` Host 与 `packages/client/` Client 源码，没有根级 `package.json`、`dsh.bundle`、`dsh.client` 或可加载的预编译 `lib/`，因此 bundled DSH 无法按市场/插件流程安装。
- 修复：新增根级标准包 `dsh-damage-pulse@0.2.0`，同时声明 `dsh.bundle` 与 Web `dsh.client`，提交 `lib/index.js`、`lib/client.js` 和 source map；Host/Client 通过独立 `tsconfig.bundle.json` 构建，不依赖完整 Harness 源码树。
- 安装：`dsh plugin --profile web add github:wssfk12138/dsh-damage-pulse`，无需复制源码、手工 `--patch`、改 tsconfig 或重建 Client。
- 能力边界：余额栏、缓存命中/未命中/输出三分量扣血动画、单次用量行、输入区会话累计均由标准包提供；原生左侧会话行累计金额仍是无官方 slot 时的源码可选增强，脚本保持独立。
- 验证：`pnpm install --frozen-lockfile`、`pnpm build`、`check:bundle`、`pnpm pack --dry-run` 通过；在独立 DSH profile 中安装 tarball 并通过 `--dump-config` 确认组合层已加入。中文路径 tarball 直装会被 Windows CLI 拆分，已用纯 ASCII 路径复验成功。
- 2026-08-18：GitHub 直装 profile 已加入标准 Web bundle，并在 E:/deepseek-harness 源码 CLI 的隔离端口 3097 启动验证；日志确认插件加载、tokenCost projection、余额/用量/charge-events 路由，首页 boot manifest 注入 dsh-damage-pulse，Client 与三个 API 均返回 HTTP 200。已回复并关闭 GitHub Issue #1。

## 2026-08-17 GitHub 发布

- 三分量共同轨道扣血动画与侧边栏金额集成修复已推送到 GitHub，功能提交为 `019cdf4`。远端文件树、README、安装脚本和动画实现均已核验；本地 `master` 与 `origin/master` 对齐。

## 2026-08-17 GitHub 版侧边栏金额修复

- 根因：公开仓库只交付 Host 插件与 `ui-token-monitor` Client 包，但 README 宣称的左侧会话金额实际依赖本地 Harness 中对 `packages/client/ui-workspace` 的直接改动。DSH 尚无会话行尾部 additive slot，因此 GitHub 用户按旧文档安装后虽然能生成 `tokenCost` 投影，原版侧边栏仍不会读取或渲染它。
- 修复：新增 `scripts/apply-sidebar-integration.ps1`，对 `tree.ts`、`Rows.tsx`、`Rows.module.css` 做带备份、幂等、结构不匹配即停止的集成；新增 `scripts/verify-installation.ps1` 检查 Host/Client、组合树、侧边栏源码与 bundle；README 补充侧边栏集成及双 bundle 构建步骤。
- 验收：安装器在 DSH `master` 的三份干净源码上通过 Windows PowerShell 5.1 实测，首次安装生成 3 份备份，二次执行文件哈希不变；脚本保持纯 ASCII，避免 5.1 将无 BOM UTF-8 中文误读为 ANSI。完整 Harness 的 `ui-workspace` bundle 重建成功，安装检查全部通过，`tree.client.spec.ts` 与 `rows.client.spec.tsx` 共 48 项测试通过。
- UI 参考：沿用 Harness 现有 32px 会话行、12px 尾部元数据、业务蓝色和 hover 隐藏尾部信息；同时参考 Creative Tim Sidebar Navigation 的紧凑列表层级与 `text-xs` 辅助信息约束，以及 awesome-inspiration 中 The Component Gallery / Refero 的成熟组件与真实应用模式。没有改变现有侧边栏布局。

## 2026-08-17 共同轨道节奏更新

- 普通/输出动画为 1000ms、终点上飘 90px；未命中为 1250ms、终点上飘 132px。三种反馈共用 FIFO 轨道，首条立即发出，后续每 200ms 发出；发射器保留完整冷却窗，确保同批同步入队也能错峰。余额红色闪烁与受击回弹保留，余额仍按整批总费用立即且只扣一次。GitHub 发布副本、本地 Harness 与独立预览已同步，Client bundle 与浏览器动态验收通过。

## 最近状态摘要

- 2026-08-17：已实装缓存命中、缓存未命中、输出费用三分量扣血。Host 事件新增兼容式 `breakdown`；Client 一批事件只扣一次总费用，并分别播放普通命中、红色“未命中”增强反馈和弱化输出提示，旧 Host 自动回退 `damageKind`。按最终视觉决策，三条飘字共用余额数字上方同一轨道并允许自然覆盖，保持余额与峰/闲原有紧凑间距。独立验收页为 `docs/cache-breakdown-preview.html`。
- 2026-08-17：新增长连续对比 GIF 到桌面 `dsh-damage-pulse-continuous-comparison.gif`（960×420、4.8 秒、无限循环）。双侧各连续触发 8 次扣费，约每 450ms 一次，最多同时保留三组飘字；余额与扣费在同一渲染帧更新。普通侧 `¥38.67 → ¥38.59`、累计 `-¥0.08`，未命中侧 `¥38.67 → ¥38.43`、累计 `-¥0.24`。
- 2026-08-17：重新录制双形态功能 GIF 到桌面 `dsh-damage-pulse-normal-and-miss.gif`（960×420、4.8 秒、无限循环）。同屏展示普通扣血和缓存未命中增强效果，连续三轮同步更新余额：普通侧 `¥38.67 → ¥38.64`，未命中侧 `¥38.67 → ¥38.58`；动画曲线复用插件源码参数。
- 2026-08-17：已在桌面整理生图素材包 `dsh-damage-pulse-image-kit`，含命中/未命中同屏演示图、3 张连续扣费关键帧、原始 GIF 和可直接使用的 UTF-8 `PROMPT.txt`。FastAI 高质量多图生成两次均因远端关闭连接失败，按用户要求改为交付本地素材与提示词，由用户自行生成。
- 2026-08-17：扣血动画升级为缓存感知双形态。纯缓存命中沿用普通命中脉冲；存在缓存未命中输入或缓存写入时，播放红色“未命中”增强动画（更大扣费值、短促横向抖动、更强余额回弹）。同一秒合并事件只要有一次未命中即按未命中播放，旧 Client 未提供 `damageKind` 时回退普通动画。
- 2026-08-17：GitHub 仓库已添加 `dsh-plugin`、`dsh`、`deepseek-harness`、`deepseek`、`token-monitor`、`token-usage`、`balance-monitor`、`damage-animation` Topics；公共 DSH 目录可据 `dsh-plugin` Topic 抓取。
- 2026-08-17：公开项目品牌由 `dsh-token-monitor` 更名为 `dsh-damage-pulse`，核心卖点定位为“每次 Token 消耗都会触发扣血飘字与余额受击回弹”。
- 2026-08-17：公开仓库已正式发布，默认分支为 `master`；发布提交 `e904795`，README 与连续扣费 GIF 已完成远端校验。
- GitHub 发布副本已包含当前命中脉冲动画：无红色冲击圈，扣费数字锚定余额金额上方，连续事件最多保留三组飘字。
- 连续扣费 GIF 已加入 `docs/assets/dsh-damage-pulse-continuous-charges.gif` 并嵌入 README；同一文件另存桌面便于直接查看和发布。
- 为避免破坏已有安装和历史数据，目录名、workspace 包名、插件运行标识、API 路径、settings namespace、localStorage key 和数据目录暂时保留旧兼容标识。

## 项目定位

DeepSeek Harness 的 Token 用量、费用和余额监控插件，以游戏式扣血反馈直观呈现每次模型调用的消费。

公开仓库：<https://github.com/wssfk12138/dsh-damage-pulse>

## 技术栈

- TypeScript / React 18
- DeepSeek Harness Cordis Host 与 Client 插件
- pnpm workspace / tsdown

## 常用命令

在完整 DeepSeek Harness 仓库中构建 Client：

```powershell
$env:DSH_BUILD_FACE = 'client'
corepack pnpm --dir packages/client/ui-token-monitor exec tsdown
corepack pnpm --dir packages/client/ui-workspace exec tsdown
```

## 当前开发状态

- Host：Token 采集、精确计价、余额查询、会话投影、历史明细持久化已实现。
- Client：单次用量、会话累计、余额悬浮栏、峰闲标识，以及区分缓存命中/未命中的双形态扣血动画已实现。
- 三分量动画：GitHub 发布副本与本地完整 Harness 均已实装；余额按整次调用总费用只扣一次，分量只驱动动画，字段缺失或分量和不匹配时回退旧单动画。
- 公开品牌：`dsh-damage-pulse`。

## 2026-08-22 鲸鱼娘动画 v0.3.0

- 已把 18765 全真预览的当前完整动画同步到本地公测版：连续 FIFO 扣费、同身份痛苦表情/明显闭眼线、头顶前景扣费、8px 贴卡、待机、耗尽和仅在权威余额 `<=0 → >0` 时触发的复苏。核心 `BalanceWidget.tsx` / `WhaleGirlStage.tsx` 与 DSH 实装开发版哈希一致。
- 正式包只加入 42 张运行态 PNG，`package.json` 包含 `assets/**/*`。Host 资源路由采用精确白名单，只允许 GET/HEAD；非法编码返回 400，非白名单/目录穿越返回 404，其他方法返回 405，并设置 `image/png`、`nosniff` 与 immutable cache。
- `pnpm build`、`check:bundle`、18/18 tests、`pnpm audit --prod` 与 `pnpm pack --dry-run` 全部通过，42 张 PNG 均进入包。
- 以上运行代码与精简素材作为 v0.3.0 正式发布；旧 docs、素材处理脚本和用户未跟踪研究文件继续保留在本地，不进入发布提交。

## 已知问题与解决方案

- GitHub `dsh-plugin` Topic 可进入公共生态聚合源，但 DSH 内置 Plugin Market 使用 `awesome-dsh-plugin` 的审核清单；如需进入内置市场，仍需向该清单提交收录 PR。
- 此发布副本不是完整 DSH workspace，Client bundle 需在 `<dsh-root>` 或另一个完整 DSH 仓库中执行。
- Windows 上 GUI / Web 测试进程曾以退出码 `3221226505` 异常退出；命名类改动优先执行文本扫描、配置解析和 Client bundle 快速验证。
- 旧兼容标识不可直接全量替换；如未来要重命名包名、API 或存储路径，必须提供旧名别名与数据迁移。
- 插件独立 `tsc` 会因发布副本缺少完整 workspace 边界而报既有 `TS6307`/vendor 错误；本次以完整 Harness 中的 Client TypeScript、bundle、事件运行时冒烟和两份源码哈希一致性作为核心验收。Harness 全量 GUI 测试仍受既有 `FiberState` 与 jsdom `Range.getBoundingClientRect` 运行时错误影响。

## 2026-08-22 README 实机功能拆解图 R2

- 用已打码 DSH 实机截图、峰谷余额框全真截图和正式运行鲸鱼娘帧作为六张参考图，一次调用 OpenCodex `sota` 的 `gpt-image-2` 生成完整功能拆解图；所有中文、版式、标注和装饰均由模型直出，没有本地二次绘制。
- 成品位于 `release-assets/github-readme/20260822-feature-breakdown-r2-machine-shot/dsh-damage-pulse-feature-breakdown-sota.png`（1672×941）；展示侧边栏/本次会话费用、峰谷余额、Token 扣费、待机和扣血表情，未加入未要求功能。
- 本轮仅制作发布素材，未改插件源码、未 commit、未 push；旧版素材全部保留。

## 2026-08-22 README 徽章、海报与鲸鱼娘介绍（v0.3.0）

- README 开头新增峰谷鲸鱼娘功能拆解海报，删除旧目录（TOC）；Linux DO 社区认可、FastAI 模型赞助商与赞赏作者三枚 Shields SVG 徽章同排展示。
- Linux DO 徽章复用社区帖子 `1777230` 提供的 base64 SVG 技术路线；FastAI 徽章用同一路线内嵌 FastAI 官网 favicon，并绑定 `https://github.com/wssfk12138/fastaitoken-beginner-guide`。Linux DO 与 FastAI 外链均在新标签页打开并带 `noopener noreferrer`。
- 底部“支持作者”改为带显式 `support-author` 锚点的“赞赏作者”，保留原微信赞赏码；社区章节说明 FastAI 为模型赞助商，并明确插件功能不依赖该服务。
- 新增鲸鱼娘介绍与两张已实装原画：`idle-v4-r2/acting-01.png` 啃手指待机、R5 `critical-peak.png` 严重扣费。README 专用副本和新海报均位于 `docs/assets/`。
- `http://127.0.0.1:18766/` GitHub 风格本地预览验证全部图片、徽章等高同排、模型赞助商链接、赞赏锚点、页面溢出与控制台错误通过。
- README 展示动画已从旧 `960×540 / 72 帧` GIF 切换到紧凑双余额框 R2 `docs/assets/dsh-token-monitor-dual-showcase-r2-compact.gif`（960×420、271 帧、2.63 MB）；旧 GIF 保留。18766 实际加载与控制台门禁通过。
- v0.3.0 功能提交 `53a6160` 已推送到 GitHub `master`；`dsh-plugin` Topic 保留，仓库 description 已明确写入鲸鱼娘待机/扣费/复苏动画。远端 README、功能拆解海报与紧凑 GIF 均核验成功，媒体资源 HTTP 200。
- 2026-08-17 三分量实装验收：完整 Harness Client bundle 通过；独立预览混合调用和连续 8 次扣费均通过，连续测试分量累计 `0.0148 + 0.0580 + 0.0260 = 0.0988`，余额 `38.6700 -> 38.5712`。全量 `test:gui` 为 184 个文件通过、88 个文件失败，失败集中于仓库既有共享测试状态（含 `ACTIVE` 未定义）及无关模块，不作为本插件回归结论。
- 2026-08-17 共同轨道调整：移除三分量水平偏移，命中、未命中、输出全部锚定余额数字的 `right: 0; bottom: 0`；最终采用 1000ms/90px 普通与输出轨迹、1250ms/132px 未命中轨迹，并以首条立即、后续每 200ms 的 FIFO 冷却窗错峰发射。混合调用余额仍按三者之和立即只扣一次；完整 Harness Client bundle 与独立预览动态验收通过。
- 本项目未新增第三方依赖；完整 DSH 宿主锁文件的生产审计当前仍有 25 项既有 advisory（12 high / 12 moderate / 1 low），扫描路径不包含 `ui-token-monitor` 或 `dsh-token-monitor`，应由宿主仓库单独升级处置。
