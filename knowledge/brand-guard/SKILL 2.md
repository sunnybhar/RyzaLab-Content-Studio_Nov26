---
name: ryzalab-brand-guard
description: RyzaLab's brand brain and claim checker. Use whenever writing, editing or reviewing anything RyzaLab will show a customer, partner or the public (landing pages, emails, newsletters, social posts, Reels scripts, ads, flyers, one-pagers, partner sheets, outreach messages, Google Business posts), and whenever someone asks what RyzaLab may claim, which prices are live, or how RyzaLab talks about privacy. Also use it to check copy written by other RyzaLab skills before it is returned.
---

# RyzaLab brand guard

RyzaLab sells privacy. One overclaim ("nothing ever leaves your home", "keeps your baby safe", "trusted by families") costs more than a hundred good posts earn. This skill holds the single source of truth about what RyzaLab is and may say, and checks every draft against it.

## Reference files

Read only what the task needs:

| File | Read it when |
|---|---|
| `references/company.md` | Stating any fact, offer, price or process. Check the status column: only LIVE facts go in public copy |
| `references/positioning.md` | Choosing the message, pillar, audience angle or call to action |
| `references/voice.md` | Writing or editing copy |
| `references/proof-library.md` | Citing any statistic, public case or proof point |
| `references/guardrails.md` | Reviewing a draft (always) |
| `references/decisions.md` | A topic might be undecided (prices, plan names, segments, age range) |

## Reviewing a draft

1. **Identify the audience and channel.** Audience is one of: `general`, `family`, `elder`, `renter`, `diy`, `trade`. Ask only if you can't tell.
2. **Run the automated check** if you can run code:
   ```
   python3 scripts/claim_check.py draft.md --audience family
   ```
   It exits 2 when blocked, 1 when fixes are needed, 0 when only human review remains. If you cannot run code, apply `scripts/rules.json` by reading it.
3. **Do the judgment checks the script cannot do.** Go through these against the reference files:
   - Is every factual statement in `company.md` (LIVE) or `proof-library.md`? Mark anything else `[Ryan to confirm: ...]`.
   - Is every offer and price LIVE? PENDING items stay out of public copy.
   - Does each privacy statement describe the setup ("local where supported", "we name every cloud dependency") rather than promise an outcome?
   - Family or elder content: no safety or health outcome, implied or explicit, and the "not a medical device" line on pages, emails and long posts.
   - Any implied traction, testimonial, client story or result that doesn't exist yet?
   - Client homes, faces, addresses, screens: consent and blurring noted?
   - Sponsored, gifted or affiliate content disclosed?
   - One primary call to action, matching `positioning.md`?
   - Voice: calm expert, plain spoken, warm and candid. "We" for the business, "I" only for Ryan.
4. **Return the review** in this format:

   ```
   Verdict: BLOCKED | FIX FIRST | READY FOR RYAN'S APPROVAL
   Audience / channel: ...

   Must fix
   | Line or quote | Problem | Rule | Fix |

   Should fix
   | ... |

   Ryan to confirm
   - each claim or placeholder that needs his sign-off

   Revised copy
   (the full piece with every fix applied, placeholders kept in [square brackets])
   ```

   Even a clean piece ends at READY FOR RYAN'S APPROVAL, never "approved". Ryan approves every claim before publishing (Campaign plan).

## Writing new copy

1. Read `company.md`, `positioning.md` and `voice.md` first, and `proof-library.md` if you will cite anything.
2. Write for one audience and one call to action.
3. Never invent a quote, review, client, result, number, date or offer. Use a `[placeholder]` and list it under "Ryan to confirm".
4. Run the review steps above on your own draft and fix everything before returning it. Return the draft and the review summary together.

## Updating the brand brain

When Ryan makes a decision:
1. Change its row in `references/decisions.md` to APPROVED with the date and the choice.
2. Update the matching rows in `company.md` and `positioning.md`.
3. If it changes what is allowed (for example a new price goes live), update `scripts/rules.json` (move the price from `pending` to `live`) and run the tests: `python3 -m unittest discover tests` from the repository root.

Never edit the reference files to make a draft pass.
