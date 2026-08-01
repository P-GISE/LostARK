param(
  [int]$Port = 3001,
  [string]$CloudflaredPath = "D:\tmp\cloudflared.exe",
  [string]$CloudflaredConfig = "D:\tmp\lostark-cloudflared\lostark-party-pc.yml",
  [string[]]$PublicHealthUrls = @(
    "https://lostark-party.pigs0516.com/",
    "https://pigs0516.com/",
    "https://www.pigs0516.com/",
    "https://pc.pigs0516.com/"
  ),
  [string[]]$RequiredTunnelHostnames = @(
    "lostark-party.pigs0516.com",
    "pigs0516.com",
    "www.pigs0516.com",
    "pc.pigs0516.com"
  ),
  [int]$OriginHealthTimeoutSeconds = 120,
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

function Test-LocalOrigin {
  param([int]$OriginPort)

  $url = "http://127.0.0.1:$OriginPort/"
  $statusCode = & curl.exe -L -sS -o NUL -w "%{http_code}" -I --connect-timeout 3 --max-time 8 $url
  return ($LASTEXITCODE -eq 0) -and ($statusCode -match "^[23]\d\d$")
}

function Test-TunnelRoute {
  param(
    [string]$ConfigContent,
    [string]$Hostname,
    [int]$OriginPort
  )

  $escapedHostname = [regex]::Escape($Hostname)
  $routePattern = "hostname:\s+$escapedHostname\s*\r?\n\s*service:\s+http://127\.0\.0\.1:$OriginPort\b"
  return $ConfigContent -match $routePattern
}

function Wait-LocalOrigin {
  param(
    [int]$OriginPort,
    [int]$TimeoutSeconds
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-LocalOrigin -OriginPort $OriginPort) {
      return $true
    }

    Start-Sleep -Seconds 3
  }

  return $false
}

Write-LauncherLog "Starting PC production app on port $Port."
$env:PORT = "$Port"
if ($RestartApp) {
  & $serverScript -Restart
} else {
  & $serverScript
}

if (-not (Wait-LocalOrigin -OriginPort $Port -TimeoutSeconds $OriginHealthTimeoutSeconds)) {
  Write-LauncherLog "Local origin http://127.0.0.1:$Port/ did not become healthy before timeout."
  exit 1
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

$configContent = Get-Content -LiteralPath $CloudflaredConfig -Raw
foreach ($requiredHostname in $RequiredTunnelHostnames) {
  if (-not (Test-TunnelRoute -ConfigContent $configContent -Hostname $requiredHostname -OriginPort $Port)) {
    Write-LauncherLog "Cloudflare tunnel config does not route $requiredHostname to http://127.0.0.1:$Port."
    exit 1
  }
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
