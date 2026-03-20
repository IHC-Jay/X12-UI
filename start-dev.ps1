# TP Manage Sync Development Launcher
# This script starts both the .NET backend and Angular frontend from the X12-UI project
# Run this from the X12-UI directory

param(
    [switch]$BackendOnly,
    [switch]$FrontendOnly
)

$ErrorActionPreference = "Stop"

$X12UIPath = Get-Location
$BackendPath = "C:\CoPilot\TpDataSync\TpManageSync\server-dotnet\TpManageSync.Api"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TP Manage Sync - Development Launcher" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if (-not $FrontendOnly) {
    Write-Host "Starting .NET Backend..." -ForegroundColor Green
    Write-Host "Backend Path: $BackendPath" -ForegroundColor Yellow
    Write-Host ""
    
    if (-not (Test-Path $BackendPath)) {
        Write-Error "Backend path not found: $BackendPath"
    }
    
    # Start backend in a new PowerShell window
    $backendCmd = "cd '$BackendPath'; dotnet run"
    Start-Process -FilePath powershell -ArgumentList "-NoExit", "-Command", $backendCmd -WindowStyle Normal
    
    Write-Host "✓ Backend started in new window" -ForegroundColor Green
    Write-Host "  Waiting for: 'Now listening on: http://localhost:3100'" -ForegroundColor Yellow
    Start-Sleep -Seconds 3
}

if (-not $BackendOnly) {
    Write-Host ""
    Write-Host "Starting Angular Frontend..." -ForegroundColor Green
    Write-Host "Frontend Path: $X12UIPath" -ForegroundColor Yellow
    Write-Host ""
    
    # Start frontend in a new PowerShell window
    $frontendCmd = "cd '$X12UIPath'; ng serve"
    Start-Process -FilePath powershell -ArgumentList "-NoExit", "-Command", $frontendCmd -WindowStyle Normal
    
    Write-Host "✓ Frontend started in new window" -ForegroundColor Green
    Write-Host "  Waiting for: 'Compiled successfully'" -ForegroundColor Yellow
    Start-Sleep -Seconds 3
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Both services should be starting..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if (-not $BackendOnly -and -not $FrontendOnly) {
    Write-Host "Next: Open browser to http://localhost:4200" -ForegroundColor Yellow
    Write-Host ""
    Start-Sleep -Seconds 2
    Start-Process "http://localhost:4200"
}
elseif ($FrontendOnly) {
    Write-Host "Frontend only mode - Backend must be running separately" -ForegroundColor Yellow
    Start-Sleep -Seconds 2
    Start-Process "http://localhost:4200"
}
elseif ($BackendOnly) {
    Write-Host "Backend only mode - Frontend will need to be started separately" -ForegroundColor Yellow
}
