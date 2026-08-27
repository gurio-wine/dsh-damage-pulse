import type { Context } from '@deepseek-ai/cordis'
import { ClawbotFilesystemGateway, WechatConnectionAdapter, WechatConnectionService } from './connection.ts'
import { ClawbotWechatSender, WechatNotifyService } from './sender.ts'

export const WECHAT_NOTIFY_CLAWBOT_INDEX_ENV = 'WECHAT_NOTIFY_CLAWBOT_INDEX'

/** Install the bundled WeChat services without requiring a separately loaded plugin. */
export function installBundledWechat(ctx: Context): void {
  const clawbotIndex = process.env[WECHAT_NOTIFY_CLAWBOT_INDEX_ENV]?.trim() ?? ''
  new WechatNotifyService(ctx, new ClawbotWechatSender({ clawbotIndex }))
  new WechatConnectionService(ctx, new WechatConnectionAdapter({
    gateway: new ClawbotFilesystemGateway({ clawbotIndex }),
  }))
}
