param([string]$NodeDirectory = 'C:\Tools\Node\node-v24.22.1-win-x64')
$frontendRoot = Split-Path -Parent $PSScriptRoot
if (!(Test-Path -LiteralPath (Join-Path $NodeDirectory 'node.exe'))) { throw "Node not found: $NodeDirectory" }
$env:PATH = "$NodeDirectory;$env:PATH"
$env:npm_config_cache = Join-Path $frontendRoot '.npm-cache'
$env:EXPO_HOME = Join-Path $frontendRoot '.tool-home'
$env:EXPO_NO_TELEMETRY = '1'
$env:TEMP = Join-Path $frontendRoot '.tmp'
$env:TMP = $env:TEMP
$env:XDG_CACHE_HOME = Join-Path $frontendRoot '.tool-home\cache'
New-Item -ItemType Directory -Force -Path $env:TEMP,$env:EXPO_HOME,$env:npm_config_cache | Out-Null
Set-Location -LiteralPath $frontendRoot
Write-Host "Frontend environment ready. Node $(node.exe --version)"
