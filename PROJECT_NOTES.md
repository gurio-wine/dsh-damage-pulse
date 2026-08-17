# PROJECT_NOTES

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

## 已知问题与解决方案

- GitHub `dsh-plugin` Topic 可进入公共生态聚合源，但 DSH 内置 Plugin Market 使用 `awesome-dsh-plugin` 的审核清单；如需进入内置市场，仍需向该清单提交收录 PR。
- 此发布副本不是完整 DSH workspace，Client bundle 需在 `<dsh-root>` 或另一个完整 DSH 仓库中执行。
- Windows 上 GUI / Web 测试进程曾以退出码 `3221226505` 异常退出；命名类改动优先执行文本扫描、配置解析和 Client bundle 快速验证。
- 旧兼容标识不可直接全量替换；如未来要重命名包名、API 或存储路径，必须提供旧名别名与数据迁移。
- 插件独立 `tsc` 会因发布副本缺少完整 workspace 边界而报既有 `TS6307`/vendor 错误；本次以完整 Harness 中的 Client TypeScript、bundle、事件运行时冒烟和两份源码哈希一致性作为核心验收。Harness 全量 GUI 测试仍受既有 `FiberState` 与 jsdom `Range.getBoundingClientRect` 运行时错误影响。
- 2026-08-17 三分量实装验收：完整 Harness Client bundle 通过；独立预览混合调用和连续 8 次扣费均通过，连续测试分量累计 `0.0148 + 0.0580 + 0.0260 = 0.0988`，余额 `38.6700 -> 38.5712`。全量 `test:gui` 为 184 个文件通过、88 个文件失败，失败集中于仓库既有共享测试状态（含 `ACTIVE` 未定义）及无关模块，不作为本插件回归结论。
- 2026-08-17 共同轨道调整：移除三分量水平偏移，命中、未命中、输出全部锚定余额数字的 `right: 0; bottom: 0`；最终采用 1000ms/90px 普通与输出轨迹、1250ms/132px 未命中轨迹，并以首条立即、后续每 200ms 的 FIFO 冷却窗错峰发射。混合调用余额仍按三者之和立即只扣一次；完整 Harness Client bundle 与独立预览动态验收通过。
- 本项目未新增第三方依赖；完整 DSH 宿主锁文件的生产审计当前仍有 25 项既有 advisory（12 high / 12 moderate / 1 low），扫描路径不包含 `ui-token-monitor` 或 `dsh-token-monitor`，应由宿主仓库单独升级处置。
