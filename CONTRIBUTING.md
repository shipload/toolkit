# Contributing

## Pull requests

Describe what changed in the PR description — what user-facing behavior is added, removed, or fixed. The maintainer translates this into a changeset (see below) before merging or at release time, so contributors don't need to know semver bump rules.

If you're a regular contributor and confident about the semver impact, you can author the changeset yourself with `bun changeset` and commit it to the PR. Otherwise leave it; the maintainer will handle it.

## Authoring changesets (maintainer)

Before releasing, every user-facing change since the last release needs a changeset describing it:

```bash
bun changeset
# select packages, choose semver bump, write summary
git add .changeset/<generated-file>.md
git commit -m "changeset: <summary>"
```

Multiple changesets accumulate between releases. `make release` preflight refuses to run with zero pending changesets.

## Releasing

All releases run locally — no CI publishing. The flow is two steps:

```bash
git checkout master && git pull
make release                  # preflight + check + test + build + version + commit + push
bun changeset publish         # interactive: npm publishes (browser auth) + creates tags
git push --follow-tags        # push the tags
```

`make release` runs:

1. Preflight script — clean tree, on `master`, in sync with origin, ≥1 pending changeset, npm authenticated.
2. `make check` — biome + each package's type-check.
3. `make test` — bun:test x3 + vitest x1.
4. `make build` — SDK rollup; others as configured.
5. `bun changeset version` — bumps versions, rewrites internal deps, regenerates CHANGELOGs.
6. `git commit "chore: version packages"`.
7. `git push`.

The publish step is separate because npm's CLI browser-auth flow requires an interactive terminal and can't be reliably automated. After `make release` finishes you run `bun changeset publish` manually (browser auth window opens once), then push the resulting tags.

For CLI binary releases (after publish if `@shipload/cli` version bumped):

```bash
make release/cli       # builds, signs, notarizes, uploads to GitHub Release
```

## Code style

Biome at the root handles lint + format. `make format` auto-fixes.
