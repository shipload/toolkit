#!/usr/bin/env bash
# Read-only validation of the release environment.
#
# Usage:
#   ./scripts/preflight.sh              # full checks (skips tag check)
#   ./scripts/preflight.sh <tag>        # also verifies <tag> doesn't exist
#   ./scripts/preflight.sh --skip-tag   # skip the tag check (for release-dry)

set -euo pipefail

SKIP_TAG_CHECK=0
TAG=""

case "${1:-}" in
	--skip-tag) SKIP_TAG_CHECK=1 ;;
	"") ;;
	*)          TAG="$1" ;;
esac

die() { echo "error: $*" >&2; exit 1; }

# --- Branch -----------------------------------------------------------------
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
case "$BRANCH" in
	master|main) ;;
	*) die "release must be cut from master/main (current: $BRANCH)" ;;
esac

# --- Clean tree -------------------------------------------------------------
if ! git diff-index --quiet HEAD --; then
	echo "error: working tree has uncommitted changes" >&2
	git status --short >&2
	exit 1
fi

# --- Fetch tags -------------------------------------------------------------
if ! git fetch --tags >/dev/null 2>&1; then
	die "could not fetch tags from origin"
fi

# --- Tag availability -------------------------------------------------------
if [ "$SKIP_TAG_CHECK" -eq 0 ] && [ -n "$TAG" ]; then
	if git rev-parse "$TAG" >/dev/null 2>&1; then
		die "tag $TAG already exists"
	fi
fi

# --- Tools in PATH ----------------------------------------------------------
for tool in bun codesign xcrun ditto gh zip shasum; do
	command -v "$tool" >/dev/null 2>&1 || die "required tool '$tool' not found in PATH"
done

# --- SIGNING_IDENTITY -------------------------------------------------------
if [ -z "${SIGNING_IDENTITY:-}" ]; then
	cat >&2 <<'EOF'
error: SIGNING_IDENTITY is not set

Create Makefile.local in the repo root with:

    SIGNING_IDENTITY := Developer ID Application: <Your Name/Org> (<TEAMID>)
    NOTARY_PROFILE   := <your-notarytool-keychain-profile>

Find your identity with:
    security find-identity -v | grep "Developer ID Application"
EOF
	exit 1
fi

# --- Signing identity present in keychain -----------------------------------
if ! security find-identity -v | grep -qF "$SIGNING_IDENTITY"; then
	die "signing identity \"$SIGNING_IDENTITY\" not in login keychain"
fi

# --- Notarytool keychain profile --------------------------------------------
NOTARY_PROFILE="${NOTARY_PROFILE:-shiploadcli}"
if ! xcrun notarytool history --keychain-profile "$NOTARY_PROFILE" >/dev/null 2>&1; then
	die "notarytool keychain profile \"$NOTARY_PROFILE\" not found; run: xcrun notarytool store-credentials \"$NOTARY_PROFILE\""
fi

# --- GitHub authentication --------------------------------------------------
if ! gh auth status >/dev/null 2>&1; then
	die "not authenticated to GitHub; run: gh auth login"
fi

echo "✓ Preflight passed"
