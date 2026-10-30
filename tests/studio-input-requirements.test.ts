import { test } from "node:test";
import assert from "node:assert/strict";
import { initialState, DEMO_ACTOR } from "../lib/studio/seed";
import { applyCommand } from "../lib/studio/engine";
import {
  confirmationMarkers,
  inputRequirements,
} from "../lib/studio/input-requirements";
import { copyBlockers } from "../lib/studio/solo-quality";
test("confirmation positions retain exact text and exclude ordinary bracket citations", () => {
  const text =
    "Café 🙂 [Ryan to confirm: real example]\n[Confirm: sensor]\n[source required]\n[Ryan to confirm: unfinished\nNEEDS_SOURCE\n[1] [R-04]";
  const found = confirmationMarkers(text);
  assert.equal(found.length, 5);
  for (const marker of found)
    assert.equal(text.slice(marker.start, marker.end), marker.text);
  assert.equal(confirmationMarkers("[1] [R-04] [optional visual]").length, 0);
});
test("all publishable fields including hidden media layers are listed and block review submission", () => {
  const s = initialState(DEMO_ACTOR, true),
    c = s.contents[0];
  c.text = "[Ryan to confirm: actual home]";
  c.metadata = "[Confirm: device]";
  c.media.narration = "[Verify: source]";
  c.media.captions = "[TODO: captions]";
  c.media.slides = [
    {
      id: "slide",
      title: "[TBD: title]",
      body: "[Confirm: body]",
      x: 10,
      y: 10,
      fontSize: 40,
      color: "#000000",
      background: "#ffffff",
      layers: [
        {
          id: "layer",
          kind: "text",
          text: "[source: overlay]",
          x: 10,
          y: 10,
          width: 50,
          height: 20,
          fontSize: 40,
          color: "#000000",
          align: "left",
        },
      ],
    },
  ] as typeof c.media.slides;
  c.media.scenes = [
    {
      id: "scene",
      title: "[Confirm: scene]",
      script: "[insert: real script]",
      duration: 5,
      preserveAudio: true,
    },
  ];
  assert.equal(inputRequirements(c).length, 9);
  assert.ok(inputRequirements(c).some((x) => x.label.includes("text layer")));
  assert.ok(copyBlockers(c).some((x) => x.includes("overlay")));
  assert.throws(
    () =>
      applyCommand(
        s,
        DEMO_ACTOR,
        { type: "content.submit", id: c.id },
        { demo: true },
      ),
    /Needs your input/,
  );
  assert.equal(c.state, s.contents[0].state);
  c.text = "A documented household routine.";
  c.metadata = "";
  c.media.narration = "";
  c.media.captions = "";
  c.media.slides = [];
  c.media.scenes = [];
  const result = applyCommand(
    s,
    DEMO_ACTOR,
    { type: "content.submit", id: c.id },
    { demo: true },
  );
  assert.equal(result.contents[0].state, "review");
});

test("in-popup save and submit is atomic, keeps history, and rejects stale or unresolved edits", () => {
  const s = initialState(DEMO_ACTOR, true),
    c = s.contents[0];
  c.state = "review";
  c.text = "Prior reviewed text.";
  c.metadata = "";
  c.media.slides = [];
  c.media.scenes = [];
  c.media.narration = "";
  c.media.captions = "";
  const command = {
    type: "content.reviewEdit",
    id: c.id,
    expectedRevision: c.revision,
    text: "A documented routine helps explain a handoff.",
    metadata: "",
  };
  const result = applyCommand(s, DEMO_ACTOR, command, { demo: true });
  const edited = result.contents[0];
  assert.equal(edited.state, "review");
  assert.equal(edited.text, command.text);
  assert.equal(edited.revision, c.revision + 1);
  assert.ok(edited.history.some((h) => h.text === c.text));
  assert.throws(
    () => applyCommand(result, DEMO_ACTOR, command, { demo: true }),
    /changed/,
  );
  assert.throws(
    () =>
      applyCommand(
        s,
        DEMO_ACTOR,
        { ...command, metadata: "[Confirm: real details]" },
        { demo: true },
      ),
    /Needs your input/,
  );
  assert.equal(s.contents[0].text, "Prior reviewed text.");
});
