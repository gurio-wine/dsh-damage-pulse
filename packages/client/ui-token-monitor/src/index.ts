/**
 * Token 用量与金额面板插件，node half。纯 UI 插件：空 apply 仅让插件出现在
 * cordis.yml / Loader；浏览器半经 exports["./client"] 提供，由 package.json 的
 * dsh.client 声明发现。Host 侧的采集/计价/投影逻辑由 dsh-damage-pulse 插件提供。
 */

/** Host 插件体 —— 该 surface 插件无 host 侧行为。 */
export function apply(): void {}
