#!/usr/bin/env bash
# Script: safely rename files under docs/ to lowercase and update references in the repo.
# Usage:
#   ./scripts/normalize-docs-filenames.sh        # dry-run (no changes)
#   ./scripts/normalize-docs-filenames.sh --apply  # apply changes (creates a git branch)
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

APPLY=false
if [ "${1-}" = "--apply" ]; then
  APPLY=true
fi

# Find files under docs/ that contain uppercase letters
mapfile -t FILES < <(find docs -type f -regextype posix-extended -regex '.*[A-Z].*' | sort)

if [ ${#FILES[@]} -eq 0 ]; then
  echo "No files with uppercase characters found under docs/."
  exit 0
fi

echo "Found ${#FILES[@]} files with uppercase in docs/:"
for f in "${FILES[@]}"; do
  echo "  $f"
done

# Build mapping old -> new (lowercase basename, preserve path)
declare -a FROM
declare -a TO
for f in "${FILES[@]}"; do
  dir="$(dirname "$f")"
  base="$(basename "$f")"
  newbase="$(echo "$base" | tr '[:upper:]' '[:lower:]')"
  newpath="$dir/$newbase"
  if [ "$f" != "$newpath" ]; then
    FROM+=("$f")
    TO+=("$newpath")
  fi
done

echo
echo "Planned renames (old -> new):"
for i in "${!FROM[@]}"; do
  printf "  %s -> %s\n" "${FROM[$i]}" "${TO[$i]}"
done

if [ "$APPLY" = false ]; then
  echo
  echo "Dry-run mode. To apply the changes run:"
  echo "  ./scripts/normalize-docs-filenames.sh --apply"
  exit 0
fi

# Create branch for changes
BRANCH="docs/normalize-filenames-$(date +%Y%m%d%H%M%S)"
git switch -c "$BRANCH"

# Perform git mv for each file, handling case-only rename and existing destinations safely
for i in "${!FROM[@]}"; do
  src="${FROM[$i]}"
  dst="${TO[$i]}"
  dstdir="$(dirname "$dst")"
  mkdir -p "$dstdir"

  # If paths resolve to the same file, skip
  if [ "$(realpath --relative-to="$REPO_ROOT" "$src")" = "$(realpath --relative-to="$REPO_ROOT" "$dst")" ]; then
    echo "Skipping identical path: $src"
    continue
  fi

  # If destination already exists, handle three cases:
  # 1) dst exists and is byte-identical to src -> remove src (deduplicate)
  # 2) dst exists and differs -> move existing dst to a unique backup, then move src -> dst
  # 3) dst doesn't exist -> normal git mv
  if [ -e "$dst" ]; then
    if cmp -s "$src" "$dst"; then
      echo "Destination exists and is identical; removing source: $src"
      git rm -q "$src"
      continue
    fi

    # Destination exists and differs. Move existing dst to a unique backup to avoid collisions
    rand="${RANDOM}${$}$(date +%s)"
    backup="${dst}.__backup__.${rand}"
    echo "Destination exists and differs. Moving existing dst -> backup: $dst -> $backup"
    git mv -v "$dst" "$backup"
    echo "Moving source -> destination: $src -> $dst"
    git mv -v "$src" "$dst"
    continue
  fi

  # Normal case: destination does not exist
  git mv -v "$src" "$dst"
done

# Update references across the repo: replace basenames (simple, case-sensitive)
for i in "${!FROM[@]}"; do
  src_basename="$(basename "${FROM[$i]}")"
  dst_basename="$(basename "${TO[$i]}")"

  # Iterate tracked files safely (null-separated), skip non-regular files
  git ls-files -z | while IFS= read -r -d '' file; do
    [ -f "$file" ] || continue
    # Quick check: does the file contain the old basename?
    if grep -Fq -- "$src_basename" "$file"; then
      perl -i -pe "s/\Q$src_basename\E/$dst_basename/g" "$file"
      git add "$file"
    fi
  done
done

echo
echo "Renames & replacements applied and staged on branch: $BRANCH"
git status --short
git --no-pager diff --staged --name-only
echo
echo "Suggested next steps:"
echo "  1) Review staged changes: git --no-pager diff --staged"
echo "  2) Run repo checks locally: yarn install --frozen-lockfile && yarn lint && yarn typecheck && yarn test && yarn build && yarn size"
echo "  3) Commit: git commit -m \"docs: normalize docs filenames to lowercase and update links\""
echo "  4) Push and open PR: git push -u origin $BRANCH"