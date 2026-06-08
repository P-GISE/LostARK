param(
  [switch]$Restart
)

$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$port = if ($env:PORT) { [int]$env:PORT } else { 3001 }
$hostname = "0.0.0.0"
$outLog = Join-Path $projectRoot "next-start-$port.out.log"
$errLog = Join-Path $projectRoot "next-start-$port.err.log"
$launcherOutLog = Join-Path $projectRoot "prod-server-launcher-$port.out.log"
$launcherErrLog = Join-Path $projectRoot "prod-server-launcher-$port.err.log"
$launcherPidFile = Join-Path $projectRoot "prod-server-launcher-$port.pid"
$launcherLog = Join-Path $projectRoot "server-launcher.log"

$listenPattern = "^\s*TCP\s+\S+:$port\s+\S+\s+LISTENING\s+(\d+)\s*$"

if ($Restart -and (Test-Path -LiteralPath $launcherPidFile)) {
  $launcherPid = (Get-Content -LiteralPath $launcherPidFile -ErrorAction SilentlyContinue |
    Select-Object -First 1)

  if ($launcherPid -and ($launcherPid -match "^\d+$")) {
    "Restart requested. Stopping launcher PID: $launcherPid" |
      Out-File -LiteralPath $launcherLog -Append -Encoding utf8
    Stop-Process -Id ([int]$launcherPid) -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
  }
}

$existing = netstat -ano |
  Where-Object { $_ -match $listenPattern } |
  Select-Object -First 1

if ($existing) {
  $existingPid = if ($existing -match $listenPattern) { $Matches[1] } else { "unknown" }
  if (-not $Restart) {
    "Already listening on port $port. PID: $existingPid" |
      Out-File -LiteralPath $launcherLog -Append -Encoding utf8
    exit 0
  }

  "Restart requested. Stopping PID: $existingPid" |
    Out-File -LiteralPath $launcherLog -Append -Encoding utf8
  Stop-Process -Id ([int]$existingPid) -Force
  Start-Sleep -Seconds 2
}

$nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
if ($nodeCommand) {
  $node = $nodeCommand.Source
} elseif (Test-Path -LiteralPath "C:\Program Files\nodejs\node.exe") {
  $node = "C:\Program Files\nodejs\node.exe"
} else {
  "node.exe was not found." | Out-File -LiteralPath $errLog -Append -Encoding utf8
  exit 1
}

$configCheck = Join-Path $projectRoot "scripts\production-config.mjs"
if (-not $env:SKIP_PRODUCTION_CONFIG_CHECK) {
  & $node $configCheck "--role" "pc" "--env-file" ".env"
  if ($LASTEXITCODE -ne 0) {
    "Production config check failed." |
      Out-File -LiteralPath $errLog -Append -Encoding utf8
    exit $LASTEXITCODE
  }
}

$nextCli = "node_modules\next\dist\bin\next"
$nextCliPath = Join-Path $projectRoot $nextCli
if (-not (Test-Path -LiteralPath $nextCliPath)) {
  "Next CLI was not found at $nextCliPath." | Out-File -LiteralPath $errLog -Append -Encoding utf8
  exit 1
}

if (-not (Test-Path -LiteralPath (Join-Path $projectRoot ".next"))) {
  "Production build was not found. Run npm run build first." |
    Out-File -LiteralPath $errLog -Append -Encoding utf8
  exit 1
}

$launcherScript = "scripts\prod-server-launcher.mjs"
$launcherScriptPath = Join-Path $projectRoot $launcherScript
if (-not (Test-Path -LiteralPath $launcherScriptPath)) {
  "Production server launcher was not found at $launcherScriptPath." |
    Out-File -LiteralPath $errLog -Append -Encoding utf8
  exit 1
}

$env:PORT = "$port"
$env:PROD_SERVER_HOSTNAME = $hostname

Start-Process `
  -FilePath $node `
  -ArgumentList @($launcherScript) `
  -WorkingDirectory $projectRoot `
  -RedirectStandardOutput $launcherOutLog `
  -RedirectStandardError $launcherErrLog `
  -WindowStyle Hidden
