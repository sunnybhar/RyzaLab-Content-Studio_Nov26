# Platform specs and tracking

Checked 2026-10-12 against current third-party guides, not the platforms' own help pages. Platforms change these often: confirm in the app before building a template around a number. Items marked "verify" had conflicting or missing sources.

## Formats

| Platform | Format | Size | Length and text limits |
|---|---|---|---|
| Instagram | Reel | 1080 x 1920 (9:16) | Caption up to 2,200 characters; only about the first 125 show before "more" |
| Instagram | Carousel | 1080 x 1350 (4:5) recommended | Up to 20 slides (photos and videos combined); one caption for the whole post |
| Instagram | Hashtags | | Hard cap 30; use 3 to 5 relevant ones |
| TikTok | Video | 1080 x 1920 (9:16) | Up to 10 minutes in app. Caption limit: verify in app |
| YouTube | Long video | 1920 x 1080 (16:9) | Title up to 100 characters; description up to 5,000 |
| YouTube | Short | 1080 x 1920 (9:16) | Up to 3 minutes (since Oct 2024). Hashtag display rules: verify |
| LinkedIn | Post | Images 1200 x 1500 (4:5) or 1080 x 1080 | Verify the current post length limit in app; only the first two or three lines show before "see more" |
| Facebook | Post | 1080 x 1350 (4:5) or 1080 x 1080 | Keep posts short; the first line does the work |
| Reddit | Comment or post | | Follow each subreddit's rules on self promotion, links and AI-written content |

Sources: [Metricool, Instagram limits 2026](https://metricool.com/instagram-limits/); [Growthscribe, Instagram caption limit](https://growthscribe.com/instagram-caption-character-limit/); [PostNitro, carousel limit](https://postnitro.ai/blog/post/instagram-carousel-limit-20-photos-per-post-guide); [AdCreate, YouTube Shorts length 2026](https://adcreate.com/blog/youtube-shorts-length-guide-2026); [Socialync, platform limits 2026](https://www.socialync.io/blog/social-media-platform-limits-guide-2026).

## Links and tracking (Campaign plan: a UTM tag on every link)

Every link to ryzalab.com carries UTM tags so the Monday review can see which channel booked calls.

```
https://ryzalab.com/<page>?utm_source=<platform>&utm_medium=<type>&utm_campaign=what-stays-home&utm_content=<week>-<piece>
```

| Field | Values |
|---|---|
| utm_source | instagram, tiktok, facebook, linkedin, youtube, reddit, newsletter, google-business |
| utm_medium | social, video, community, email, bio |
| utm_campaign | what-stays-home |
| utm_content | week and piece, for example `2026-11-16-nursery-reel` |

Rules: lowercase, hyphens not spaces, one link per piece. Bio links use `utm_medium=bio`. Reddit has no links in the first month.

## Primary destinations

| Destination | Use |
|---|---|
| Free 15-minute call (cal.com/ryzalab) | The primary call to action everywhere |
| Book your Blueprint | Warm leads only |
| Private Nursery Checklist (Kit form) | Lead magnet for family content |
| ryzalab.com/families | Family landing page (live from Oct 19 if published) |
