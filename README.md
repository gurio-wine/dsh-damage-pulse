# dsh-damage-pulse

DSH（DeepSeek Harness）扣血式 Token 余额监控插件：每次产生 token 消耗，余额数字都会受击回弹，并飘出红色扣费数值；同时提供会话用量、精确金额和 DeepSeek 账户实时余额。

![连续 Token 扣费时的命中脉冲扣血动画](docs/assets/dsh-damage-pulse-continuous-charges.gif)

## 功能特性

- **单次用量行**：每次模型调用结束，在对话流内插入一行 token 明细（输入 / 缓存命中 / 输出 / 思考 reasoning）与精确金额。
- **会话累计条**：输入框上方显示当前会话累计 token 与金额（基于 `tokenCost` session projection）。
- **侧边栏金额**：左侧会话列表为每个会话显示累计消费金额（蓝色），读自投影缓存，重启后自动补齐历史会话。
- **缓存感知扣血动画**：纯缓存命中使用普通红色 `-x.xx¥` 命中脉冲；存在缓存未命中输入或缓存写入时，显示更大的红色「未命中 -x.xx¥」、短促横向抖动和更强的余额回弹。同一秒合并的多笔扣费中只要有一次未命中，整组即按未命中播放；连续扣费最多保留三组飘字。
- **余额悬浮窗**：
  - 充值动画：检测到余额变多，飘出绿色 `+x.xx¥`；
  - 可拖动：按住卡片可随意移动，位置自动记忆（localStorage）；
  - 峰谷标识：余额栏最右侧显示「峰」（红 / 高峰）或「闲」（绿 / 闲时），带红绿灯发光效果。
- **价格表**：内置 DeepSeek 2026-08-17 峰谷定价（含高峰 / 闲时区分），历史费用按每条调用发生的时间戳自动使用旧价，**涨价前已算的费用不会重算**。
- **精确计费**：按每次调用的实际模型名计价（`deepseek-v4-pro` / `deepseek-v4-flash`，支持版本后缀前缀匹配），缓存命中与缓存未命中分别计价。

## 架构

> 项目公开品牌为 `dsh-damage-pulse`。为兼容已安装用户，下列目录名、包名、API 路径、设置命名空间和本地存储键仍沿用 `dsh-token-monitor` / `token-monitor`，无需迁移已有配置与历史数据。

| 部分 | 位置 | 职责 |
|---|---|---|
| Host 插件 | `plugins/dsh-token-monitor` | 监听 `session/event`，精确计费（token × 单价），注册 `tokenCost` session projection、余额轮询服务、HTTP 端点（balance / usage / charge-events / stats） |
| Client 包 | `packages/client/ui-token-monitor` | Web GUI 组件：余额悬浮窗（BalanceWidget）、单次用量行、会话累计条，读投影与 HTTP 端点渲染 |

## 安装与集成

> 前置条件：DSH（DeepSeek Harness）仓库，Web profile 可运行。本插件依赖 DSH 仓库内部结构（tsconfig paths、pnpm workspace、client-modules 扫描机制），因此按「放入仓库内集成」的方式使用。

### 1. 复制文件到 DSH 仓库

```text
# Host 插件
<dsh-root>/plugins/dsh-token-monitor/            ← 本仓库 plugins/dsh-token-monitor/
# Client 包
<dsh-root>/packages/client/ui-token-monitor/     ← 本仓库 packages/client/ui-token-monitor/
```

### 2. 配置 tsconfig paths

`plugins/` 不在 pnpm workspace 内，pnpm 严格模式下无顶层 `node_modules`，需在 `<dsh-root>/tsconfig.base.json` 的 `paths` 增加：

```jsonc
{
  "compilerOptions": {
    "paths": {
      // zod 必须映射到目录（而非 index.js），让 tsc/tsx 经 package.json exports 解析
      "zod": ["./node_modules/.pnpm/zod@4.4.3/node_modules/zod"]
    }
  }
}
```

（实际版本号以你仓库 lockfile 为准。）

### 3. 挂载 Host 插件（--patch）

编辑 `plugins/dsh-token-monitor/cordis.patch.yml`，把 `name` 替换为你的 DSH 仓库绝对路径（**必须 `file://` URL**，Windows 下 `E:\...` 会被当 `e:` 协议报错）：

```yaml
- insert:
    - id: dsh-token-monitor
      name: 'file:///C:/dev/deepseek-harness/plugins/dsh-token-monitor/src/index.ts'
```

启动时带 `--patch`（launcher flags 必须位于内层参数之前）：

```bash
node --import tsx/esm apps/cli/src/bin.ts web --patch <dsh-root>/plugins/dsh-token-monitor/cordis.patch.yml --port 3080
```

### 4. 挂载 Client 包

Client 组件通过 DSH 的 client-modules 机制加载：在 Web profile 的组合树（`packages/bundle/web-app` 的 `cordis.patch.yml`）中用**包名**挂载 `@deepseek-ai/dsh-client-ui-token-monitor`（client 插件必须作为 workspace 包，`file://` 挂载的插件无法被 client-modules 扫描到）。

### 5. 应用侧边栏金额集成

DSH 当前没有开放“会话行尾部信息”的插件 slot，`ui-token-monitor` 无法仅靠自身包把累计金额插入左侧会话列表。请从本仓库根目录运行集成脚本；它会先备份 `ui-workspace` 的三个目标文件，再以幂等方式加入 `projectionValues.tokenCost.cost` 的读取和渲染：

```powershell
.\scripts\apply-sidebar-integration.ps1 -HarnessRoot 'C:\path\to\deepseek-harness'
```

脚本重复执行不会重复插入。若 Harness 上游改变了目标文件结构，脚本会停止并提示不匹配位置，不会猜测写入。

### 6. 构建 Client bundle

```powershell
$env:DSH_BUILD_FACE = 'client'
corepack pnpm --dir packages/client/ui-token-monitor exec tsdown
corepack pnpm --dir packages/client/ui-workspace exec tsdown
```

### 7. 检查安装并启动

```powershell
.\scripts\verify-installation.ps1 -HarnessRoot 'C:\path\to\deepseek-harness'
```

```bash
node --import tsx/esm apps/cli/src/bin.ts web --patch ... --port 3080
```

启动后浏览器打开 `http://127.0.0.1:3080`。

## 配置

### API Key

通过 DSH 的 credentials 机制配置 `DEEPSEEK_API_KEY`（`~/.dsh/.credentials.yaml`），未配置时余额卡片显示引导态，token 计量不受影响。

### 价格表（可选覆盖）

价格表默认内置（见 `src/pricing.ts`），可通过 settings namespace `dsh-token-monitor` 的 `priceTable` 字段覆盖新价格（旧价与高峰时段切换内置）。高峰时段默认北京时间 `9:00–12:00`、`14:00–18:00`。

## HTTP 端点

| 端点 | 说明 |
|---|---|
| `GET /api/token-monitor/balance` | DeepSeek 账户余额（含 currency / 总余额 / 赠送余额） |
| `GET /api/token-monitor/usage?sessionId=` | 用量明细历史（可过滤会话） |
| `GET /api/token-monitor/charge-events?since=<seq>` | 扣费事件增量（含 `damageKind`，驱动缓存感知扣血动画） |

## 常见问题

- **余额卡片显示「未配置」**：未配置 `DEEPSEEK_API_KEY`，token 计量仍正常。
- **侧边栏金额完全不显示**：先运行第 5 步的侧边栏集成脚本，再重建 `ui-workspace` bundle。仅复制 Host 与 Client 插件不会修改 DSH 自带的会话行。
- **只有旧会话没有金额**：插件加载前结束的旧会话需在下次启动时自动补齐（插件启动时对缺失投影的历史会话触发冷读 fold），启动后请稍等几秒再刷新页面。
- **窗口启动后仍无动画**：确认启动命令带了 `--patch`，并已构建最新 client bundle（见第 6 步）。

## 许可证

MIT
