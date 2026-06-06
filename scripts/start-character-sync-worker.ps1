$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$outLog = Join-Path $projectRoot "character-sync-worker.out.log"
$errLog = Join-Path $projectRoot "character-sync-worker.err.log"
$launcherLog = Join-Path $projectRoot "character-sync-worker-launcher.log"

$workerPath = Join-Path $projectRoot "src\worker\character-sync-worker.ts"
$escapedProjectRoot = [regex]::Escape($projectRoot.Path)
$existing = Get-CimInstance Win32_Process -Filter "name = 'node.exe'" |
  Where-Object {
    $_.CommandLine -and
    $_.CommandLine -match $escapedProjectRoot -and
    $_.CommandLine -match "character-sync-worker"
  } |
  Select-Object -First 1

if ($existing) {
  "Already running character sync worker. PID: $($existing.ProcessId)" |
    Out-File -LiteralPath $launcherLog -Append -Encoding utf8
  exit 0
}

if (-not (Test-Path -LiteralPath $workerPath)) {
  "Character sync worker was not found at $workerPath." |
    Out-File -LiteralPath $errLog -Append -Encoding utf8
  exit 1
}

$envFile = Join-Path $projectRoot ".env"
if (Test-Path -LiteralPath $envFile) {
  Get-Content -LiteralPath $envFile |
    ForEach-Object {
      if ($_ -match "^\s*([^#][^=]+)=(.*)$") {
        [Environment]::SetEnvironmentVariable(
          $Matches[1].Trim(),
          $Matches[2].Trim(),
          "Process"
        )
      }
    }
}

$npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $npm) {
  "npm.cmd was not found." | Out-File -LiteralPath $errLog -Append -Encoding utf8
  exit 1
}

Start-Process `
  -FilePath $npm.Source `
  -ArgumentList @("run", "worker:characters") `
  -WorkingDirectory $projectRoot `
  -RedirectStandardOutput $outLog `
  -RedirectStandardError $errLog `
  -WindowStyle Hidden
