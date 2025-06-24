<#
.SYNOPSIS
  Build standalone Windows EXE and stage extras into dist/
#>

param()

# 1) locate project root & ensure dist/
$scriptFile  = $MyInvocation.MyCommand.Path
$projectRoot = Resolve-Path (Join-Path (Split-Path $scriptFile -Parent) '..')
Set-Location $projectRoot
$dist = Join-Path $projectRoot 'dist'
if (-not (Test-Path $dist)) { New-Item -Path $dist -ItemType Directory | Out-Null }

# 2) read version
$pkgJson = Get-Content '.\package.json' -Raw | ConvertFrom-Json
$ver     = $pkgJson.version

# 3) build exe
$outExe = Join-Path $dist "tenseai-agent-$ver-win.exe"
Write-Host "Building tenseai-agent v$ver for Windows..."
npx pkg '.\index.js' --targets node16-win-x64 --output $outExe
Write-Host "Built EXE → $outExe"

# 4) copy extras (if you need them alongside the EXE)
$extras = @('.env','.env.example','README.md','sfx-config.txt')
foreach ($f in $extras) {
  if (Test-Path $f) { Copy-Item $f -Destination $dist -Force }
}
