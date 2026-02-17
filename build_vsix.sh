#!/bin/bash

# Ensure vsce is available (using npx to avoid global install requirement)
if ! command -v npx &> /dev/null; then
    echo "❌ Error: npx is not installed. Please install Node.js and npm."
    exit 1
fi

echo "🚀 Building VSIX package for Auto Console Log..."

# Run vsce package using npx
npx vsce package

if [ $? -eq 0 ]; then
    echo "✅ VSIX package created successfully!"
    ls -lh *.vsix
else
    echo "❌ Failed to create VSIX package."
    exit 1
fi
