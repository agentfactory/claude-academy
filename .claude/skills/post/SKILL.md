---
name: post
description: Create and publish social media posts. Use when user wants to post content, share to social media, publish a tweet, LinkedIn post, Instagram post, Facebook post, or schedule content. Accepts topic text, YouTube URLs, TikTok URLs, article URLs, website URLs, blog posts, PDFs, audio files, or local images/photos. Can publish to a single platform or all platforms at once using sub-agents.
user-invocable: true
argument-hint: [topic or URL] [platform or "all"]
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, WebFetch, WebSearch, Agent
---

# /post — Social Media Post Creator & Publisher

Create and publish platform-optimized social media posts from any input source.

## Arguments

- `$ARGUMENTS` — The full input: a topic, URL, or file path, optionally followed by a platform name

## Quick Reference

```
/post "AI is changing how we work" twitter
/post https://youtube.com/watch?v=... linkedin
/post https://tiktok.com/@user/video/... all
/post "Tips for founders" all
/post /path/to/image.png instagram
```

---

## STEP 1: Parse Input

Detect the input type from `$ARGUMENTS`:

1. **YouTube URL** — contains `youtube.com/watch` or `youtu.be/` → sourceType: `youtube`
2. **TikTok URL** — contains `tiktok.com` → sourceType: `tiktok`
3. **Twitter/X URL** — contains `twitter.com` or `x.com` → sourceType: `twitter`
4. **Article/Website URL** — any other `http://` or `https://` URL → sourceType: `article`
5. **PDF file** — ends in `.pdf` → sourceType: `pdf`
6. **Audio file** — ends in `.mp3`, `.wav`, `.m4a`, `.ogg`, `.flac`, `.aac` → sourceType: `audio`
7. **Local image** — ends in `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp` → use as media attachment directly
8. **Plain text** — anything else → sourceType: `text` or use as topic for content generation

Parse the **platform** from the last word of arguments:
- `twitter`, `linkedin`, `instagram`, `facebook` → single platform
- `all` → all connected platforms (use sub-agents)
- If no platform specified, ask the user which platform(s) to target

---

## STEP 2: Extract Content (if URL/file input)

For URL-based inputs, extract content using the Blotato Source Resolution API:

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

For text-based inputs with research needed, use Perplexity search:

```bash
curl -s -X POST "https://backend.blotato.com/v2/source-resolutions-v3" \
  -H "blotato-api-key: $BLOTATO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "source": {
      "sourceType": "perplexity-query",
      "text": "<topic_to_research>"
    }
  }'
```

**Poll for results** — the source resolution is async:

```bash
curl -s "https://backend.blotato.com/v2/source-resolutions-v3/<sourceId>" \
  -H "blotato-api-key: $BLOTATO_API_KEY"
```

- If `status` is `"completed"` → content is ready, extract the text/transcript
- If `status` is `"failed"` → report error to user
- Otherwise → wait 3 seconds, poll again (max 20 attempts)

---

## STEP 3: Get Connected Accounts

Fetch the user's connected social accounts to get the required `accountId`:

```bash
curl -s "https://backend.blotato.com/v2/users/me/accounts" \
  -H "blotato-api-key: $BLOTATO_API_KEY"
```

Response returns `items` array with `id`, `platform`, `fullname`, `username`.

For **Facebook** and **LinkedIn pages**, also fetch subaccounts:

```bash
curl -s "https://backend.blotato.com/v2/users/me/accounts/<accountId>/subaccounts" \
  -H "blotato-api-key: $BLOTATO_API_KEY"
```

Use the `pageId` from subaccounts when publishing to Facebook (required) or LinkedIn pages.

---

## STEP 4: Generate Post Content

Using the extracted content (or topic text), generate **2-3 draft options** for the target platform.

Apply the brand voice rules and platform-specific formatting below.

**ALWAYS show all draft options to the user and wait for them to choose before proceeding.**

### Platform Character Limits
- **Twitter**: 280 characters max
- **LinkedIn**: 3,000 characters max
- **Instagram**: 2,200 characters max
- **Facebook**: 63,206 characters max

---

## STEP 5: Generate Visual (Optional)

Default visual type: **whiteboard infographic** (not carousel).

### List available templates:

```bash
curl -s "https://backend.blotato.com/v2/videos/templates" \
  -H "blotato-api-key: $BLOTATO_API_KEY"
```

### Create a visual from template:

```bash
curl -s -X POST "https://backend.blotato.com/v2/videos/from-templates" \
  -H "blotato-api-key: $BLOTATO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "templateId": "<template_uuid>",
    "prompt": "<description of visual content based on post>",
    "render": true
  }'
```

### Poll for visual completion:

```bash
curl -s "https://backend.blotato.com/v2/videos/creations/<videoId>" \
  -H "blotato-api-key: $BLOTATO_API_KEY"
```

- Status `"done"` → visual ready, get the URL
- Status `"creation-from-template-failed"` → report error
- Otherwise → wait 5 seconds, poll again

Prefer whiteboard infographic templates. Only use carousel templates if explicitly requested.

For **local images**: skip visual generation, use the file path directly. You can pass any publicly accessible image/video URL into `mediaUrls` when publishing.

---

## STEP 6: Publish / Schedule

### Scheduling Options

Ask the user (unless they specified in the command):
1. **Publish immediately** — no scheduling fields
2. **Publish at a specific time** — set `scheduledTime` (ISO 8601)
3. **Schedule in next free slot** — set `useNextFreeSlot: true` (recommended)

**IMPORTANT: During development/testing, NEVER publish immediately. Always use `useNextFreeSlot: true` or a future `scheduledTime`.**

### Publish request:

```bash
curl -s -X POST "https://backend.blotato.com/v2/posts" \
  -H "blotato-api-key: $BLOTATO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "useNextFreeSlot": true,
    "post": {
      "accountId": "<accountId>",
      "content": {
        "text": "<post_text>",
        "platform": "<platform>",
        "mediaUrls": ["<visual_url>"]
      },
      "target": {
        "targetType": "<platform>"
      }
    }
  }'
```

**CRITICAL**: `scheduledTime` and `useNextFreeSlot` are ROOT-LEVEL fields, NOT inside `post`.
`content.platform` and `target.targetType` must match.
`mediaUrls` is required — pass `[]` for text-only posts.
For Facebook, include `"pageId": "<pageId>"` inside `target`.

### Poll for publish status:

```bash
curl -s "https://backend.blotato.com/v2/posts/<postSubmissionId>" \
  -H "blotato-api-key: $BLOTATO_API_KEY"
```

---

## STEP 7: Log the Post

After successful publishing, append to `post-log.md`:

```markdown
| <date> | <platform> | <first 50 chars of post>... | <visual_url or "none"> | <scheduled/published> | <post_url> |
```

---

## STEP 8: Multi-Platform Publishing (when platform = "all")

When the user specifies `all` as the platform:

1. Fetch all connected accounts (Step 3)
2. Generate the base content from the source material
3. **Spawn one sub-agent per platform** using the Agent tool:
   - Each sub-agent adapts the post copy for its specific platform (tone, length, format)
   - Each sub-agent applies the platform-specific brand voice
   - Each sub-agent generates or reuses the shared visual
   - Each sub-agent publishes/schedules independently
   - Each sub-agent logs its result to `post-log.md`

Example agent prompt for each platform:
```
You are publishing a social media post about [topic] to [platform].

Source content: [extracted content]
Account ID: [accountId]
Visual URL: [visual_url or "generate one"]

Apply the [platform] brand voice. Generate the post copy, confirm character limits,
and schedule using useNextFreeSlot: true.

Log the result to post-log.md.
```

Launch all platform agents in parallel for maximum speed.

---

## BRAND VOICE

### Humanize AI Writing — Base Rules (apply to ALL platforms)

NEVER use these in any post:
- Em dashes (—) — replace with hyphens (-) or rewrite
- "In today's world" / "In today's fast-paced" / "In the ever-evolving"
- "It's worth noting" / "It's important to note"
- "Let's dive in" / "Let's explore" / "Let's unpack"
- "At the end of the day"
- "Without further ado"
- "Game-changer" / "groundbreaking" / "revolutionary" / "cutting-edge"
- "Unlock" / "unleash" / "supercharge" / "skyrocket"
- "Delve" / "delve into"
- "Robust" / "seamless" / "holistic"
- "Leverage" (as a verb)
- Excessive exclamation marks

DO use:
- Short, punchy sentences mixed with longer ones
- Concrete examples and specific numbers
- Direct address ("you", "your")
- Active voice
- Natural contractions ("don't", "won't", "it's")
- Platform-native formatting (threads, line breaks, hashtags where appropriate)

### Twitter (X) Voice — Alex Hormozi Style

Characteristics:
- Ultra-concise, punchy, direct
- Pattern-interrupt opening hooks
- One idea per tweet
- Short sentences. Sometimes fragments.
- Lists and frameworks (numbered)
- Contrarian takes that challenge conventional wisdom
- No hashtags (or minimal)
- Strong closing line or CTA

Example patterns:
```
Most people [common belief].
Top performers [contrarian truth].
Here's the difference:
```

```
Stop doing [X].
Start doing [Y].
[Specific result] in [timeframe].
```

```
I spent [time] learning [topic].
Here are [N] things I wish I knew sooner:
```

### LinkedIn Voice — Justin Welsh Style

Characteristics:
- Story-driven openings (personal anecdote or observation)
- Structured with line breaks for readability
- Outcome-focused (what the reader gains)
- Professional but conversational
- Uses "I" perspective for authenticity
- Builds from story → lesson → actionable takeaway
- Ends with a question or soft CTA to drive engagement
- No hashtags in the body (optional at end)

Example pattern:
```
[Hook — surprising statement or personal story opening]

[2-3 short paragraphs building the narrative]

[The lesson or insight]

[Actionable takeaway the reader can use today]

[Engagement question]
```

### Instagram Voice

Characteristics:
- Visual-first — the image/video carries the message
- Caption supports and expands on the visual
- Opening hook in first line (only ~125 chars visible before "more")
- Use line breaks for readability
- Include a CTA ("Save this", "Share with a friend", "Drop a comment")
- 3-5 relevant hashtags at the end (not excessive)
- Emoji usage: moderate, purposeful (not every line)

### Facebook Voice

Characteristics:
- Conversational and community-oriented
- Slightly longer form than Twitter, shorter than LinkedIn
- Personal stories and relatable moments work best
- Ask questions to drive comments
- Engagement-focused (reactions, shares, comments)
- Can include links (Facebook doesn't penalize as much)
- Minimal hashtags (0-2 max)
- Warm, approachable tone

---

## BLOTATO API QUICK REFERENCE

| Endpoint | Method | Purpose | Rate Limit |
|----------|--------|---------|------------|
| `/v2/users/me` | GET | Verify API key | — |
| `/v2/users/me/accounts` | GET | List connected accounts | — |
| `/v2/users/me/accounts/:id/subaccounts` | GET | Get Facebook/LinkedIn pageId | — |
| `/v2/posts` | POST | Publish/schedule a post | 30/min |
| `/v2/posts/:id` | GET | Poll post status | 60/min |
| `/v2/source-resolutions-v3` | POST | Extract content from URL/text | 30/min |
| `/v2/source-resolutions-v3/:id` | GET | Poll source extraction status | — |
| `/v2/videos/from-templates` | POST | Create visual from template | 1/min |
| `/v2/videos/creations/:id` | GET | Poll visual creation status | — |
| `/v2/videos/templates` | GET | List available templates | — |
| `/v2/media` | POST | Upload media | — |

**Base URL**: `https://backend.blotato.com/v2`
**Auth Header**: `blotato-api-key: $BLOTATO_API_KEY`

---

## SAFETY RULES

1. **NEVER auto-publish** — always show drafts and wait for user approval
2. **NEVER publish immediately during testing** — use `useNextFreeSlot: true`
3. **Always show 2-3 draft options** before publishing
4. **Always confirm** the platform, scheduling, and content before executing the publish API call
5. **Log every post** to `post-log.md` after publishing
6. The pre-publish hook (`validate-post.sh`) runs automatically — if it blocks, fix the issue and retry
