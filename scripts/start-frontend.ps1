# Frontend-Only Launcher
# Starts Angular frontend with live reload on localhost:4200
# Assumes backend is already running on localhost:3100

param(
	[ValidateSet("SH", "RCO")]
	[string]$Profile = "SH"
)

Write-Host "Starting X12-UI Frontend..." -ForegroundColor Green
Write-Host "Access at: http://localhost:4200" -ForegroundColor Yellow
Write-Host "Angular Profile: $Profile" -ForegroundColor Yellow
Write-Host ""
Write-Host "Note: Backend must be running on localhost:3100" -ForegroundColor Cyan
Write-Host ""

npx ng serve $Profile
