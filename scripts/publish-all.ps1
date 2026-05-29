param(
  [ValidateSet("development", "production")]
  [string]$Configuration = "production",

  [ValidateSet("SH", "RCO", "Both")]
  [string]$Profile = "Both",

  [string]$ShTargetPath = "C:\inetpub\SH\browser",
  [string]$RcoTargetPath = "C:\inetpub\RCO\browser"
)

$ErrorActionPreference = 'Stop'

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "X12 UI Publish All (SH + RCO)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Configuration: $Configuration" -ForegroundColor Yellow
Write-Host "Profile: $Profile" -ForegroundColor Yellow
Write-Host "SH target: $ShTargetPath" -ForegroundColor Yellow
Write-Host "RCO target: $RcoTargetPath" -ForegroundColor Yellow
Write-Host ""

if ($Profile -in @("SH", "Both")) {
  Write-Host "Building SH..." -ForegroundColor Green
  ng build SH --configuration $Configuration
  if ($LASTEXITCODE -ne 0) {
    throw "SH build failed with exit code $LASTEXITCODE"
  }

  Write-Host "Deploying SH..." -ForegroundColor Green
  . "$PSScriptRoot\deploy-sh-iis.ps1" -TargetPath $ShTargetPath
}

if ($Profile -in @("RCO", "Both")) {
  Write-Host "Building RCO..." -ForegroundColor Green
  ng build RCO --configuration $Configuration
  if ($LASTEXITCODE -ne 0) {
    throw "RCO build failed with exit code $LASTEXITCODE"
  }

  Write-Host "Deploying RCO..." -ForegroundColor Green
  . "$PSScriptRoot\deploy-rco-iis.ps1" -TargetPath $RcoTargetPath
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Publish complete." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SH:  http://lpv-itfwin12:8080/" -ForegroundColor Yellow
Write-Host "RCO: http://lpv-itfwin12:8082/" -ForegroundColor Yellow
