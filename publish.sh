#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting multi-marketplace publication for Auto Console Log..."

# VS Code Marketplace Token
VSCE_TOKEN="MIucUfA2jNltKKp0wvxur2aURn3NqsFyAM0kDOusEWwSr0ZeOphRJQQJ99CBACAAAAAAAAAAAAAGAZDOIDZF"

# Open VSX Token
OVSX_TOKEN="ovsxat_03cfdab2-17a1-4e19-8745-152a5eb2e1ae"

echo "📦 Publishing to VS Code Marketplace..."
npx vsce publish -p $VSCE_TOKEN

echo "📦 Publishing to Open VSX..."
npx ovsx publish -p $OVSX_TOKEN

echo "✅ Published successfully to both marketplaces!"
