param(
  [int]$Port = 3001
)

$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$pcLauncherScript = Join-Path $projectRoot "scripts\start-pc-production.ps1"
$taskName = "LostArk Party Planner Server"
$taskLog = Join-Path $projectRoot "scheduled-task-action.log"
$errorLog = Join-Path $projectRoot "scheduled-task-action.err.log"
$argument = "-NoProfile -ExecutionPolicy Bypass -File `"$pcLauncherScript`" -Port $Port"

try {
  "Updating $taskName to port $Port" |
    Out-File -LiteralPath $taskLog -Encoding utf8

  $action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument $argument

  Set-ScheduledTask -TaskName $taskName -Action $action | Out-Null

  (Get-ScheduledTask -TaskName $taskName).Actions |
    Format-List Execute,Arguments |
    Out-File -LiteralPath $taskLog -Append -Encoding utf8
} catch {
  $_ |
    Format-List * -Force |
    Out-File -LiteralPath $errorLog -Encoding utf8
  throw
}
