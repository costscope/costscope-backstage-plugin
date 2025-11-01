#!/usr/bin/env bash
set -euo pipefail

# Remove root-level component shim files in src/components that re-export to subfolders.
# Default is dry-run; pass --delete to actually remove files.

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f package.json ]]; then
  echo "Run from repo root (package.json not found)" >&2
  exit 1
fi

MODE="dry"
if [[ "${1:-}" == "--delete" || "${1:-}" == "-y" ]]; then
  MODE="delete"
fi

COMP_DIR="src/components"
SHIMS=(
  ActionItemsPanel.tsx
  ActionItemsPanel.d.ts
  BreakdownTable.tsx
  BreakdownTable.d.ts
  CostOverviewCard.tsx
  CostOverviewCard.d.ts
  CostscopePage.tsx
  CostscopePage.d.ts
  EntityCostscopeContent.tsx
  EntityCostscopeContent.d.ts
  FiltersBar.tsx
  FiltersBar.d.ts
  TopServices.tsx
  TopServices.d.ts
)

echo "Shim files (mode=$MODE):"
ANY=0
for f in "${SHIMS[@]}"; do
  if [[ -f "$COMP_DIR/$f" ]]; then
    ANY=1
    echo "  $COMP_DIR/$f"
    if [[ "$MODE" == "delete" ]]; then
      rm -f "$COMP_DIR/$f"
    fi
  fi
done

if [[ $ANY -eq 0 ]]; then
  echo "  (none found)"
fi

if [[ "$MODE" == "delete" ]]; then
  echo
  echo "Post-cleanup listing (src/components):"
  ls -1 "$COMP_DIR" || true
else
  echo
  echo "Dry-run complete. Re-run with --delete to remove files."
fi
