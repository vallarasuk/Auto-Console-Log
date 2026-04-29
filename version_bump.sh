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

# 3. Create and switch to version branch
branch_name="v$new_version"
echo "🌿 Creating branch: $branch_name"

# Ensure we are starting from main and it's up to date
git checkout main
git pull origin main

# Check if branch already exists
if git show-ref --verify --quiet "refs/heads/$branch_name"; then
    echo "⚠️ Branch $branch_name already exists. Deleting local branch to recreate..."
    git branch -D "$branch_name"
fi

git checkout -b "$branch_name"

# 4. Commit the version bump
echo "💾 Committing version changes..."
git add package.json package-lock.json
git commit -m "chore: bump version to $new_version"

# 5. Merge back to main
echo "🔄 Merging $branch_name back to main..."
git checkout main
git merge "$branch_name"

# 6. Push to origin
echo "⬆️ Pushing changes to origin main..."
git push origin main

# Optional: Get last version from package.json as confirmation
final_version=$(jq -r .version package.json)
echo "✨ Success! Version updated to $final_version, merged, and pushed to main."
echo "🚀 You can now run ./publish.sh to release."
