import { test } from "node:test";
import assert from "node:assert/strict";
import { initialState, DEMO_ACTOR } from "../lib/studio/seed";
import { applyCommand } from "../lib/studio/engine";
import type { Job } from "../lib/studio/types";
const asset = "/api/studio/assets?id=11111111-1111-4111-8111-111111111111";
function fixture() {
  const s = initialState(DEMO_ACTOR, true),
    d = s.contents[0];
  d.state = "draft";
  d.media.slides = [
    {
      id: "slide-one",
      title: "Room",
      body: "Lighting",
      color: "#000000",
      background: "#ffffff",
      x: 0,
      y: 0,
      fontSize: 24,
    },
  ];
  const j = {
    id: "image-job",
    kind: "image",
    contentId: d.id,
    channel: d.channel,
    state: "succeeded",
    result: asset,
    prompt: "A conceptual calm home",
    createdBy: DEMO_ACTOR.email,
  } as Job;
  s.jobs = [j];
  return { s, d, j };
}
test("explicit image selection preserves writing and updates main image through revisioned save", () => {
  const { s, d, j } = fixture();
  const next = applyCommand(s, DEMO_ACTOR, {
    type: "content.image.apply",
    contentId: d.id,
    jobId: j.id,
    expectedRevision: d.revision,
    alt: "Conceptual room",
  });
  const saved = next.contents.find((x) => x.id === d.id)!;
  assert.equal(saved.media.imageUrl, asset);
  assert.equal(saved.media.imageAlt, "Conceptual room");
  assert.equal(saved.text, d.text);
  assert.equal(saved.revision, d.revision + 1);
  assert.equal(s.contents[0].media.imageUrl, undefined);
  assert.equal(next.jobs.length, 1);
});
test("slide image selection is explicit and does not replace the main image", () => {
  const { s, d, j } = fixture();
  const next = applyCommand(s, DEMO_ACTOR, {
    type: "content.image.apply",
    contentId: d.id,
    jobId: j.id,
    expectedRevision: d.revision,
    alt: "Conceptual room",
    slideId: "slide-one",
  });
  assert.equal(next.contents[0].media.slides[0].image, asset);
  assert.equal(next.contents[0].media.imageUrl, undefined);
});
test("image application rejects stale draft, unknown outcomes, unrelated assets and removed slides", () => {
  for (const failure of [
    "revision",
    "unknown",
    "other-content",
    "external-url",
    "missing-slide",
  ] as const) {
    const { s, d, j } = fixture();
    if (failure === "unknown") j.state = "unknown";
    if (failure === "other-content") j.contentId = "other";
    if (failure === "external-url") j.result = "https://example.org/image.png";
    assert.throws(() =>
      applyCommand(s, DEMO_ACTOR, {
        type: "content.image.apply",
        contentId: d.id,
        jobId: j.id,
        expectedRevision: d.revision + (failure === "revision" ? 1 : 0),
        alt: "Conceptual room",
        slideId: failure === "missing-slide" ? "deleted" : undefined,
      }),
    );
  }
});
test("image attachment requires current content editing permission", () => {
  const { s, d, j } = fixture();
  assert.throws(() =>
    applyCommand(
      s,
      { id: "outsider", email: "outsider@example.com" },
      {
        type: "content.image.apply",
        contentId: d.id,
        jobId: j.id,
        expectedRevision: d.revision,
        alt: "Conceptual room",
      },
    ),
  );
});
test('founder enables image function without increasing an existing package cap',()=>{let {s,d}=fixture();s=applyCommand(s,DEMO_ACTOR,{type:'policy.adoptSolo',expectedRuleVersion:s.settings.protectedVersion,packageCap:50,monthlyCap:500,requireIndependentReview:false,autoDraft:false,autoReview:false},{demo:true});s=applyCommand(s,DEMO_ACTOR,{type:'preparation.authorize',contentId:d.id,expectedRevision:d.revision,maxCents:50},{demo:true});s.preparations![0].functions=['text','review'];s=applyCommand(s,DEMO_ACTOR,{type:'preparation.authorize',contentId:d.id,expectedRevision:d.revision,maxCents:50,includeImages:true},{demo:true});assert.equal(s.preparations![0].maxCents,50);assert.ok(s.preparations![0].functions.includes('image'));assert.equal(s.jobs.length,1,'authorization must not create a provider request');});
