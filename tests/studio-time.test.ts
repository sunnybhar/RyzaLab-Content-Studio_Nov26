import { test } from "node:test";
import assert from "node:assert/strict";
import { budgetMonth, nextOccurrence } from "../lib/studio/time";
test("budget month follows Studio timezone at UTC month boundary", () => {
  assert.equal(
    budgetMonth("2026-11-01T02:00:00Z", "America/New_York"),
    "2026-10",
  );
  assert.equal(
    budgetMonth("2026-11-01T06:00:00Z", "America/New_York"),
    "2026-11",
  );
});
test("weekly recurrence preserves local hour across daylight saving and skips missed occurrences", () => {
  assert.equal(
    nextOccurrence("2026-10-27T13:00:00Z", "America/New_York", 7),
    "2026-11-03T14:00:00.000Z",
  );
  assert.equal(
    nextOccurrence(
      "2026-10-01T13:00:00Z",
      "America/New_York",
      7,
      "2026-10-27T14:00:00Z",
    ),
    "2026-10-29T13:00:00.000Z",
  );
});
test("a nonexistent daylight-saving local time requires explicit rescheduling", () => {
  assert.throws(
    () => nextOccurrence("2026-03-01T07:30:00Z", "America/New_York", 7),
    /daylight/,
  );
});
