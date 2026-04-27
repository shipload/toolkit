#!/usr/bin/env bash
set -euo pipefail

# 1. Clean working tree.
git diff --quiet || { echo "✗ Working tree has unstaged changes."; exit 1; }
git diff --cached --quiet || { echo "✗ Working tree has staged changes."; exit 1; }

# 2. On master (override with RELEASE_BRANCH=...).
BRANCH=$(git rev-parse --abbrev-ref HEAD)
EXPECTED=${RELEASE_BRANCH:-master}
[ "$BRANCH" = "$EXPECTED" ] || { echo "✗ On '$BRANCH', expected '$EXPECTED'."; exit 1; }

# 3. In sync with origin.
git fetch --quiet origin "$EXPECTED"
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse "origin/$EXPECTED")
[ "$LOCAL" = "$REMOTE" ] || { echo "✗ Branch out of sync with origin/$EXPECTED."; exit 1; }

# 4. There are pending changesets to release.
PENDING=$(find .changeset -name '*.md' ! -name 'README.md' 2>/dev/null | wc -l | tr -d ' ')
[ "$PENDING" != "0" ] || { echo "✗ No pending changesets. Run 'bun changeset' first."; exit 1; }

# 5. npm auth — bail fast if not logged in.
npm whoami >/dev/null 2>&1 || { echo "✗ Not logged into npm. Run 'npm login'."; exit 1; }

echo "✓ Preflight passed. $PENDING changeset(s) pending release."
