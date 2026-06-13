param(
  [int]$Port = 3001,
  [string]$CloudflaredPath = "D:\tmp\cloudflared.exe",
  [string]$CloudflaredConfig = "D:\tmp\lostark-cloudflared\lostark-party-pc.yml",
  [string[]]$PublicHealthUrls = @(
    "https://lostark-party.pigs0516.com/",
    "https://pc.pigs0516.com/"
  ),
  [switch]$RestartApp,
  [switch]$SkipTunnel
)

$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$serverScript = Join-Path $projectRoot "scripts\start-prod-server.ps1"
$tunnelPidFile = Join-Path $projectRoot "pc-cloudflared.pid"
$launcherLog = Join-Path $projectRoot "pc-production-launcher.log"

function Write-LauncherLog {
  param([string]$Message)

  $timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ssK"
  "[$timestamp] $Message" | Out-File -LiteralPath $launcherLog -Append -Encoding utf8
}

function Test-PublicUrl {
  param([string]$Url)

  $statusCode = & curl.exe -L -sS -o NUL -w "%{http_code}" -I --connect-timeout 5 --max-time 15 $Url
  return ($LASTEXITCODE -eq 0) -and ($statusCode -match "^[23]\d\d$")
}

Write-LauncherLog "Starting PC production app on port $Port."
$env:PORT = "$Port"
if ($RestartApp) {
  & $serverScript -Restart
} else {
  & $serverScript
}

if ($SkipTunnel) {
  Write-LauncherLog "Skipping Cloudflare tunnel startup."
  exit 0
}

if (-not (Test-Path -LiteralPath $CloudflaredPath)) {
  Write-LauncherLog "cloudflared.exe was not found at $CloudflaredPath."
  exit 1
}

if (-not (Test-Path -LiteralPath $CloudflaredConfig)) {
  Write-LauncherLog "Cloudflare tunnel config was not found at $CloudflaredConfig."
  exit 1
}

$existingTunnels = Get-Process -Name cloudflared -ErrorAction SilentlyContinue |
  Where-Object { $_.Path -eq $CloudflaredPath }

foreach ($existingTunnel in $existingTunnels) {
  Write-LauncherLog "Stopping existing cloudflared PID $($existingTunnel.Id)."
  Stop-Process -Id $existingTunnel.Id -Force -ErrorAction SilentlyContinue
}

Start-Sleep -Seconds 1

Write-LauncherLog "Starting Cloudflare connector with $CloudflaredConfig."
$tunnelProcess = Start-Process `
  -FilePath $CloudflaredPath `
  -ArgumentList @("tunnel", "--config", $CloudflaredConfig, "run") `
  -WorkingDirectory (Split-Path -Parent $CloudflaredConfig) `
  -WindowStyle Hidden `
  -PassThru

"$($tunnelProcess.Id)" | Out-File -LiteralPath $tunnelPidFile -Encoding ascii

foreach ($attempt in 1..24) {
  $tunnelProcess.Refresh()
  if ($tunnelProcess.HasExited) {
    Write-LauncherLog "cloudflared exited early with code $($tunnelProcess.ExitCode)."
    exit 1
  }

  $allPublicUrlsHealthy = $true
  foreach ($url in $PublicHealthUrls) {
    if (-not (Test-PublicUrl -Url $url)) {
      $allPublicUrlsHealthy = $false
      break
    }
  }

  if ($allPublicUrlsHealthy) {
    Write-LauncherLog "Cloudflare tunnel is serving public URLs."
    exit 0
  }

  if ($attempt -lt 24) {
    Start-Sleep -Seconds 5
  }
}

Write-LauncherLog "Cloudflare tunnel did not serve public URLs before timeout."
Stop-Process -Id $tunnelProcess.Id -Force -ErrorAction SilentlyContinue
exit 1
