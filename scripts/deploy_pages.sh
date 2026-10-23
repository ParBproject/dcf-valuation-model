#!/usr/bin/env bash
# Publish web/dist as the root of an orphan `gh-pages` branch (GitHub Pages, no workflow needed).
# Reproducible: a fresh single-commit branch each time, built from the current checkout.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REMOTE="$(git -C "$ROOT" remote get-url origin)"
SHA="$(git -C "$ROOT" rev-parse --short HEAD)"

cd "$ROOT/web"
[ -d node_modules ] || npm ci
npm run build

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
cp -R dist/. "$TMP/"
touch "$TMP/.nojekyll"          # serve files as-is (no Jekyll processing)
cd "$TMP"
git init -q -b gh-pages
git add -A
git -c user.name="$(git -C "$ROOT" config user.name || echo deploy)" \
    -c user.email="$(git -C "$ROOT" config user.email || echo deploy@localhost)" \
    commit -q -m "Deploy ${SHA} to GitHub Pages"
git push -q --force "$REMOTE" gh-pages:gh-pages
echo "Published ${SHA} to gh-pages ($(find . -type f -not -path './.git/*' | wc -l) files)"
