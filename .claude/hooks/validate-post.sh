#!/bin/bash
# Quality Gate Hook: Pre-publish validation for Blotato API posts
# Fires on PreToolUse for Bash commands. Only validates curl calls to /v2/posts.

set -euo pipefail

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)

# Only validate curl commands targeting the Blotato publish endpoint
if [[ -z "$COMMAND" ]] || ! echo "$COMMAND" | grep -q 'curl.*backend\.blotato\.com.*/v2/posts'; then
  exit 0
fi

# Extract the JSON body from -d or --data parameter
# Handles both -d '...' and --data '...' forms
BODY=""
if echo "$COMMAND" | grep -qE "(-d|--data|--data-raw)\s+'"; then
  BODY=$(echo "$COMMAND" | sed -n "s/.*\(-d\|--data\|--data-raw\)\s*'\(.*\)'.*/\2/p")
elif echo "$COMMAND" | grep -qE '(-d|--data|--data-raw)\s+"'; then
  BODY=$(echo "$COMMAND" | sed -n 's/.*\(-d\|--data\|--data-raw\)\s*"\(.*\)".*/\2/p')
fi

if [[ -z "$BODY" ]]; then
  # No body found — might be a GET request to check status, allow it
  exit 0
fi

ERRORS=""

# --- CHECK 1: Em Dash Check ---
if echo "$BODY" | grep -q '—'; then
  ERRORS="${ERRORS}\n[BLOCKED] Em dash (—) detected in post content. Replace with hyphens (-) or rewrite."
fi

# --- CHECK 2: Character Limit Check ---
POST_TEXT=$(echo "$BODY" | jq -r '.post.content.text // empty' 2>/dev/null)
PLATFORM=$(echo "$BODY" | jq -r '.post.content.platform // empty' 2>/dev/null)

if [[ -n "$POST_TEXT" && -n "$PLATFORM" ]]; then
  CHAR_COUNT=${#POST_TEXT}

  case "$PLATFORM" in
    twitter)
      if [[ $CHAR_COUNT -gt 280 ]]; then
        ERRORS="${ERRORS}\n[BLOCKED] Twitter post is ${CHAR_COUNT} chars (limit: 280). Shorten the content."
      fi
      ;;
    linkedin)
      if [[ $CHAR_COUNT -gt 3000 ]]; then
        ERRORS="${ERRORS}\n[BLOCKED] LinkedIn post is ${CHAR_COUNT} chars (limit: 3000). Shorten the content."
      fi
      ;;
    instagram)
      if [[ $CHAR_COUNT -gt 2200 ]]; then
        ERRORS="${ERRORS}\n[BLOCKED] Instagram caption is ${CHAR_COUNT} chars (limit: 2200). Shorten the content."
      fi
      ;;
    facebook)
      if [[ $CHAR_COUNT -gt 63206 ]]; then
        ERRORS="${ERRORS}\n[BLOCKED] Facebook post is ${CHAR_COUNT} chars (limit: 63206). Shorten the content."
      fi
      ;;
  esac
fi

# --- CHECK 3: Banned Words Check ---
BANNED_WORDS=("guaranteed" "hack" "hustle" "grind" "guru" "ninja" "rockstar" "synergy" "disrupt" "leverage" "circle back" "deep dive" "move the needle" "game-changer" "thought leader")

POST_TEXT_LOWER=$(echo "$POST_TEXT" | tr '[:upper:]' '[:lower:]')
for word in "${BANNED_WORDS[@]}"; do
  if echo "$POST_TEXT_LOWER" | grep -qi "$word"; then
    ERRORS="${ERRORS}\n[BLOCKED] Banned word/phrase detected: \"${word}\". Remove or replace it."
  fi
done

# --- CHECK 4: Required Media Check (Instagram) ---
if [[ "$PLATFORM" == "instagram" ]]; then
  MEDIA_URLS=$(echo "$BODY" | jq -r '.post.content.mediaUrls // empty' 2>/dev/null)
  MEDIA_COUNT=$(echo "$BODY" | jq -r '.post.content.mediaUrls | length // 0' 2>/dev/null)
  if [[ "$MEDIA_COUNT" == "0" || -z "$MEDIA_URLS" || "$MEDIA_URLS" == "[]" ]]; then
    ERRORS="${ERRORS}\n[BLOCKED] Instagram requires at least one image or video. Add mediaUrls."
  fi
fi

# --- CHECK 5: LLM Virality Score Suggestion ---
# This doesn't block — it outputs a suggestion for Claude to evaluate
if [[ -z "$ERRORS" && -n "$POST_TEXT" ]]; then
  # Get the first line/hook of the post
  HOOK_LINE=$(echo "$POST_TEXT" | head -1)
  echo "QUALITY GATE PASSED. Before publishing, score this hook for virality (1-10): \"${HOOK_LINE}\". If below 8/10, rewrite the hook to be more attention-grabbing, then retry the publish."
fi

# --- OUTPUT RESULTS ---
if [[ -n "$ERRORS" ]]; then
  echo -e "QUALITY GATE FAILED:${ERRORS}" >&2
  exit 2
fi

exit 0
