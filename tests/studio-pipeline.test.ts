import { test } from "node:test";
import assert from "node:assert/strict";
import { applyCommand } from "../lib/studio/engine";
import { initialState, DEMO_ACTOR } from "../lib/studio/seed";
import {
  pipelineInstant,
  pipelineRowSchema,
  type PipelineRow,
} from "../lib/studio/pipeline";
import {
  excelDate,
  excelTime,
  previewCalendar,
  suggestMapping,
} from "../lib/studio/calendar-workbook";
import { filteredState } from "../lib/studio/permissions";

const row: PipelineRow = {
  externalId: "BRIEF-01",
  title: "Local controls before construction",
  angle: "Describe electrical planning and ownership.",
  channel: "LinkedIn",
  account: "RyzaLab",
  format: "Text post",
  audience: "Homeowners",
  plannedDate: "2026-11-10",
  plannedTime: "12:15",
  timezone: "America/New_York",
  sourceUrls: ["https://example.org/building"],
  existingCopy: "Existing unapproved source text",
  notes: "Imported source checks are unverified",
  historical: false,
  sheet: "Calendar",
  row: 2,
};
const start = () => initialState(DEMO_ACTOR, true);
const upload = (
  s = start(),
  data = row,
  key = "import-1",
  update = false,
  expectedVersion?: number,
) =>
  applyCommand(s, DEMO_ACTOR, {
    type: "pipeline.import",
    fileName: "calendar.xlsx",
    requestKey: key,
    rows: [{ data, update, expectedVersion }],
  });
test("calendar import persists one linked brief, records history, and never creates approvals, schedules, jobs or duplicate ideas", () => {
  const base = start(),
    next = upload(base);
  assert.equal(next.pipelineBriefs!.length, 1);
  assert.equal(next.pipelineBriefs![0].plannedAt, "2026-11-10T17:15:00.000Z");
  for (const name of [
    "contents",
    "ideas",
    "packages",
    "schedules",
    "jobs",
  ] as const)
    assert.deepEqual(next[name], base[name]);
  assert.equal(next.pipelineImports![0].created, 1);
  assert.deepEqual(upload(next), next);
  const reimport = upload(next, row, "import-2");
  assert.equal(reimport.pipelineBriefs!.length, 1);
  assert.equal(reimport.pipelineImports![0].skipped, 1);
  const stored = JSON.parse(JSON.stringify(reimport));
  assert.equal(stored.pipelineBriefs[0].title, row.title);
});
test("updates require preview version, preserve linked draft context, and import is atomic across rows", () => {
  const s = upload();
  assert.throws(
    () => upload(s, { ...row, title: "Changed" }, "stale", true, 2),
    /changed since preview/,
  );
  const updated = upload(s, { ...row, title: "Changed" }, "update", true, 1);
  assert.equal(updated.pipelineBriefs![0].version, 2);
  assert.equal(updated.pipelineBriefs![0].history?.[0].data.title,row.title);
  const draft = applyCommand(updated, DEMO_ACTOR, {
    type: "pipeline.draft",
    briefId: updated.pipelineBriefs![0].id,
    channel: "LinkedIn",
    requestKey: "write",
  });
  assert.throws(() => upload(draft, row, "locked", true, 2), /linked content/);
  assert.equal(draft.contents[0].pipelineSnapshot?.title, "Changed");
  assert.throws(
    () =>
      applyCommand(s, DEMO_ACTOR, {
        type: "pipeline.import",
        fileName: "calendar.xlsx",
        requestKey: "duplicate",
        rows: [
          { data: row, update: false },
          { data: row, update: false },
        ],
      }),
    /Duplicate Brief ID/,
  );
  assert.equal(s.pipelineBriefs!.length, 1);
});
test("pipeline can write directly as a post or newsletter without AI or intermediate idea; explicit retries are idempotent", () => {
  const s = upload();
  const command = {
    type: "pipeline.draft",
    briefId: s.pipelineBriefs![0].id,
    channel: "Newsletter",
    requestKey: "direct-news",
  };
  const next = applyCommand(s, DEMO_ACTOR, command),
    draft = next.contents[0];
  assert.equal(draft.channel, "Newsletter");
  assert.equal(draft.format, "Newsletter");
  assert.equal(draft.text, row.existingCopy);
  assert.equal(draft.pipelineSnapshot?.id, s.pipelineBriefs![0].id);
  assert.equal(next.jobs.length, s.jobs.length);
  assert.equal(next.ideas.length, s.ideas.length);
  assert.deepEqual(applyCommand(next, DEMO_ACTOR, command), next);
  assert.throws(
    () => applyCommand(next, DEMO_ACTOR, { ...command, channel: "LinkedIn" }),
    /already used/,
  );
});
test("manual and generated ideas retain pipeline origin through writing and source URLs", () => {
  let s = upload();
  const brief = s.pipelineBriefs![0];
  s = applyCommand(s, DEMO_ACTOR, {
    type: "idea.create",
    pipelineBriefId: brief.id,
    title: brief.title,
    brief: brief.angle,
    channel: "LinkedIn",
  });
  const idea = s.ideas[0];
  assert.deepEqual(idea.sources, row.sourceUrls);
  assert.equal(idea.pipelineSnapshot?.id, brief.id);
  s = applyCommand(
    s,
    DEMO_ACTOR,
    { type: "idea.use", id: idea.id, format: "Text post", account: "RyzaLab" },
    { demo: true },
  );
  assert.equal(s.contents[0].pipelineBriefId, brief.id);
  const before = s.ideas.length;
  s = applyCommand(
    s,
    DEMO_ACTOR,
    {
      type: "idea.generate",
      pipelineBriefId: brief.id,
      channel: "LinkedIn",
      topic: brief.title,
      audience: brief.audience,
      quantity: 2,
      research: false,
      sourceText: brief.angle,
      idempotencyKey: "pipeline-ai",
    },
    { demo: true },
  );
  assert.equal(s.ideas.length, before + 2);
  assert.equal(s.ideas[0].pipelineSnapshot?.version, 1);
});
test("imports enforce permissions, destination allowlist and safe source URLs; filtered viewers cannot see another scoped pipeline", () => {
  let s = upload();
  const viewer = { id: "viewer", email: "viewer@example.com" };
  s.members.push({
    ...viewer,
    roles: ["viewer"],
    revoked: false,
    grants: [{ action: "read", channel: "Newsletter" }],
  });
  assert.throws(
    () =>
      applyCommand(s, viewer, {
        type: "pipeline.import",
        fileName: "x.xlsx",
        requestKey: "forbidden",
        rows: [{ data: row, update: false }],
      }),
    /idea.edit/,
  );
  assert.equal(filteredState(s, viewer).pipelineBriefs?.length, 0);
  assert.equal(filteredState(s, viewer).pipelineImports?.length, 0);
  assert.throws(
    () =>
      applyCommand(s, viewer, {
        type: "pipeline.draft",
        briefId: s.pipelineBriefs![0].id,
        channel: "Newsletter",
        requestKey: "read-hidden",
      }),
    /read/,
  );
  assert.equal(
    pipelineRowSchema.safeParse({ ...row, channel: "Hub" }).success,
    false,
  );
  assert.equal(
    pipelineRowSchema.safeParse({ ...row, sourceUrls: ["javascript:alert(1)"] })
      .success,
    false,
  );
});
test("calendar dates support 1900/1904, reject leap-bug dates, and DST ambiguity never guesses a publishing time", () => {
  assert.equal(excelDate("1"), "1900-01-01");
  assert.equal(excelDate("59"), "1900-02-28");
  assert.throws(() => excelDate("60"));
  assert.equal(excelDate("61"), "1900-03-01");
  assert.equal(excelDate("1", true), "1904-01-02");
  assert.equal(excelDate("0", true), "1904-01-01");
  assert.equal(excelTime("0.5"), "12:00");
  assert.equal(excelTime("12:15 PM"), "12:15");
  assert.equal(excelTime("12:00 AM"), "00:00");
  assert.throws(() => excelTime("25:01"));
  assert.throws(
    () => pipelineInstant("2026-11-01", "01:30", "America/New_York"),
    /ambiguous/,
  );
  assert.throws(
    () => pipelineInstant("2026-03-08", "02:30", "America/New_York"),
    /missing or ambiguous/,
  );
  assert.throws(() => pipelineInstant("2026-02-30", "12:00", "UTC"), /Invalid/);
  assert.throws(
    () => upload(start(), { ...row, plannedDate: undefined }),
    /time needs a date/,
  );
});
test("mixed workbook preview skips blank titles, flags unsupported channels and combined destinations, retains history without approval", () => {
  const headers = [
      "Working title",
      "Angle / notes",
      "Channel / account",
      "Date",
      "Time (ET)",
      "Status",
    ],
    mapping = suggestMapping(headers);
  const preview = previewCalendar(
    {
      name: "Calendar",
      rows: [
        { number: 1, values: headers },
        {
          number: 2,
          values: [
            "Plan",
            "Details",
            "LinkedIn",
            "2026-11-10",
            "12:15",
            "Published",
          ],
        },
        {
          number: 3,
          values: ["Combined", "Details", "Website + LinkedIn", "2026-11-11"],
        },
        { number: 4, values: ["Website", "", "Website"] },
        { number: 5, values: ["", "formatted only"] },
      ],
    },
    mapping,
    {
      date1904: false,
      timezone: "America/New_York",
      defaultChannel: "LinkedIn",
      headerRow: 1,
    },
  );
  assert.equal(preview.length, 3);
  assert.equal(preview[0].data?.historical, true);
  assert.match(preview[0].data!.notes, /unverified/);
  assert.match(preview[1].warning!, /LinkedIn only/);
  assert.match(preview[2].error!, /unsupported destination/);
});

test("reschedule a pipeline brief without changing its imported copy or linked draft snapshot", () => {
  const base = upload();
  const original = base.pipelineBriefs![0];
  const withDraft = applyCommand(base, DEMO_ACTOR, {
    type: "pipeline.draft", briefId: original.id, channel: "LinkedIn", requestKey: "linked",
  });
  const move = { type: "pipeline.reschedule", id: original.id, expectedVersion: original.version,
    plannedDate: "2026-11-12", plannedTime: "13:30" };
  const moved = applyCommand(withDraft, DEMO_ACTOR, move);
  const brief = moved.pipelineBriefs![0];
  assert.equal(brief.plannedAt, "2026-11-12T18:30:00.000Z");
  assert.equal(brief.version, 2);
  assert.equal(brief.history?.at(-1)?.data.plannedDate, original.plannedDate);
  assert.equal(brief.existingCopy, original.existingCopy);
  assert.deepEqual(moved.contents, withDraft.contents);
  assert.deepEqual(moved.jobs, withDraft.jobs);
  assert.throws(() => applyCommand(moved, DEMO_ACTOR, move), /brief changed/i);
  const dateOnly = applyCommand(moved, DEMO_ACTOR, { ...move, expectedVersion: brief.version, plannedTime: undefined });
  assert.equal(dateOnly.pipelineBriefs![0].plannedAt, undefined);
});
