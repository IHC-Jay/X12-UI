# Integrated Build Script for TP Manage Sync
# This script builds X12-UI Angular app and deploys it to the .NET backend's wwwroot

param(
    [ValidateSet("development", "production")]
    [string]$Configuration = "production"
)

$ErrorActionPreference = "Stop"

$AngularProjectPath = Get-Location
$DotNetProjectPath = "C:\CoPilot\TpDataSync\TpManageSync\server-dotnet\TpManageSync.Api"
$wwwrootPath = "$DotNetProjectPath\wwwroot"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TP Manage Sync - Integrated Build" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Configuration: $Configuration" -ForegroundColor Yellow
Write-Host "Angular Project: $AngularProjectPath" -ForegroundColor Yellow
Write-Host ".NET Project: $DotNetProjectPath" -ForegroundColor Yellow
Write-Host "wwwroot Path: $wwwrootPath" -ForegroundColor Yellow
Write-Host ""

# Step 1: Clean existing wwwroot
Write-Host "Step 1: Cleaning wwwroot..." -ForegroundColor Green
if (Test-Path $wwwrootPath) {
    Remove-Item $wwwrootPath -Recurse -Force
    Write-Host "✓ Cleaned $wwwrootPath" -ForegroundColor Green
}

# Step 2: Build Angular app
Write-Host ""
Write-Host "Step 2: Building Angular app..." -ForegroundColor Green

if ($Configuration -eq "production") {
    $buildCmd = "ng build --configuration production"
} else {
    $buildCmd = "ng build"
}

Write-Host "Running: $buildCmd"
Invoke-Expression $buildCmd

if ($LASTEXITCODE -ne 0) {
    Write-Error "Angular build failed with exit code $LASTEXITCODE"
}
Write-Host "✓ Angular build completed" -ForegroundColor Green

# Step 3: Copy built files to wwwroot
Write-Host ""
Write-Host "Step 3: Copying Angular output to wwwroot..." -ForegroundColor Green

$distPath = "$AngularProjectPath\dist\RCO"
if (-not (Test-Path $distPath)) {
    Write-Error "Angular dist folder not found at $distPath"
}

# Create wwwroot if it doesn't exist
New-Item -Path $wwwrootPath -ItemType Directory -Force | Out-Null

# Copy all files from dist to wwwroot, excluding dist folder structure
Copy-Item -Path "$distPath\*" -Destination $wwwrootPath -Recurse -Force
Write-Host "✓ Copied Angular files to $wwwrootPath" -ForegroundColor Green

# Step 4: Verify index.html exists
if (Test-Path "$wwwrootPath\index.html") {
    Write-Host "✓ index.html found in wwwroot" -ForegroundColor Green
} else {
    Write-Error "index.html not found in wwwroot after copy"
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Build Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Run the .NET backend:"
Write-Host "   cd '$DotNetProjectPath'"
Write-Host "   dotnet run"
Write-Host ""
Write-Host "2. Access the app at http://localhost:3100"
Write-Host ""
