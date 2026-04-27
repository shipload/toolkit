#!/usr/bin/env bash
set -euo pipefail

# 1. Clean working tree.
git diff --quiet || { echo "✗ Working tree has unstaged changes."; exit 1; }
git diff --cached --quiet || { echo "✗ Working tree has staged changes."; exit 1; }

# 2. On an allowed branch.
#    - Stable: master/main only.
#    - Prerelease (.changeset/pre.json present): dev is also allowed.
#    - RELEASE_BRANCH=<name> overrides both rules.
BRANCH=$(git rev-parse --abbrev-ref HEAD)
GIT_ROOT=$(git rev-parse --show-toplevel)
if [ -n "${RELEASE_BRANCH:-}" ]; then
	[ "$BRANCH" = "$RELEASE_BRANCH" ] || { echo "✗ On '$BRANCH', expected '$RELEASE_BRANCH'."; exit 1; }
elif [ -f "$GIT_ROOT/.changeset/pre.json" ]; then
	case "$BRANCH" in
		master|main|dev) ;;
		*) echo "✗ On '$BRANCH', expected 'master', 'main', or 'dev' (prerelease mode active)."; exit 1 ;;
	esac
else
	case "$BRANCH" in
		master|main) ;;
		*) echo "✗ On '$BRANCH', expected 'master' or 'main'."; exit 1 ;;
	esac
fi

# 3. In sync with origin.
git fetch --quiet origin "$BRANCH"
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse "origin/$BRANCH")
[ "$LOCAL" = "$REMOTE" ] || { echo "✗ Branch out of sync with origin/$BRANCH."; exit 1; }

# 4. There are pending changesets to release.
PENDING=$(find .changeset -name '*.md' ! -name 'README.md' 2>/dev/null | wc -l | tr -d ' ')
[ "$PENDING" != "0" ] || { echo "✗ No pending changesets. Run 'bun changeset' first."; exit 1; }

# 5. npm auth — bail fast if not logged in.
npm whoami >/dev/null 2>&1 || { echo "✗ Not logged into npm. Run 'npm login'."; exit 1; }

echo "✓ Preflight passed. $PENDING changeset(s) pending release."
