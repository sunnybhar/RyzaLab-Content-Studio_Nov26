import { test } from "node:test";
import assert from "node:assert/strict";
import {
  documentSections,
  unplacedSectionImages,
} from "../lib/studio/document-sections";
import { initialState, DEMO_ACTOR } from "../lib/studio/seed";
import { applyCommand } from "../lib/studio/engine";
import { contentWording } from "../lib/studio/content-wording";
import { verifyApprovalAssets } from "../lib/studio/assets";
import { serializeProject, importProject } from "../lib/studio/exports";
const url = "/api/studio/assets?id=11111111-1111-4111-8111-111111111111";
test("section keys survive inserted paragraphs and distinguish repeated headings without stripping C#", () => {
  const first = documentSections("## First\nText\n## C#\n## First");
  const moved = documentSections(
    "Introduction\n\n## First\nLonger text\n## C#\n## First",
  );
  assert.deepEqual(
    first.map((s) => s.key),
    moved.map((s) => s.key),
  );
  assert.notEqual(first[0].key, first[2].key);
  assert.equal(first[1].title, "C#");
});
test("same-draft image can be placed in a real article section; replacement does not create duplicate figures", () => {
  const s = initialState(DEMO_ACTOR, true),
    d = s.contents[0];
  d.state = "draft";
  d.format = "Blog";
  d.text =
    "## Background\nA practical context.\n## Limitations\nWhat remains uncertain.";
  s.jobs = [
    {
      id: "image-job",
      kind: "image",
      contentId: d.id,
      channel: d.channel,
      state: "succeeded",
      result: url,
      prompt: "Conceptual room",
    } as any,
  ];
  const key = documentSections(d.text)[1].key;
  let n = applyCommand(s, DEMO_ACTOR, {
    type: "content.image.apply",
    contentId: d.id,
    jobId: "image-job",
    expectedRevision: d.revision,
    alt: "Concept illustration",
    caption: "AI-generated concept.",
    sectionKey: key,
  });
  assert.equal(n.contents[0].media.sectionImages?.[0].section, key);
  assert.match(contentWording(n.contents[0]), /AI-generated concept/);
  assert.equal(
    unplacedSectionImages(n.contents[0].text, n.contents[0].media).length,
    0,
  );
  n = applyCommand(n, DEMO_ACTOR, {
    type: "content.image.apply",
    contentId: d.id,
    jobId: "image-job",
    expectedRevision: n.contents[0].revision,
    alt: "Updated description",
    sectionKey: key,
  });
  assert.equal(n.contents[0].media.sectionImages?.length, 1);
  assert.throws(() =>
    applyCommand(n, DEMO_ACTOR, {
      type: "content.image.apply",
      contentId: d.id,
      jobId: "image-job",
      expectedRevision: n.contents[0].revision,
      alt: "Description",
      sectionKey: "removed",
    }),
  );
  assert.equal(
    unplacedSectionImages("## Changed heading", n.contents[0].media).length,
    1,
  );
  assert.deepEqual(
    importProject(serializeProject(n.contents[0].media)),
    n.contents[0].media,
  );
});
test("section assets require exact immutable draft ownership before final approval", async () => {
  const s = initialState(DEMO_ACTOR, true),
    d = s.contents[0];
  d.media.sectionImages = [
    {
      id: "figure",
      section: "section:0:Background",
      url,
      alt: "Concept",
      caption: "AI-generated concept.",
    },
  ];
  let finds = 0;
  await verifyApprovalAssets(
    d,
    async () => {
      finds++;
      return {
        content_id: d.id,
        object_path: "retained/image",
        mime: "image/png",
      };
    },
    async () => ({ size: 100, contentType: "image/png" }),
  );
  assert.equal(finds, 1);
  await assert.rejects(
    () =>
      verifyApprovalAssets(
        d,
        async () => ({
          content_id: "another-draft",
          object_path: "retained/image",
          mime: "image/png",
        }),
        async () => ({ size: 100, contentType: "image/png" }),
      ),
    /belong to this exact content/,
  );
});
test("AI text correction can fix supplied image descriptions/captions without replacing their assets", async () => {
  const s = initialState(DEMO_ACTOR, true),
    d = s.contents[0];
  d.state = "draft";
  d.format = "Text post";
  d.copyAcceptances = [];
  d.media.imageUrl = url;
  d.media.imageAlt = "An earlier concept description";
  d.media.imageCaption = "Earlier wording";
  const { copyIdentity } = await import("../lib/studio/solo-quality");
  const { settleWrittenOutput } =
    await import("../lib/studio/draft-candidates");
  const job = {
    id: "caption-candidate",
    kind: "text",
    contentId: d.id,
    channel: d.channel,
    account: d.account,
    createdBy: DEMO_ACTOR.email,
    outputContract: "draft_v1",
    targetRevision: d.revision,
    targetIdentity: copyIdentity(d, s),
    targetAccepted: false,
    connectionSnapshot: {
      provider: "openai",
      model: "fixture",
      function: "text",
    },
  } as any;
  settleWrittenOutput(
    s,
    job,
    {
      completion: "complete",
      text: JSON.stringify({
        body: "A practical handoff explains routines and limitations.",
        metadata: "",
        sources: [],
        questions: [],
        imageCaptions: [
          {
            imageId: "hero",
            alt: "Conceptual living room",
            caption: "AI-generated concept; not a real installation.",
          },
        ],
      }),
    },
    new Date().toISOString(),
  );
  assert.equal(job.outputStatus, "applied");
  assert.equal(d.media.imageUrl, url);
  assert.equal(
    d.media.imageCaption,
    "AI-generated concept; not a real installation.",
  );
  assert.ok(d.history.some((h) => h.media.imageCaption === "Earlier wording"));
});
test("invented image identifiers never alter the current draft", async () => {
  const s = initialState(DEMO_ACTOR, true),
    d = s.contents[0];
  d.state = "draft";
  d.format = "Text post";
  d.copyAcceptances = [];
  const before = d.text;
  const { copyIdentity } = await import("../lib/studio/solo-quality");
  const { settleWrittenOutput } =
    await import("../lib/studio/draft-candidates");
  const job = {
    id: "invented-image",
    kind: "text",
    contentId: d.id,
    channel: d.channel,
    account: d.account,
    createdBy: DEMO_ACTOR.email,
    outputContract: "draft_v1",
    targetRevision: d.revision,
    targetIdentity: copyIdentity(d, s),
    targetAccepted: false,
  } as any;
  settleWrittenOutput(
    s,
    job,
    {
      completion: "complete",
      text: JSON.stringify({
        body: "This new body must not replace existing writing.",
        metadata: "",
        sources: [],
        questions: [],
        imageCaptions: [
          {
            imageId: "unprovided-asset",
            alt: "An invented image",
            caption: "Not supplied.",
          },
        ],
      }),
    },
    new Date().toISOString(),
  );
  assert.equal(job.outputStatus, "invalid");
  assert.equal(d.text, before);
});
test('final approval freezes supported document layout separately from later channel resource changes',()=>{let s=initialState(DEMO_ACTOR,true);s=applyCommand(s,DEMO_ACTOR,{type:'policy.adoptSolo',expectedRuleVersion:s.settings.protectedVersion,packageCap:50,monthlyCap:500,requireIndependentReview:false,autoDraft:false,autoReview:false},{demo:true});const d=s.contents[0];d.channel='Newsletter';d.format='Newsletter';d.state='review';d.text='A practical household handoff explains useful routines and limitations.';d.metadata='';d.media={slides:[],scenes:[],imagePrompt:'',narration:'',captions:'',aspect:'1:1'};s.agentRuleFiles=[{id:'layout-resource',channel:'Newsletter',slot:'newsletter_layout',fileName:'layout.md',base64:Buffer.from('{}').toString('base64'),byteSize:2,extractedText:JSON.stringify({font:'Georgia',bodySize:12}),uploadedBy:DEMO_ACTOR.email,uploadedAt:new Date().toISOString()}];s=applyCommand(s,DEMO_ACTOR,{type:'package.approve',contentId:d.id,expectedRevision:d.revision,expectedWorkflowId:s.workflows.find(w=>w.channel==='Newsletter'&&w.status==='active')!.id,expectedRuleVersion:s.settings.protectedVersion,expectedPolicyVersion:s.settings.reviewPolicy!.version,singleReview:true,handoff:true},{demo:true});assert.equal(s.packages[0].documentLayout?.font,'Georgia');s.agentRuleFiles![0].extractedText=JSON.stringify({font:'Arial'});assert.equal(s.packages[0].documentLayout?.font,'Georgia');});
