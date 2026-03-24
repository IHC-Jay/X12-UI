param(
  [Parameter(Mandatory=$true)]
  [string]$TargetPath,

  [string]$SourcePath = "dist/RCO/browser"
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path $SourcePath)) {
  throw "SourcePath not found: $SourcePath"
}

Write-Host "Deploying RCO build"
Write-Host "Source: $SourcePath"
Write-Host "Target: $TargetPath"

if (-not (Test-Path $TargetPath)) {
  New-Item -ItemType Directory -Path $TargetPath -Force | Out-Null
}

# Mirror source to target (preserves subfolder structure such as assets/)
robocopy $SourcePath $TargetPath /E /PURGE /NFL /NDL /NJH /NJS | Out-Null

# Copy index.RCO.html to index.html so IIS can find the default document
Copy-Item -Path "$TargetPath\index.RCO.html" -Destination "$TargetPath\index.html" -Force

Write-Host "Deployment complete."
Write-Host "Verify these files exist in target root:"
Write-Host " - index.html"
Write-Host " - index.RCO.html"
Write-Host " - main-*.js"
Write-Host " - polyfills-*.js"
Write-Host " - styles-*.css"
Write-Host " - web.config"
Write-Host " - assets/"
