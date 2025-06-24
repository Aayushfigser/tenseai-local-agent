<#
.SYNOPSIS
  After building, ZIP the **entire** project folder (all files/folders)
  so the EXE runs with everything next to it.
#>

param()

# 1) Ensure EXE is built
Write-Host "1) Building EXE…"
.\build-win.ps1

# 2) Read version
$pkgJson    = Get-Content '..\package.json' -Raw | ConvertFrom-Json
$ver        = $pkgJson.version

# 3) Create dist/ if missing
$projectRoot = Resolve-Path (Join-Path $MyInvocation.MyCommand.Path '..')
$dist        = Join-Path $projectRoot 'dist'
if (-not (Test-Path $dist)) { New-Item -Path $dist -ItemType Directory | Out-Null }

# 4) ZIP full project
$fullZip = "tenseai-agent-$ver-win-full.zip"
Write-Host "2) Zipping entire project → dist\$fullZip"
# -Path "..\*" grabs everything in project root (excluding dist/)
Compress-Archive -Path "..\*" -DestinationPath (Join-Path $dist $fullZip) -Force

Write-Host "✅ Full-package created: $fullZip"
