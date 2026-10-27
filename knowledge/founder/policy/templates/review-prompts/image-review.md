%% Visual review of one image candidate, for the image lane in policy/EDITORIAL_LOOP.md.
%% Not run by standards_review.py. The operator fills the <...> fields and runs it with
%% a reviewer from a family other than the candidate's generator (composer-2.5 for Nano Banana and
%% Claude Design candidates; AGY gemini for ChatGPT candidates, both OpenAI otherwise), from the
%% folder that holds the crops from `python3 scripts/image_lane.py crops`:
%% Nano Banana or Claude Design candidate (composer-2.5):
%%   cursor-agent -p -f --model composer-2.5 --output-format text "$(grep -v '^%%' policy/templates/review-prompts/image-review.md)"
%% ChatGPT candidate (AGY gemini; reading the image needs no permission flag, verified 2026-10-23;
%% if AGY is unavailable, the candidate is dropped, not reviewed by composer):
%%   agy --sandbox --model gemini-3.8-flash-high -p="$(grep -v '^%%' policy/templates/review-prompts/image-review.md)"
%% after replacing the <...> fields. Save the reply next to the crops as review.txt.
%% The brand-likeness check exists because on 2026-10-22 a Nano Banana video doorbell read
%% as a Ring product even with no logo on it.

You are a strict photo editor reviewing an AI-generated candidate header image for a home
technology consultancy's blog Note. The Note's idea: <one sentence from the Note's thesis>.

Open and inspect each file visually: the master <master path>; 720 px wide <stem>_720.jpg;
390 px wide <stem>_390.jpg; the 1200x630 social card crop <stem>_card.jpg; the 1200x670 header
crop <stem>_header.jpg.

Report each defect with a severity:

- P1, must not ship: garbled or fake text; legible letters, numbers or screen content; logos or
  brand marks; identifiable people or faces; house numbers; warped or physically impossible
  devices or hands; obvious generation artifacts.
- P1, brand likeness: any device whose shape, finish, ring, button layout or light pattern a
  reader would recognize as a specific real brand's product even with no logo (for example a
  video doorbell that reads as Ring, Nest or Eufy, a thermostat that reads as Nest or Ecobee, a
  speaker that reads as HomePod or Echo). Name the brand it resembles and the feature that
  gives it away.
- P2, should fix: mirrored, cloned or repeated objects; impossible or inconsistent light or
  shadows; an implausible installation; the subject lost in the 1200x630 or 1200x670 crop; a
  render or CGI look instead of a photograph; anything that presents the image as a real
  RyzaLab install or a real customer's home.
- P3: minor.

Say whether the image reads as an idea rather than a literal display of products.

End with exactly one line, nothing after it: `VERDICT: PASS` (no P1 or P2) or `VERDICT: FAIL`.
Do not edit or create any files.
