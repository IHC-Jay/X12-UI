# Integrated Build Script for TP Manage Sync
# Builds SH or RCO Angular app and deploys to the local .NET backend wwwroot

param(
    [ValidateSet("SH", "RCO")]
    [string]$Profile = "SH",

    [ValidateSet("development", "production")]
    [string]$Configuration = "production",

    [string]$DotNetProjectPath = ""
)

$ErrorActionPreference = "Stop"

$AngularProjectPath = Get-Location
$repoRoot = $AngularProjectPath.Path

if ([string]::IsNullOrWhiteSpace($DotNetProjectPath)) {
    $backendCandidate = Join-Path $repoRoot "src\backend"
    $legacyBackendCandidate = Join-Path $repoRoot "backend"
    $serverCandidate = Join-Path $repoRoot "server"

    if (Test-Path $backendCandidate) {
        $DotNetProjectPath = $backendCandidate
    }
    elseif (Test-Path $legacyBackendCandidate) {
        $DotNetProjectPath = $legacyBackendCandidate
    }
    elseif (Test-Path $serverCandidate) {
        $DotNetProjectPath = $serverCandidate
    }
    else {
        Write-Error "No backend folder found. Expected '$backendCandidate', '$legacyBackendCandidate', or '$serverCandidate'."
    }
}

$wwwrootPath = Join-Path $DotNetProjectPath "wwwroot"
$distPath = Join-Path $AngularProjectPath "dist\$Profile\browser"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TP Manage Sync - Integrated Build" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Profile: $Profile" -ForegroundColor Yellow
Write-Host "Configuration: $Configuration" -ForegroundColor Yellow
Write-Host "Angular Project: $AngularProjectPath" -ForegroundColor Yellow
Write-Host ".NET Project: $DotNetProjectPath" -ForegroundColor Yellow
Write-Host "wwwroot Path: $wwwrootPath" -ForegroundColor Yellow
Write-Host ""

if (-not (Test-Path $DotNetProjectPath)) {
    Write-Error ".NET project path not found: $DotNetProjectPath"
}

# Step 1: Clean existing wwwroot
Write-Host "Step 1: Cleaning wwwroot..." -ForegroundColor Green
if (Test-Path $wwwrootPath) {
    Remove-Item $wwwrootPath -Recurse -Force
    Write-Host "✓ Cleaned $wwwrootPath" -ForegroundColor Green
}

# Step 2: Build Angular app
Write-Host ""
Write-Host "Step 2: Building Angular app ($Profile)..." -ForegroundColor Green

$buildCmd = "ng build $Profile --configuration $Configuration"
Write-Host "Running: $buildCmd"
Invoke-Expression $buildCmd

if ($LASTEXITCODE -ne 0) {
    Write-Error "Angular build failed with exit code $LASTEXITCODE"
}
Write-Host "✓ Angular build completed" -ForegroundColor Green

# Step 3: Copy built files to wwwroot
Write-Host ""
Write-Host "Step 3: Copying Angular output to wwwroot..." -ForegroundColor Green

if (-not (Test-Path $distPath)) {
    Write-Error "Angular dist folder not found at $distPath"
}

New-Item -Path $wwwrootPath -ItemType Directory -Force | Out-Null
Copy-Item -Path "$distPath\*" -Destination $wwwrootPath -Recurse -Force

if ($Profile -eq "RCO" -and (Test-Path "$wwwrootPath\index.RCO.html")) {
    Copy-Item -Path "$wwwrootPath\index.RCO.html" -Destination "$wwwrootPath\index.html" -Force
}

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
