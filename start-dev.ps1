# TP Manage Sync Development Launcher
# This script starts both the .NET backend and Angular frontend from the X12-UI project
# Run this from the X12-UI directory

param(
    [ValidateSet("SH", "RCO")]
    [string]$Profile = "SH",
    [switch]$BackendOnly,
    [switch]$FrontendOnly
)

$ErrorActionPreference = "Stop"

$X12UIPath = Get-Location
$BackendPath = Join-Path $X12UIPath "server"

function Wait-ForHttpReady {
    param(
        [Parameter(Mandatory = $true)][string]$Url,
        [int]$TimeoutSeconds = 90
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        try {
            $response = Invoke-WebRequest -Uri $Url -Method Get -UseBasicParsing -TimeoutSec 3
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
                return $true
            }
        } catch {
            Start-Sleep -Seconds 1
        }
    }

    return $false
}

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
    $backendCmd = "Set-Location '$BackendPath'; dotnet run"
    Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", $backendCmd -WindowStyle Normal

    Write-Host "[OK] Backend started in new window" -ForegroundColor Green
    Write-Host "  Waiting for: 'Now listening on: http://localhost:3100'" -ForegroundColor Yellow
    Start-Sleep -Seconds 3
}

if (-not $BackendOnly) {
    Write-Host ""
    Write-Host "Starting Angular Frontend..." -ForegroundColor Green
    Write-Host "Frontend Path: $X12UIPath" -ForegroundColor Yellow
    Write-Host "Angular Profile: $Profile" -ForegroundColor Yellow
    Write-Host ""

    # Start frontend in a new PowerShell window
    $frontendCmd = "Set-Location '$X12UIPath'; npx ng serve $Profile"
    Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", $frontendCmd -WindowStyle Normal

    Write-Host "[OK] Frontend started in new window" -ForegroundColor Green
    Write-Host "  Waiting for frontend readiness at http://localhost:4200 ..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Both services should be starting..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if (-not $BackendOnly -and -not $FrontendOnly) {
    Write-Host "Next: Open browser to http://localhost:4200" -ForegroundColor Yellow
    Write-Host ""
    if (Wait-ForHttpReady -Url "http://localhost:4200" -TimeoutSeconds 120) {
        Write-Host "[OK] Frontend is ready. Opening browser." -ForegroundColor Green
        Start-Process "http://localhost:4200"
    } else {
        Write-Host "Frontend did not become ready in time. Check the frontend window for errors." -ForegroundColor Red
    }
}
elseif ($FrontendOnly) {
    Write-Host "Frontend only mode - Backend must be running separately" -ForegroundColor Yellow
    if (Wait-ForHttpReady -Url "http://localhost:4200" -TimeoutSeconds 120) {
        Write-Host "[OK] Frontend is ready. Opening browser." -ForegroundColor Green
        Start-Process "http://localhost:4200"
    } else {
        Write-Host "Frontend did not become ready in time. Check the frontend window for errors." -ForegroundColor Red
    }
}
elseif ($BackendOnly) {
    Write-Host "Backend only mode - Frontend will need to be started separately" -ForegroundColor Yellow
}
