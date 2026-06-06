param(
  [int]$Port = 3001
)

$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$serverScript = Join-Path $projectRoot "scripts\start-prod-server.ps1"
$taskName = "LostArk Party Planner Server"
$taskLog = Join-Path $projectRoot "scheduled-task.log"

$action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -Command `"`$env:PORT='$Port'; & '$serverScript'`""

$trigger = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -MultipleInstances IgnoreNew `
  -RestartCount 3 `
  -RestartInterval (New-TimeSpan -Minutes 1)

Register-ScheduledTask `
  -TaskName $taskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -User "SYSTEM" `
  -RunLevel Highest `
  -Force |
  Format-List * |
  Out-File -LiteralPath $taskLog -Encoding utf8

Get-ScheduledTask -TaskName $taskName |
  Format-List TaskName,State,TaskPath |
  Out-File -LiteralPath $taskLog -Append -Encoding utf8
