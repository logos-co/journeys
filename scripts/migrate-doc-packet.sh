#!/usr/bin/env bash
# migrate-doc-packet.sh — Replace ## Doc Packet section content with `- link: ` field
# Usage: bash scripts/migrate-doc-packet.sh [--dry-run]
#
# For each open issue in logos-co/journeys.logos.co:
#   - Skip if ## Doc Packet already has a non-empty `- link: <url>`
#   - Otherwise replace the section content with `- link: ` (empty field)

set -euo pipefail

REPO="logos-co/journeys.logos.co"
DRY_RUN=false

for arg in "$@"; do
  [[ "$arg" == "--dry-run" ]] && DRY_RUN=true
done

NUMBERS=$(gh issue list --repo "$REPO" --limit 100 --state open --json number --jq '.[].number')

for NUM in $NUMBERS; do
  BODY=$(gh issue view "$NUM" --repo "$REPO" --json body --jq '.body // ""')

  RESULT=$(python3 -c "
import sys, re

body = sys.argv[1]

# Find ## Doc Packet section
m = re.search(r'^(#{1,3}[ \t]+Doc Packet[ \t]*)(\r?\n)', body, re.M)
if not m:
    print('NO_SECTION')
    sys.exit(0)

header_end = m.end()

# Find where section content ends (next ## heading or end of body)
rest = body[header_end:]
nxt = re.search(r'^#{1,3}[ \t]', rest, re.M)
content = rest[:nxt.start()] if nxt else rest

# Check if already has a non-empty - link: <url>
link_m = re.search(r'^-[ \t]+link:[ \t]*(\S+)', content, re.M)
if link_m:
    print('SKIP')
    sys.exit(0)

# Replace section content with '- link: '
new_content = '- link: \n'
if nxt:
    new_body = body[:header_end] + new_content + '\n' + rest[nxt.start():]
else:
    new_body = body[:header_end] + new_content
print(new_body)
" "$BODY")

  if [[ "$RESULT" == "NO_SECTION" ]]; then
    echo "#$NUM: no ## Doc Packet section, skipping"
    continue
  fi

  if [[ "$RESULT" == "SKIP" ]]; then
    echo "#$NUM: already has link, skipping"
    continue
  fi

  if $DRY_RUN; then
    echo "#$NUM: would update"
    echo "---"
    echo "$RESULT" | grep -A2 "Doc Packet" || true
    echo "---"
  else
    echo "$RESULT" | gh issue edit "$NUM" --repo "$REPO" --body-file -
    echo "#$NUM: updated"
    sleep 0.5
  fi
done

echo ""
echo "Done."
