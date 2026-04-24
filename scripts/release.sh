#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   make release                    # patch bump (0.1.0 -> 0.1.1)
#   make release VERSION=0.2.0      # explicit version
#   make release BUMP=minor         # minor bump
#   make release BUMP=major         # major bump

BUMP="${BUMP:-patch}"
EXPLICIT_VERSION="${VERSION:-}"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"

if [ "$BRANCH" != "master" ] && [ "$BRANCH" != "main" ]; then
	echo "error: release must be cut from master/main (current: $BRANCH)" >&2
	exit 1
fi

if ! git diff-index --quiet HEAD --; then
	echo "error: working tree has uncommitted changes" >&2
	git status --short >&2
	exit 1
fi

git fetch --tags

CURRENT_VERSION="$(node -p "require('./package.json').version")"

if [ -n "$EXPLICIT_VERSION" ]; then
	NEW_VERSION="$EXPLICIT_VERSION"
else
	# Parse semver and bump.
	IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"
	case "$BUMP" in
		major) NEW_VERSION="$((MAJOR + 1)).0.0" ;;
		minor) NEW_VERSION="$MAJOR.$((MINOR + 1)).0" ;;
		patch) NEW_VERSION="$MAJOR.$MINOR.$((PATCH + 1))" ;;
		*) echo "error: BUMP must be major|minor|patch (got: $BUMP)" >&2; exit 1 ;;
	esac
fi

TAG="v$NEW_VERSION"

if git rev-parse "$TAG" >/dev/null 2>&1; then
	echo "error: tag $TAG already exists" >&2
	exit 1
fi

echo "Current version: $CURRENT_VERSION"
echo "New version:     $NEW_VERSION"
echo "Tag:             $TAG"
echo ""
read -r -p "Proceed? [y/N] " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
	echo "aborted"
	exit 1
fi

# Bump package.json in-place.
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.version = '$NEW_VERSION';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, '\t') + '\n');
"

git add package.json
git commit -m "chore: release $TAG"
git tag -a "$TAG" -m "Release $TAG"
git push origin "$BRANCH"
git push origin "$TAG"

echo ""
echo "Pushed $TAG. GitHub Actions will build + publish the release shortly."
echo "Track it at: https://github.com/\$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo '<org>/<repo>')/actions"
