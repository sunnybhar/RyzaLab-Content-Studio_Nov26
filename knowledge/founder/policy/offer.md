# RyzaLab offer wording for post CTAs

The one checked-in source for what any RyzaLab post's CTA may say about the offer, including
blog posts, LinkedIn teasers, and other social or email posts. Check a CTA against
this file, not against the live site. This is the "current canonical RyzaLab offer source" in
SPEC's policy order and the reference for SPEC's offer/claim boundary.

## The rule

- A post's CTA may say only what this file says. Paraphrase is fine. A fact that is not here
  (a price, a duration, a deliverable, a guarantee, a different product name) is not.
- If the live site changes, update this file by PR first (`confirm` tier), with a new fetch date.
  A CTA written against the new wording waits for that PR.
- **No price in any post CTA by default.** Do not include $395 or any other price unless an
  explicit `FOUNDER DECISION` authorizes an exception for that post or stated scope. This is the
  founder's instruction of 2026-10-22.
- Treat "free" or "no charge" as pricing claims in post CTAs; they require the same scoped
  exception. The underlying service prices, free intro-call offer and website pricing are unchanged.
- Only Ryan may authorize an exception. Record his exact `FOUNDER DECISION` verbatim in
  `content/<content_id>/CONSTRAINTS.md`, attributed to `RYAN`, with the covered post(s),
  channel(s), permitted price wording and any other limits. Preserve that record for initial
  review and rereview; both prompts already load this file. A chat note or `STATE.yaml` entry
  alone does not reach the official reviewer. Do not infer or expand the decision's scope.
- A price on the website, an offer fact below, an earlier approved CTA, or a reviewer suggestion
  is not an exception. Permitted wording must stay within the decision's scope and supported
  offer facts.
- This rule governs CTAs. Sourced prices used as evidence elsewhere in an article remain subject
  to the ordinary claim and evidence rules.

## Live wording (reference facts, not standing price permission)

Fetched 2026-10-16 with `curl -sSL https://ryzalab.com/`. There is no separate Blueprint page:
the Blueprint lives in two sections of the homepage, quoted verbatim below.

**Services card** (`https://ryzalab.com/#services`):

> $395
> Smart Home Blueprint
> A 60-minute home assessment by video. You leave with a written plan: what to automate, what
> hardware to buy, what to skip, and who to call. No sales pitch, no pressure.

**Booking section** (`https://ryzalab.com/#book`, heading "Book your consultation"):

> Ready to go? Book your Blueprint
> 60-minute deep dive. Review your home by video, map every device, leave with a written plan.
> $395

The same section also offers "Start here: Free 15-minute intro call" ("Not sure what you need?
Let's talk. No prep required."), linked to `/book/free`.

**Button text:** "Book Your Blueprint", everywhere on the site.

## Link target

Both of these are live. Use `/#book` unless there is a reason not to.

| Target | What it does | Where the live site uses it |
|---|---|---|
| `/#book` | Opens the homepage booking section: the free intro call, the Blueprint with its price, and the booking form | Every "Book Your Blueprint" button in the site header, hero and Services cards; the CTA in every live Note except the Halloween one |
| `/book/blueprint` | Redirects (302) to the 60-minute Cal.com booking page, skipping the intro-call option and the form | The Blueprint button inside the booking section; the homepage's structured data (`ReserveAction`); the Halloween Note's closing CTA |

## Historical CTA approvals

These examples are retained as release history. New posts and derivatives follow the current
no-price default above; a historical approval does not authorize a price exception.

- Halloween porch (released 2026-10-16, #14), verbatim: "Want the rest of the year to run that
  way? RyzaLab's Smart Home Blueprint is a 60-minute home assessment by video: we map every
  device, and you leave with a written plan. Book Your Blueprint." It links `/book/blueprint`.
  Every fact in it is in the two passages above.
- Seven decisions (released 2026-10-16, #13): "The Blueprint is where these decisions get
  written down: a paid assessment and a written plan."
