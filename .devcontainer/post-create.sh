#!/usr/bin/env bash
set -euo pipefail

echo "[devcontainer] Starting post-create setup"

# Avoid any interactive prompts (Corepack, Yarn, etc.)
export CI=1

echo "[devcontainer] Enabling Corepack"
corepack enable || true

# Ensure writable cache directories (mounts may be root-owned on first creation)
echo "[devcontainer] Ensuring writable cache dirs"
CACHE_DIRS=(/home/node/.cache /home/node/.cache/ms-playwright /home/node/.cache/node /home/node/.cache/node/corepack)
for d in "${CACHE_DIRS[@]}"; do
  mkdir -p "$d" || true
  if [ ! -w "$d" ]; then
    if command -v sudo >/dev/null 2>&1; then
      sudo chown -R "$(id -u):$(id -g)" "$d" || true
    fi
  fi
done

# Extract the pinned yarn version from package.json (after yarn@ and before + or end)
YARN_VERSION=$(grep -oE '"packageManager"\s*:\s*"yarn@[0-9][^"]*"' package.json | sed -E 's/.*yarn@([^+"]+).*/\1/' || true)
if [ -n "${YARN_VERSION}" ]; then
  echo "[devcontainer] Prefetching Yarn ${YARN_VERSION} via corepack (non-interactive)"
  corepack prepare "yarn@${YARN_VERSION}" --activate || true
fi

if command -v yarn >/dev/null 2>&1; then
  echo "[devcontainer] Yarn version: $(yarn -v || echo unknown)"
  echo "[devcontainer] Installing dependencies with Yarn"
  # Prefer offline cache if present; don't fail whole script on transient network issues
  yarn install --no-progress || yarn install || true
  echo "[devcontainer] Running husky prepare"
  yarn prepare || true
else
  echo "[devcontainer] Yarn not present; skipping npm fallback to avoid unpinned installs"
fi

echo "[devcontainer] Running initial typecheck"
if command -v yarn >/dev/null 2>&1; then
  yarn typecheck || true
else
  npm run typecheck || true
fi

PLAYWRIGHT_BROWSERS_DEFAULT="chromium"
PLAYWRIGHT_BROWSERS=${PLAYWRIGHT_BROWSERS:-$PLAYWRIGHT_BROWSERS_DEFAULT}
echo "[devcontainer] Installing Playwright browsers: $PLAYWRIGHT_BROWSERS"
if command -v npx >/dev/null 2>&1; then
  set +e
  npx --yes playwright install --with-deps $PLAYWRIGHT_BROWSERS
  RC=$?
  if [ $RC -ne 0 ]; then
    echo "[devcontainer] Playwright install failed (rc=$RC) – attempting permission repair & retry"
    if command -v sudo >/dev/null 2>&1; then
      sudo chown -R "$(id -u):$(id -g)" /home/node/.cache/ms-playwright || true
    fi
    npx --yes playwright install --with-deps $PLAYWRIGHT_BROWSERS
    RC=$?
    if [ $RC -ne 0 ]; then
      echo "[devcontainer][fatal] Playwright install failed after retry (rc=$RC)" >&2
      exit $RC
    fi
  fi
  set -e
fi

echo "[devcontainer] Playwright version: $(npx playwright --version 2>/dev/null || echo 'not installed') (browsers: $PLAYWRIGHT_BROWSERS)"

echo "[devcontainer] Building plugin (size build) to warm dist cache"
if command -v yarn >/dev/null 2>&1; then
  yarn build:size || true
fi

echo "[devcontainer] Priming Jest test file list (fast)"
if command -v yarn >/dev/null 2>&1; then
  yarn test --listTests >/dev/null 2>&1 || true
fi

echo "[devcontainer] Post-create setup complete"
