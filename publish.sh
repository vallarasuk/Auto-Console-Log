#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting multi-marketplace publication for Auto Console Log..."

# Load environment variables from .env file if it exists
if [ -f .env ]; then
  echo "📄 Loading environment variables from .env..."
  # Using a more robust way to export variables
  export $(grep -v '^#' .env | xargs)
fi

# Check if tokens are set
if [ -z "$VSCE_TOKEN" ]; then
  echo "❌ Error: VSCE_TOKEN is not set. Please set it in .env or as an environment variable."
  exit 1
fi

if [ -z "$OVSX_TOKEN" ]; then
  echo "❌ Error: OVSX_TOKEN is not set. Please set it in .env or as an environment variable."
  exit 1
fi

# 1. Pre-check: Verify the token before starting the build/publish process
echo "🔍 Verifying VS Code Marketplace token..."
if ! npx vsce verify-pat -p "$VSCE_TOKEN" > /dev/null 2>&1; then
  echo "❌ Error: VSCE_TOKEN is invalid or has EXPIRED (401 Unauthorized)."
  echo "👉 Please update your Personal Access Token (PAT) in the .env file."
  echo "   Generate a new one at: https://dev.azure.com/ (Scopes: Marketplace: Manage)"
  exit 1
fi
echo "✅ Token verified!"

echo "📦 Publishing to VS Code Marketplace..."
npx vsce publish -p "$VSCE_TOKEN"

echo "📦 Publishing to Open VSX..."
npx ovsx publish -p "$OVSX_TOKEN"

echo "✅ Published successfully to both marketplaces!"
