---
name: plan-week
description: Generate a full weekly content plan across all social platforms. Use when user wants to plan a week of content, create a content calendar, batch-schedule posts, or generate multiple posts from a single source. Accepts a topic, YouTube URL (even 2+ hour videos), list of topics, or mixed inputs.
user-invocable: true
argument-hint: [topic or URL]
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, WebFetch, WebSearch, Agent
---

# /plan-week — Weekly Content Plan Generator

Generate a full week of social media content from a single source, review it, then schedule everything in parallel.

## Arguments

- `$ARGUMENTS` — A topic, URL, list of topics, or mixed inputs to generate a week of content from

## Quick Reference

```
/plan-week "How AI is transforming small businesses"
/plan-week https://youtube.com/watch?v=...
/plan-week "Topic 1, Topic 2, Topic 3"
```

---

## Configuration

- **Posts per day per platform**: 1
- **Days covered**: Weekdays only (Monday - Friday)
- **Platforms**: Twitter, LinkedIn, Instagram, Facebook
- **Total posts per week**: 20 (5 days x 4 platforms)
- **Visuals**: 5 whiteboard infographics (1 per weekday, shared across platforms)
- **Scheduling**: Always use `useNextFreeSlot: true` (never publish immediately)
- **Content approach**: Extract source material → generate 10 unique angles → select best 5 for weekdays

---

## STEP 1: Extract Source Content

Same as `/post` skill — detect input type and extract content:

### For URLs:

```bash
curl -s -X POST "https://backend.blotato.com/v2/source-resolutions-v3" \
  -H "blotato-api-key: $BLOTATO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "source": {
      "sourceType": "<detected_type>",
      "url": "<input_url>"
    }
  }'
```

### For topics needing research:

```bash
curl -s -X POST "https://backend.blotato.com/v2/source-resolutions-v3" \
  -H "blotato-api-key: $BLOTATO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "source": {
      "sourceType": "perplexity-query",
      "text": "<topic>"
    }
  }'
```

Poll for results at `GET /v2/source-resolutions-v3/<sourceId>` until status is `"completed"`.

For **long-form content** (2+ hour YouTube videos): the transcript may be very long. Chunk it into logical sections (by topic shifts, timestamps, or natural breaks) before generating angles.

---

## STEP 2: Generate 10 Content Angles

From the extracted source material, generate **10 unique content angles**. Each angle should be:

- A distinct perspective, insight, or takeaway from the source
- Different enough from other angles to avoid repetitive content
- Suitable for social media (not too broad, not too niche)

Angle types to mix:
1. **Contrarian take** — challenges a common belief from the source
2. **How-to / tactical** — specific actionable steps from the source
3. **Story / anecdote** — a narrative element from the source
4. **Data / stat highlight** — a surprising number or finding
5. **Framework / model** — a mental model or framework presented
6. **Quote / key insight** — a powerful one-liner or concept
7. **Mistake / anti-pattern** — what NOT to do
8. **Comparison** — before/after, old way/new way
9. **Prediction / trend** — forward-looking insight
10. **Personal reflection** — opinion or experience tied to the source

Select the **best 5 angles** for the 5 weekdays.

---

## STEP 3: Generate Post Drafts

For each of the 5 selected angles, generate full post copy for ALL 4 platforms:
- **Twitter** — Apply Alex Hormozi voice (see brand voice in /post skill)
- **LinkedIn** — Apply Justin Welsh voice
- **Instagram** — Visual-first caption style
- **Facebook** — Conversational, community-oriented

This produces 20 total post drafts (5 angles x 4 platforms).

Apply ALL humanize AI writing rules from the /post skill.

---

## STEP 4: Generate Visuals

Create **5 whiteboard infographic visuals** (one per weekday). Each visual corresponds to that day's angle/theme and will be shared across all 4 platforms for that day.

### List templates:

```bash
curl -s "https://backend.blotato.com/v2/videos/templates" \
  -H "blotato-api-key: $BLOTATO_API_KEY"
```

### Create each visual:

```bash
curl -s -X POST "https://backend.blotato.com/v2/videos/from-templates" \
  -H "blotato-api-key: $BLOTATO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "templateId": "<whiteboard_infographic_template_uuid>",
    "prompt": "<description based on day angle/theme>",
    "render": true
  }'
```

Poll each at `GET /v2/videos/creations/<videoId>` until status is `"done"`.

**Rate limit**: 1 visual creation per minute. Space requests accordingly.

---

## STEP 5: Output Content Plan

Write the complete plan to `content-plan.md` in the project root.

### Format:

```markdown
# Weekly Content Plan

**Source**: [input topic/URL]
**Generated**: [date]
**Status**: DRAFT - Awaiting Review

---

## Monday — [Angle/Theme Title]

**Visual**: [visual_url or "generating..."]

### Twitter
[Full tweet text]

**Status**: draft

### LinkedIn
[Full LinkedIn post]

**Status**: draft

### Instagram
[Full Instagram caption]

**Status**: draft

### Facebook
[Full Facebook post]

**Status**: draft

---

## Tuesday — [Angle/Theme Title]

[Same structure...]

---

[Continue for Wednesday, Thursday, Friday]

---

## Summary

| Day | Angle | Visual | Twitter | LinkedIn | Instagram | Facebook |
|-----|-------|--------|---------|----------|-----------|----------|
| Mon | [theme] | [url] | draft | draft | draft | draft |
| Tue | [theme] | [url] | draft | draft | draft | draft |
| Wed | [theme] | [url] | draft | draft | draft | draft |
| Thu | [theme] | [url] | draft | draft | draft | draft |
| Fri | [theme] | [url] | draft | draft | draft | draft |
```

---

## STEP 6: Human Review

After generating the plan:

1. Tell the user: "Your weekly content plan is ready in `content-plan.md`. Review it in your editor, make any edits you'd like, then type **approve** to schedule all posts."
2. **STOP and wait for the user to respond.**
3. The user may:
   - Type **"approve"** → proceed to Step 7 (schedule all)
   - Select specific lines and ask Claude to rewrite them → update `content-plan.md` and wait again
   - Ask for a specific day/platform to be regenerated → regenerate and update
   - Ask for changes to tone, angle, or visual → apply changes and update
4. Only proceed to scheduling after explicit approval.

---

## STEP 7: Batch Schedule (After Approval)

Once the user approves, schedule all 20 posts using **parallel sub-agents**.

### Get Connected Accounts

```bash
curl -s "https://backend.blotato.com/v2/users/me/accounts" \
  -H "blotato-api-key: $BLOTATO_API_KEY"
```

### Spawn Sub-Agents

Launch **one Agent per platform** (4 agents total). Each agent schedules 5 posts (Mon-Fri) for its platform.

Agent prompt template:

```
You are scheduling 5 social media posts to [PLATFORM] for the week.

Blotato API key is available as $BLOTATO_API_KEY.
Base URL: https://backend.blotato.com/v2
Auth header: blotato-api-key: $BLOTATO_API_KEY
Account ID: [accountId]
[If Facebook: Page ID: pageId]

Schedule each post using useNextFreeSlot: true.

Posts to schedule:

Monday: [post text]
Visual: [media_url]

Tuesday: [post text]
Visual: [media_url]

Wednesday: [post text]
Visual: [media_url]

Thursday: [post text]
Visual: [media_url]

Friday: [post text]
Visual: [media_url]

For each post, make this curl call:

curl -s -X POST "https://backend.blotato.com/v2/posts" \
  -H "blotato-api-key: $BLOTATO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "useNextFreeSlot": true,
    "post": {
      "accountId": "[accountId]",
      "content": {
        "text": "[post_text]",
        "platform": "[platform]",
        "mediaUrls": ["[visual_url]"]
      },
      "target": {
        "targetType": "[platform]"
      }
    }
  }'

After each successful post, poll GET /v2/posts/<postSubmissionId> to confirm.
Then append a row to post-log.md.

Report back with the status of all 5 posts.
```

### After All Agents Complete

1. Update `content-plan.md` — change status of each post from "draft" to "scheduled"
2. Report summary to user: how many posts scheduled, any failures, next steps

---

## SAFETY RULES

1. **NEVER schedule without explicit user approval** ("approve" or similar)
2. **Always use `useNextFreeSlot: true`** — never publish immediately
3. **Show the full plan first** — user must see all 20 posts before anything is scheduled
4. **Rate limit visual creation** — max 1 per minute
5. **Log every scheduled post** to `post-log.md`

---

## BLOTATO API REFERENCE

See the `/post` skill for full API endpoint documentation.

**Key endpoints for /plan-week**:
- `POST /v2/source-resolutions-v3` — extract content
- `GET /v2/source-resolutions-v3/:id` — poll extraction status
- `POST /v2/videos/from-templates` — create visuals
- `GET /v2/videos/creations/:id` — poll visual status
- `GET /v2/users/me/accounts` — list connected accounts
- `POST /v2/posts` — schedule posts (with `useNextFreeSlot: true`)
- `GET /v2/posts/:id` — poll post status

**Base URL**: `https://backend.blotato.com/v2`
**Auth Header**: `blotato-api-key: $BLOTATO_API_KEY`
