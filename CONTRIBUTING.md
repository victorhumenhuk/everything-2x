# Contributing / Personal Workflow

## Daily flow

1. `git pull --rebase` before starting work.
2. Make changes.
3. `git add -p` to review hunks before staging.
4. Commit with a clear message: `git commit -m "Fix: media detection on Spotify"`
5. `git push`

## Releasing a new version

1. Bump `version` in `manifest.json` (semver: patch for bug fixes, minor for features, major for breaking changes).
2. Update `CHANGELOG.md` with the new entry.
3. Commit: `git commit -am "Release v2.0.X"`
4. Tag: `git tag -a v2.0.X -m "v2.0.X: <one-line summary>"`
5. Push: `git push && git push --tags`
6. Create the GitHub release: `gh release create v2.0.X --notes-file <(awk '/^## \\[2.0.X\\]/,/^## \\[/' CHANGELOG.md | head -n -1)`
7. Run `./scripts/package.sh` to build the zip.
8. Upload `dist/everything-2x-v2.0.X.zip` to the Chrome Web Store.

## Commit message style

Conventional but lightweight:

- `Fix:` for bug fixes
- `Feat:` for new features
- `Refactor:` for code restructure
- `Docs:` for README / changelog
- `Chore:` for tooling, dependencies, hygiene

Example: `Fix: re-apply rate when YouTube resets to 1x via setPlaybackRate`
