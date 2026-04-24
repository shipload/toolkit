#!/usr/bin/env bash
# Full release pipeline: preflight → bump → build → sign → notarize → commit → tag → push → publish.
#
# Usage:
#   make release                    # patch bump (x.y.z -> x.y.(z+1))
#   make release BUMP=minor         # minor bump
#   make release BUMP=major         # major bump
#   make release VERSION=1.2.3      # explicit version

set -euo pipefail

BUMP="${BUMP:-patch}"
EXPLICIT_VERSION="${VERSION:-}"
DIST="dist"

die()  { echo "error: $*" >&2; exit 1; }
info() { echo "▸ $*"; }

# Load SIGNING_IDENTITY / NOTARY_PROFILE from Makefile.local if present.
# Parses "KEY := value" with any whitespace (space or tab) around :=.
if [ -f Makefile.local ]; then
	export SIGNING_IDENTITY="$(awk -F':=[[:space:]]*' '/^[[:space:]]*SIGNING_IDENTITY[[:space:]]*:=/ {sub(/[[:space:]]*$/,"",$2); print $2}' Makefile.local)"
	export NOTARY_PROFILE="$(awk -F':=[[:space:]]*' '/^[[:space:]]*NOTARY_PROFILE[[:space:]]*:=/ {sub(/[[:space:]]*$/,"",$2); print $2}' Makefile.local)"
fi

# --- Compute new version -----------------------------------------------------
CURRENT_VERSION="$(node -p "require('./package.json').version")"
if [ -n "$EXPLICIT_VERSION" ]; then
	NEW_VERSION="$EXPLICIT_VERSION"
else
	IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"
	case "$BUMP" in
		major) NEW_VERSION="$((MAJOR + 1)).0.0" ;;
		minor) NEW_VERSION="$MAJOR.$((MINOR + 1)).0" ;;
		patch) NEW_VERSION="$MAJOR.$MINOR.$((PATCH + 1))" ;;
		*) die "BUMP must be major|minor|patch (got: $BUMP)" ;;
	esac
fi
TAG="v$NEW_VERSION"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"

# --- Preflight ---------------------------------------------------------------
./scripts/preflight.sh "$TAG"

echo ""
echo "  Current version: $CURRENT_VERSION"
echo "  New version:     $NEW_VERSION"
echo "  Tag:             $TAG"
echo ""
read -r -p "Proceed? [y/N] " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
	echo "aborted"
	exit 1
fi

# --- Rollback state ----------------------------------------------------------
COMMIT_MADE=0
TAG_MADE=0

rollback() {
	local ec=$?
	if [ "$ec" -eq 0 ]; then
		return
	fi
	echo ""
	echo "▸ Rolling back on failure (exit $ec)..."
	if [ "$COMMIT_MADE" -eq 1 ]; then
		git reset --hard HEAD^ >/dev/null 2>&1 || true
	else
		git checkout -- package.json >/dev/null 2>&1 || true
	fi
	if [ "$TAG_MADE" -eq 1 ]; then
		git tag -d "$TAG" >/dev/null 2>&1 || true
	fi
	echo "✓ Rolled back. Repo restored to pre-release state."
}
trap rollback ERR

# --- Check (tsc + biome) -----------------------------------------------------
info "Running make check..."
make --no-print-directory check

# --- Bump package.json -------------------------------------------------------
info "Bumping package.json to $NEW_VERSION..."
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.version = '$NEW_VERSION';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, '\t') + '\n');
"

# --- Build -------------------------------------------------------------------
info "Building all binaries..."
make --no-print-directory clean
make --no-print-directory binaries

# --- Sign + notarize ---------------------------------------------------------
info "Signing and notarizing macOS binaries..."
make --no-print-directory sign-mac

# --- Smoke test (on-host mac binaries only) ----------------------------------
info "Smoke-testing Mac binaries..."
./dist/shiploadcli-mac-arm64 --help >/dev/null
./dist/shiploadcli-mac-x64 --help   >/dev/null

# --- Checksums ---------------------------------------------------------------
info "Writing dist/SHA256SUMS..."
(cd "$DIST" && shasum -a 256 shiploadcli-linux-* shiploadcli-mac-*.zip shiploadcli-windows-* > SHA256SUMS)

# --- Commit + tag ------------------------------------------------------------
info "Committing and tagging $TAG..."
git add package.json
git commit -m "chore: release $TAG"
COMMIT_MADE=1
git tag -a "$TAG" -m "Release $TAG"
TAG_MADE=1

# --- Past this point rollback is manual --------------------------------------
trap - ERR

# --- Push --------------------------------------------------------------------
info "Pushing to origin..."
if ! git push origin "$BRANCH"; then
	die "git push origin $BRANCH failed; commit + tag exist locally. Fix and retry: git push origin $BRANCH && git push origin $TAG"
fi
if ! git push origin "$TAG"; then
	die "git push origin $TAG failed; tag exists locally. Fix and retry: git push origin $TAG"
fi

# --- Publish release ---------------------------------------------------------
info "Creating GitHub release $TAG..."
RELEASE_ARGS=(
	dist/shiploadcli-linux-x64
	dist/shiploadcli-linux-arm64
	dist/shiploadcli-mac-x64.zip
	dist/shiploadcli-mac-arm64.zip
	dist/shiploadcli-windows-x64.exe
	dist/SHA256SUMS
)
if ! gh release create "$TAG" \
	--title "$TAG" \
	--generate-notes \
	"${RELEASE_ARGS[@]}"
then
	echo "error: gh release create failed. Tag $TAG is pushed. Artifacts are in $DIST/." >&2
	echo "Retry with:" >&2
	echo "  gh release create $TAG --title \"$TAG\" --generate-notes \\" >&2
	for a in "${RELEASE_ARGS[@]}"; do echo "    $a \\" >&2; done
	exit 1
fi

URL="$(gh release view "$TAG" --json url --jq .url)"
echo ""
echo "✓ Released $TAG: $URL"
