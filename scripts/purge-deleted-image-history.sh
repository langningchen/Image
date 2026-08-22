#!/usr/bin/env bash
set -euo pipefail

# Removes history for image files deleted from the current branch at least
# seven days ago. It intentionally never runs as part of Worker cleanup.
readonly IMAGE_PATH_PREFIX="${IMAGE_PATH_PREFIX:-images/}"
readonly RETENTION_DAYS="${RETENTION_DAYS:-7}"
readonly TARGET_BRANCH="${TARGET_BRANCH:-$(git branch --show-current)}"
readonly CUTOFF_EPOCH="$(( $(date +%s) - RETENTION_DAYS * 86400 ))"

if [[ -z "$TARGET_BRANCH" ]]; then
  echo "TARGET_BRANCH must be set when HEAD is detached." >&2
  exit 2
fi

if ! command -v git-filter-repo >/dev/null 2>&1; then
  echo "git-filter-repo is required. Install it with: pipx install git-filter-repo" >&2
  exit 2
fi

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "The repository has uncommitted changes; refusing to rewrite history." >&2
  exit 2
fi

paths_file="$(mktemp)"
trap 'rm -f "$paths_file"' EXIT
current_commit_epoch=0

while IFS= read -r line; do
  if [[ "$line" =~ ^[0-9]{10}$ ]]; then
    current_commit_epoch="$line"
    continue
  fi
  if [[ "$line" != "$IMAGE_PATH_PREFIX"* ]] || (( current_commit_epoch > CUTOFF_EPOCH )); then
    continue
  fi
  if ! git cat-file -e "HEAD:$line" 2>/dev/null; then
    printf '%s\n' "$line" >>"$paths_file"
  fi
done < <(git log --format='%ct' --name-only --diff-filter=D -- "$IMAGE_PATH_PREFIX")

sort -u -o "$paths_file" "$paths_file"
if [[ ! -s "$paths_file" ]]; then
  echo "No deleted image history is old enough to purge."
  exit 0
fi

remote_url="$(git remote get-url origin)"
count="$(wc -l <"$paths_file" | tr -d '[:space:]')"
echo "Purging history for $count deleted image file(s) older than $RETENTION_DAYS days."
git filter-repo --force --invert-paths --paths-from-file "$paths_file"
git remote add origin "$remote_url"
git push --force origin "HEAD:refs/heads/$TARGET_BRANCH"
