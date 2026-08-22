import { existsSync, readFileSync } from 'node:fs'

const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const patch = readFileSync(new URL('../cordis.patch.yml', import.meta.url), 'utf8')
const host = readFileSync(new URL('../lib/index.js', import.meta.url), 'utf8')
const client = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')

const checks = {
  'dsh.bundle patch': manifest.dsh?.bundle?.patch === './cordis.patch.yml',
  'dsh.client declaration': manifest.dsh?.client?.platform === 'web',
  'package-name patch row': patch.includes('name: dsh-damage-pulse'),
  'Host plugin artifact': host.includes('dsh-damage-pulse') && host.includes('charge-events'),
  'Client ModuleLoader artifact': client.includes('__ModuleLoader__.load') && client.includes('dsh-damage-pulse'),
  'continuous damage animation': client.includes('tkm-impact-float') && client.includes('FLOAT_EMIT_INTERVAL_MS'),
  'whale animation module': client.includes('WhaleGirlStage') && client.includes('idle-v4-r2'),
  'whale visible by default': client.includes('dsh-token-monitor-show-whale-girl'),
  'revive transition': client.includes('revive-recharge') && client.includes('previousSnapshot <= 0'),
  'secure whale asset route': host.includes('WHALE_ASSET_PATHS') && host.includes('X-Content-Type-Options') && host.includes('kind: "prefix"'),
  'runtime whale assets': [
    'idle-v4-r2/idle-01.png',
    'idle-v4-r2/acting-08.png',
    'feedback-expression-v4-r4-model/frames/critical-close.png',
    'feedback-expression-v4-r5-critical-model/frames/critical-overflow.png',
    'revive-recharge-v1/frames/revive-reopen.png',
    'death-stranded-v6-trim.png',
  ].every((path) => existsSync(new URL(`../assets/dsh-token-monitor/whale-girl/` + path, import.meta.url))),
  'package includes assets': manifest.files?.includes('assets/**/*') === true,
}

for (const entry of Object.entries(checks)) {
  const label = entry[0]
  const ok = entry[1]
  console.log((ok ? '[OK] ' : '[FAILED] ') + label)
}
if (Object.values(checks).some(ok => !ok)) process.exitCode = 1
