#!/usr/bin/env bash
# Sign and notarize a single macOS binary.
#
# Usage:
#   SIGNING_IDENTITY="..." NOTARY_PROFILE="..." ./scripts/sign-macos.sh dist/shiploadcli-mac-arm64
#
# Produces: <binary>.zip (signed binary inside, submitted to Apple, notarized)

set -euo pipefail

BINARY="${1:-}"
if [ -z "$BINARY" ]; then
	echo "usage: $0 <path-to-binary>" >&2
	exit 1
fi

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

NOTARY_PROFILE="${NOTARY_PROFILE:-shiploadcli}"
ENTITLEMENTS="${ENTITLEMENTS:-scripts/entitlements.plist}"

if [ ! -f "$BINARY" ]; then
	echo "error: binary not found: $BINARY" >&2
	exit 1
fi

if [ ! -f "$ENTITLEMENTS" ]; then
	echo "error: entitlements file not found: $ENTITLEMENTS" >&2
	exit 1
fi

echo "▸ Signing $BINARY..."
codesign \
	--force \
	--options runtime \
	--timestamp \
	--entitlements "$ENTITLEMENTS" \
	--sign "$SIGNING_IDENTITY" \
	"$BINARY"

echo "▸ Verifying signature..."
codesign --verify --verbose=2 "$BINARY"

ZIP="${BINARY}.zip"
rm -f "$ZIP"

echo "▸ Packaging for notarization: $ZIP"
ditto -c -k --keepParent "$BINARY" "$ZIP"

echo "▸ Submitting to Apple notary service (may take several minutes)..."
NOTARY_LOG=$(mktemp)
trap 'rm -f "$NOTARY_LOG"' EXIT

if ! xcrun notarytool submit "$ZIP" \
	--keychain-profile "$NOTARY_PROFILE" \
	--wait 2>&1 | tee "$NOTARY_LOG"
then
	echo "error: xcrun notarytool submit failed" >&2
	exit 1
fi

STATUS=$(awk '/^[[:space:]]*status:/ { print $2 }' "$NOTARY_LOG" | tail -1)
SUBMISSION_ID=$(awk '/^[[:space:]]*id:/ { print $2 }' "$NOTARY_LOG" | head -1)

if [ "$STATUS" != "Accepted" ]; then
	echo "error: notarization status: ${STATUS:-unknown}" >&2
	if [ -n "$SUBMISSION_ID" ]; then
		echo "  fetch log: xcrun notarytool log $SUBMISSION_ID --keychain-profile \"$NOTARY_PROFILE\"" >&2
	fi
	exit 1
fi

echo "✓ Notarization accepted: $ZIP"
