param(
  [Parameter(Mandatory=$true)]
  [string]$TargetPath,

  [string]$SourcePath = "dist/SH/browser"
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path $SourcePath)) {
  throw "SourcePath not found: $SourcePath"
}

Write-Host "Deploying SH build"
Write-Host "Source: $SourcePath"
Write-Host "Target: $TargetPath"

if (-not (Test-Path $TargetPath)) {
  New-Item -ItemType Directory -Path $TargetPath -Force | Out-Null
}

# Remove existing deployed files/folders
Get-ChildItem -Path $TargetPath -Force | Remove-Item -Recurse -Force

# Copy ONLY browser output contents
Copy-Item -Path (Join-Path $SourcePath '*') -Destination $TargetPath -Recurse -Force

Write-Host "Deployment complete."
Write-Host "Verify these files exist in target root:"
Write-Host " - index.html"
Write-Host " - main-*.js"
Write-Host " - polyfills-*.js"
Write-Host " - styles-*.css"
Write-Host " - web.config"
Write-Host " - assets/"
