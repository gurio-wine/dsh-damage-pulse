[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$HarnessRoot
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$root = (Resolve-Path -LiteralPath $HarnessRoot).Path
$checks = [ordered]@{
  'Host plugin source' = Join-Path $root 'plugins\dsh-token-monitor\src\index.ts'
  'Client plugin source' = Join-Path $root 'packages\client\ui-token-monitor\src\client\index.ts'
  'Client plugin bundle' = Join-Path $root 'packages\client\ui-token-monitor\lib\client.js'
  'Sidebar tree source' = Join-Path $root 'packages\client\ui-workspace\src\client\tree.ts'
  'Sidebar row source' = Join-Path $root 'packages\client\ui-workspace\src\client\rows\Rows.tsx'
  'Sidebar style source' = Join-Path $root 'packages\client\ui-workspace\src\client\rows\Rows.module.css'
  'Sidebar bundle' = Join-Path $root 'packages\client\ui-workspace\lib\client.js'
  'Web composition patch' = Join-Path $root 'packages\bundle\web-app\cordis.patch.yml'
}

$failed = $false
foreach ($entry in $checks.GetEnumerator()) {
  if (Test-Path -LiteralPath $entry.Value -PathType Leaf) {
    Write-Host "[OK] $($entry.Key)"
  } else {
    Write-Host "[MISSING] $($entry.Key): $($entry.Value)" -ForegroundColor Red
    $failed = $true
  }
}

if (-not $failed) {
  $tree = [System.IO.File]::ReadAllText($checks['Sidebar tree source'])
  $rows = [System.IO.File]::ReadAllText($checks['Sidebar row source'])
  $css = [System.IO.File]::ReadAllText($checks['Sidebar style source'])
  $webPatch = [System.IO.File]::ReadAllText($checks['Web composition patch'])
  $sidebarBundle = [System.IO.File]::ReadAllText($checks['Sidebar bundle'])

  $contentChecks = [ordered]@{
    'tokenCost projection reader' = $tree.Contains('function sessionCost(')
    'Session row cost renderer' = $rows.Contains('function costLabel(') -and $rows.Contains('className={css.cost}')
    'Session row cost style' = $css.Contains('.cost {') -and $css.Contains('.sessionRow:hover .cost')
    'Client composition mount' = $webPatch.Contains('@deepseek-ai/dsh-client-ui-token-monitor')
    'Rebuilt sidebar bundle' = $sidebarBundle.Contains('Session cost') -or $sidebarBundle.Contains([char]0x4F1A + [char]0x8BDD + [char]0x6D88 + [char]0x8D39 + [char]0x91D1 + [char]0x989D)
  }
  foreach ($entry in $contentChecks.GetEnumerator()) {
    if ($entry.Value) {
      Write-Host "[OK] $($entry.Key)"
    } else {
      Write-Host "[FAILED] $($entry.Key)" -ForegroundColor Red
      $failed = $true
    }
  }
}

if ($failed) {
  throw 'dsh-damage-pulse installation verification failed. Fix the items above.'
}

Write-Host 'dsh-damage-pulse: Host, Client, sidebar source, and bundles verified.'
