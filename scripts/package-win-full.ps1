$ErrorActionPreference = "Stop"

Write-Host "1) Building EXE…"
& .\scripts\build-win.ps1

$ver = "1.0.0"
$distDir = "dist"
$outZip = "$distDir\tenseai-agent-$ver-win-full.zip"

Write-Host "2) Zipping entire project → $outZip"

if (Test-Path $outZip) {
  Remove-Item $outZip -Force
}

Compress-Archive -Path @(
  "index.js",
  ".env",
  "package.json",
  "node_modules",
  "services",
  "worker",
  "$distDir\tenseai-agent-$ver-win.exe"
) -DestinationPath $outZip

Write-Host "`n✅ Full-package created: $outZip"
Write-Host "   Contents:"
Get-ChildItem "$distDir" -Filter "*$ver*.zip" | ForEach-Object { Write-Host "   - $($_.Name)" }
