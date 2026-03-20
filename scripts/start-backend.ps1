# Backend-Only Launcher
# Starts just the .NET backend API on localhost:3100

$BackendPath = "C:\CoPilot\TpDataSync\TpManageSync\server-dotnet\TpManageSync.Api"

Write-Host "Starting TP Manage Sync Backend..." -ForegroundColor Green
Write-Host "Path: $BackendPath" -ForegroundColor Yellow
Write-Host ""

if (-not (Test-Path $BackendPath)) {
    Write-Error "Backend path not found: $BackendPath"
}

cd $BackendPath
dotnet run
