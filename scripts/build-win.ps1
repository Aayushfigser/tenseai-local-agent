<#
.SYNOPSIS
  Build a standalone Windows EXE of tenseai-agent using pkg.
#>

param()

# Resolve project root
$scriptFile  = $MyInvocation.MyCommand.Path
$projectRoot = Resolve-Path (Join-Path (Split-Path $scriptFile -Parent) '..')

# Switch into project root
Set-Location $projectRoot

# Read version
$pkgJson = Get-Content '.\package.json' -Raw | ConvertFrom-Json
$ver     = $pkgJson.version

# Ensure dist/ exists
$dist = Join-Path $projectRoot 'dist'
if (-not (Test-Path $dist)) {
    New-Item -Path $dist -ItemType Directory | Out-Null
}

# Build
$out = Join-Path $dist "tenseai-agent-$ver-win.exe"
Write-Host "⏳ Building tenseai-agent v$ver for Windows…"

npx pkg '.\index.js' `
  --targets node16-win-x64 `
  --output $out

Write-Host "✅ Built Windows EXE → $out"
