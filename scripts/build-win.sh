#!/usr/bin/env bash
set -e

# grab version from package.json
VERSION=$(node -p "require('./package.json').version")
OUT="dist/tenseai-agent-${VERSION}-win.exe"

# ensure dist folder exists
mkdir -p dist

# build
npx pkg index.js --targets node16-win-x64 --output "$OUT"

echo "✅ Windows EXE -> $OUT"
