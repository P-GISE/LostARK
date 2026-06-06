param(
  [int]$Port = 3001
)

$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$serverScript = Join-Path $projectRoot "scripts\start-prod-server.ps1"
$taskName = "LostArk Party Planner Server"
$taskLog = Join-Path $projectRoot "scheduled-task-action.log"
$errorLog = Join-Path $projectRoot "scheduled-task-action.err.log"
$argument = "-NoProfile -ExecutionPolicy Bypass -Command `"`$env:PORT='$Port'; & '$serverScript'`""

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
