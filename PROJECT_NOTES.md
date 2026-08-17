# PROJECT_NOTES

## 最近状态摘要

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
```

## 当前开发状态

- Host：Token 采集、精确计价、余额查询、会话投影、历史明细持久化已实现。
- Client：单次用量、会话累计、余额悬浮栏、峰闲标识和命中脉冲扣血动画已实现。
- 公开品牌：`dsh-damage-pulse`。

## 已知问题与解决方案

- GitHub `dsh-plugin` Topic 可进入公共生态聚合源，但 DSH 内置 Plugin Market 使用 `awesome-dsh-plugin` 的审核清单；如需进入内置市场，仍需向该清单提交收录 PR。
- 此发布副本不是完整 DSH workspace，Client bundle 需在 `<dsh-root>` 或另一个完整 DSH 仓库中执行。
- Windows 上 GUI / Web 测试进程曾以退出码 `3221226505` 异常退出；命名类改动优先执行文本扫描、配置解析和 Client bundle 快速验证。
- 旧兼容标识不可直接全量替换；如未来要重命名包名、API 或存储路径，必须提供旧名别名与数据迁移。
- 本项目未新增第三方依赖；完整 DSH 宿主锁文件的生产审计当前仍有 25 项既有 advisory（12 high / 12 moderate / 1 low），扫描路径不包含 `ui-token-monitor` 或 `dsh-token-monitor`，应由宿主仓库单独升级处置。
