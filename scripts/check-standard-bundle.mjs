import { readFileSync } from 'node:fs'

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
  'damage animation artifact': client.includes('tkm-impact-float') && client.includes('tkm-miss-float'),
}

for (const entry of Object.entries(checks)) {
  const label = entry[0]
  const ok = entry[1]
  console.log((ok ? '[OK] ' : '[FAILED] ') + label)
}
if (Object.values(checks).some(ok => !ok)) process.exitCode = 1
