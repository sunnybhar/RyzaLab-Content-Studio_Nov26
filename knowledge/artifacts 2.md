# Artifacts: what every RyzaLab project produces

Claude.ai project chats can't see each other. These standard artifacts are how work moves between projects and into the scheduling tools: the Hub produces a Weekly Brief, each channel project turns it into a Content Pack, and everything ends in a Content Log row.

Make each one a Claude artifact (a document, or HTML for previews) so it can be copied, downloaded or saved back into project knowledge.

## 1. Weekly Brief (made by the Hub project)

```
# Weekly Brief: week of <date>
Theme: <from the campaign calendar>
Hero piece: <title> (format, owner, film or write date)
Core message this week: <one line from positioning>
Proof we will show: <proof library or first-party proof IDs, e.g. R-02 offline demo>
Audience focus: <family | elder | renter | diy | trade>
Call to action: <one, with its UTM link>
Do not say this week: <any pending decision or risky claim relevant to the topic>
Ryan to confirm: <facts, footage, placeholders>

| Channel | Pieces this week | Angle | Due |
|---|---|---|---|
| Instagram | 3 Reels, 2 carousels | ... | ... |
| TikTok | Reels repurposed | ... | ... |
| Facebook | ... | ... | ... |
| LinkedIn | 2 Ryan posts (+ newsletter) | ... | ... |
| YouTube | ... | ... | ... |
| Reddit | Answer themes to watch for | ... | daily |
| Newsletter | Issue <n>: <title> | ... | Tue |
```

The user pastes the Weekly Brief as the first message of the week's chat in each channel project.

## 2. Content Pack (made by each channel project)

```
# <Channel> Content Pack: week of <date>
Brief: <hero piece and theme, one line>

| # | Piece | Format | Hook | Publish date | Status |
|---|---|---|---|---|---|

## Piece 1: <name>
Format and specs: <from platform-specs.md>
Hook (first line or first 2 seconds):
Script or copy:
On-screen text:
Caption:
Hashtags (if the platform uses them):
Visual direction: <what to film or design, per visual-identity.md>
Alt text:
Call to action and link: <UTM link>
Ryan to confirm: <claims, placeholders, footage>

(repeat per piece)

## Brand guard result
Verdict: BLOCKED | FIX FIRST | READY FOR RYAN'S APPROVAL
Issues fixed: ...
Still needs Ryan: ...
```

## 3. Video Script (Reels, TikTok, Shorts, YouTube)

| Time | Shot (what we see) | On-screen text | Voiceover or dialogue |
|---|---|---|---|
| 0:00 to 0:02 | Hook shot | Hook line | ... |

End every script with the call to action shot and a note of anything that must be blurred.

## 4. Carousel Preview (HTML artifact)

A single HTML artifact that renders every slide at 1080 x 1350 scaled to fit, in the colors and type from `visual-identity.md`, one slide under the next, with slide numbers. It is a preview and a brief for Canva, not the final design. Use Google Fonts (Manrope, Inter). No external images: use a labeled placeholder box for each photo with a one-line shot description.

## 5. Content Log row

Every pack ends with rows to paste into the scheduling sheet (Metricool, Buffer or the KPI tracker), as CSV:

```
publish_date,channel,piece,format,theme,cta,utm_link,owner,status
2026-11-16,instagram,nursery-camera-reel,reel,private-nursery,free-call,https://ryzalab.com/families?utm_source=instagram&utm_medium=social&utm_campaign=what-stays-home&utm_content=2026-11-16-nursery-reel,sunny,draft
```

Status values: draft, ryan-review, approved, scheduled, published.

## 6. Performance Note (any project, after publishing)

When the user pastes results (views, saves, clicks, booked calls), return: what worked, what didn't, one change for next week, and the metric that matters most in the campaign plan, booked calls per 1,000 views. Never invent numbers that weren't given.
