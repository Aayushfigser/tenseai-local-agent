#!/bin/bash
set -e

version=$(node -p "require('./package.json').version")
dist="dist"
out="$dist/tenseai-agent-$version-mac"

mkdir -p "$dist"

# Build the mac binary (macOS system only)
npx pkg index.js --targets node16-macos-x64 --output "$out"

# Create a ZIP
zip -j "$out.zip" "$out"

echo "✅ macOS ZIP created: $out.zip"
