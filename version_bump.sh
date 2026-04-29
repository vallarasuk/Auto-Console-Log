#!/bin/bash

# Exit on error
set -e

# 1. Get the last version in the package.json
current_version=$(jq -r .version package.json)
echo "🔍 Current version in package.json: $current_version"

# 2. Increase the version of the extension
# Default to 'patch' if no argument is provided (e.g., patch, minor, major)
version_type=${1:-patch}
echo "📈 Incrementing version ($version_type)..."

# Use npm version to update package.json without creating a git tag/commit yet
new_version_v=$(npm version "$version_type" --no-git-tag-version)
new_version=${new_version_v#v} # Remove 'v' prefix if present

echo "✅ New version set to: $new_version"

# 3. Make the branch into that version number
branch_name="v$new_version"
echo "🌿 Creating and switching to branch: $branch_name"

# Check if branch already exists
if git show-ref --verify --quiet "refs/heads/$branch_name"; then
    echo "⚠️ Branch $branch_name already exists. Switching to it..."
    git checkout "$branch_name"
else
    git checkout -b "$branch_name"
fi

# 4. Commit the version bump
echo "💾 Committing version changes..."
git add package.json package-lock.json
git commit -m "chore: bump version to $new_version"

echo "✨ Done! You are now on branch $branch_name with version $new_version"
echo "🚀 Run ./publish.sh when you're ready to release."
