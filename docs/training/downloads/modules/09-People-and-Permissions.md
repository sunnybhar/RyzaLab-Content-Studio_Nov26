# RyzaLab Training — People and Access — Profiles and Scoped Grants

Version: 2026-10-30 | Audience: Administrator with membership permission; founder for founder policy

## Objective
Assign membership by email while supporting a solo founder or a larger team.

## Before you start
Live authentication and database must be configured for actual teammate access.

## Availability
Available in preview. Live operation requires the configured /studio workspace. Release 0.3.2: the two-decision flow requires explicit founder adoption; any legacy stage instructions below apply only before adoption. No paid provider or live-account acceptance is implied by these documents.

## Step-by-step workflow
1. Both administrators and founders can manage every person and assign any role, including founder. Use role checkboxes in Edit access, or Set up founder access for your own administrator account. No additional email setting or API key is required. Role changes are audited and keep at least one active administrator or founder.
2. Open People & access. Review existing members, profiles and any scoped grants.
3. Choose the add-member control. Enter the teammate email exactly. Assign only the profiles needed: founder, administrator, manager, editor, creator or viewer.
4. When supported by the live member form, use an initial password to create a sign-in account without an invitation email. Share it through a separate secure channel; never put it in the QA workbook.
5. One person can have multiple profiles. Explicitly assigning Founder grants founder authority and must be deliberate and auditable.
6. Use scoped grants only if needed. The current advanced form accepts JSON. Channel/content/account/function restrictions must match within one grant; ask the administrator to validate complex grants.
7. Test the member in a separate browser profile. Verify assigned drafts, read visibility and allowed actions before granting broader access.
8. Edit profiles or revoke membership as responsibilities change. Confirm the account loses access after revocation.
9. In preview, member changes are local demonstrations; they do not invite a real person or create a Supabase account.

## Expected result
Access is enforced by server/database rules and scoped grants, not just hidden UI controls.

## Practice exercise
In preview, add a sample viewer profile. For live acceptance, test a real invited viewer in a separate session and verify editing/approval are denied.

## Common problems and boundaries
Cannot log in: verify actual account provisioning and membership, not just a preview row. Founder authority and administrator access are distinct. Keep email addresses used in QA limited to test accounts.

## Completion checklist
- I can locate this section and explain its purpose.
- I completed the practice exercise or marked the live dependency as blocked.
- I recorded actual results in the QA workbook.
- I did not treat preview samples as real agent output or live publication.
