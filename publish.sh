#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting multi-marketplace publication for Auto Console Log..."

# Load environment variables from .env file if it exists
if [ -f .env ]; then
  echo "📄 Loading environment variables from .env..."
  export $(cat .env | grep -v '^#' | xargs)
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

echo "📦 Publishing to VS Code Marketplace..."
npx vsce publish -p $VSCE_TOKEN

echo "📦 Publishing to Open VSX..."
npx ovsx publish -p $OVSX_TOKEN

echo "✅ Published successfully to both marketplaces!"
