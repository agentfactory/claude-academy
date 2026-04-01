---
name: plan-week
description: Generate a full weekly content plan for social media. Use when user wants to plan a week of content, create a content calendar, batch-schedule posts, or generate multiple posts from a single source (topic, YouTube video, article, etc.) across Twitter, LinkedIn, Instagram, and Facebook.
user-invocable: true
argument-hint: [topic or URL]
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, WebFetch, WebSearch, Agent
---

# /plan-week — Weekly Content Planner & Scheduler

Generate a complete week of social media content from a single source, review it, then batch-schedule across all platforms.

## Arguments

- `$ARGUMENTS` — A topic, YouTube URL, TikTok URL, article URL, list of topics, or mixed inputs

## Quick Reference

```
/plan-week "AI productivity tips for small businesses"
/plan-week https://youtube.com/watch?v=abc123
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
- **Content approach**: Extract source material → generate 10 unique angles → select 5 best for weekdays

---

## STEP 1: Extract Source Content

Detect input type and extract content using the same logic as the `/post` skill.

For URL inputs:

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

For topic-based inputs, use Perplexity research:

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

Poll for completion (same pattern as `/post` skill — check status, wait 3s, retry up to 20 times).

For long-form videos (2+ hours), the transcript may be very long. Chunk it into logical sections for angle generation.

---

## STEP 2: Generate 10 Content Angles

From the extracted source material, generate **10 unique content angles**. Each angle should be:

- A distinct perspective, insight, or takeaway from the source
- Standalone — doesn't require context from other angles
- Suitable for social media (not too academic or complex)
- Varied in type: mix of tips, stories, contrarian takes, frameworks, questions, statistics

Present all 10 angles to the user in a numbered list with a one-line description each.

---

## STEP 3: Select 5 Best Angles for the Week

From the 10 angles, select the **5 strongest** for Monday through Friday. Consider:

- Variety across the week (don't cluster similar themes)
- Start the week strong (Monday = most compelling angle)
- End the week with an engagement-driving angle (Friday = question or discussion)
- Mid-week = educational/tactical content

---

## STEP 4: Generate Full Post Drafts

For each of the 5 selected angles, generate **one post per platform** (4 platforms x 5 days = 20 posts total).

Apply the brand voice rules from the `/post` skill:
- **Twitter**: Alex Hormozi style (punchy, 280 chars max)
- **LinkedIn**: Justin Welsh style (story-driven, structured)
- **Instagram**: Visual-first caption, hooks, hashtags
- **Facebook**: Conversational, community-oriented

Apply the humanize AI writing rules (no em dashes, no filler, natural tone).

---

## STEP 5: Generate 5 Visuals

Create one whiteboard infographic per weekday using Blotato's visual creation API.

### List templates first:

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
    "templateId": "<whiteboard_infographic_template_id>",
    "prompt": "<description based on the day angle/content>",
    "render": true
  }'
```

Poll for each visual's completion. Rate limit is 1/min, so space out creation requests.

The same visual URL is shared across all platform posts for that day.

---

## STEP 6: Save Content Plan

Write the complete plan to `content-plan.md` in the project root.

### Format:

```markdown
# Weekly Content Plan

**Source**: [input topic or URL]
**Generated**: [date]
**Period**: [Monday date] - [Friday date]
**Status**: DRAFT — Awaiting Review

---

## Monday — [Angle Title]

**Theme**: [one-line description of the angle]
**Visual**: [visual URL or "pending"]

### Twitter
> [full tweet text]

**Characters**: [count]/280 | **Status**: draft

### LinkedIn
> [full LinkedIn post]

**Characters**: [count]/3000 | **Status**: draft

### Instagram
> [full Instagram caption]

**Characters**: [count]/2200 | **Status**: draft

### Facebook
> [full Facebook post]

**Characters**: [count]/63206 | **Status**: draft

---

## Tuesday — [Angle Title]

[same structure...]

---

[...Wednesday, Thursday, Friday...]
```

---

## STEP 7: Human Review

After saving `content-plan.md`:

1. Tell the user: "Your weekly content plan is ready in `content-plan.md`. Please review it."
2. Explain they can:
   - Edit the file directly in VS Code
   - Select specific sections and ask you to rewrite them
   - Ask you to regenerate a specific day or platform
   - Change angles, swap days, adjust tone
3. **Wait for the user to type "approve"** (or similar confirmation) before proceeding
4. Do NOT auto-schedule. Do NOT proceed without explicit approval.

---

## STEP 8: Batch Schedule (After Approval)

Once approved, schedule all 20 posts using parallel sub-agents.

### Get connected accounts:

```bash
curl -s "https://backend.blotato.com/v2/users/me/accounts" \
  -H "blotato-api-key: $BLOTATO_API_KEY"
```

### Spawn sub-agents for parallel scheduling:

Launch **one Agent per platform** (4 agents total). Each agent schedules 5 posts (Mon-Fri) for its platform.

Agent prompt template:

```
You are scheduling 5 social media posts for [PLATFORM] using the Blotato API.

API base: https://backend.blotato.com/v2
Auth header: blotato-api-key: $BLOTATO_API_KEY
Account ID: [accountId]
Page ID: [pageId if Facebook]

Schedule each post using useNextFreeSlot: true. The posts fill the pre-configured
calendar slots in order.

Posts to schedule:

1. Monday: [post text] | Media: [visual_url]
2. Tuesday: [post text] | Media: [visual_url]
3. Wednesday: [post text] | Media: [visual_url]
4. Thursday: [post text] | Media: [visual_url]
5. Friday: [post text] | Media: [visual_url]

For each post, make this API call:

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

After each successful publish, log it to post-log.md.
Wait for each post to be confirmed before scheduling the next.
Report back the scheduled times for all 5 posts.
```

### After all agents complete:

1. Update `content-plan.md` — change all statuses from "draft" to "scheduled"
2. Update the header status to "SCHEDULED"
3. Report summary to user: dates, times, platforms, and any errors

---

## STEP 9: Log All Posts

Each sub-agent logs to `post-log.md` (same format as `/post` skill):

```markdown
| <date> | <platform> | <first 50 chars>... | <visual_url> | scheduled | <post_url> |
```

---

## SAFETY RULES

1. **NEVER schedule without explicit user approval** — always wait for "approve"
2. **ALWAYS use `useNextFreeSlot: true`** — never publish immediately
3. **Show the full plan** in `content-plan.md` before scheduling
4. **Rate limit awareness**: visual creation is 1/min, post publishing is 30/min
5. **Log every post** to `post-log.md`
6. The pre-publish hook (`validate-post.sh`) runs automatically on all publish calls

---

## BLOTATO CALENDAR SLOTS

Before using `/plan-week`, ensure posting slots are configured in Blotato:
- Go to Calendar > Weekly Schedule > Add Slot
- Add a daily slot per platform (e.g., Mon-Fri at 10:00 AM for each platform)
- `useNextFreeSlot: true` fills these slots in chronological order
- If no slots are configured, posts will fail to schedule

Remind the user to set up slots if they haven't already.
