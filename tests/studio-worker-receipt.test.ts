import { test } from "node:test";
import assert from "node:assert/strict";
import { initialState, DEMO_ACTOR, EMPTY_MEDIA } from "../lib/studio/seed";
import { copyIdentity } from "../lib/studio/solo-quality";
import {
  applyWorkerReceipt,
  saveWorkerReceipt,
  readWorkerReceipt,
  LEASE_EXPIRED_ERROR,
  type WorkerReceipt,
} from "../lib/studio/worker-receipt";
import type { Job } from "../lib/studio/types";
const now = "2026-11-06T20:00:00.000Z",
  lease = "lease-1";
function fixture() {
  const s = initialState(DEMO_ACTOR, true),
    c = s.contents[0];
  c.text = "";
  c.metadata = "";
  c.media = structuredClone(EMPTY_MEDIA);
  c.format = "Text post";
  const job: Job = {
    id: "job-1",
    leaseId: lease,
    kind: "text",
    contentId: c.id,
    channel: c.channel,
    account: c.account,
    connectionId: "writer",
    state: "unknown",
    error: LEASE_EXPIRED_ERROR,
    leaseExpiredAt: now,
    prompt: "selected post",
    estimate: 14,
    reserved: 14,
    attempt: 1,
    idempotencyKey: "original",
    createdBy: DEMO_ACTOR.email,
    createdAt: now,
    targetRevision: c.revision,
    targetIdentity: copyIdentity(c, s),
    targetAccepted: false,
    outputContract: "draft_v1",
    workflowSnapshot: s.workflows.find((w) => w.channel === c.channel),
    connectionSnapshot: {
      provider: "anthropic",
      model: "fixture",
      function: "text",
    },
    pricingSnapshot: {
      provider: "anthropic",
      model: "fixture",
      function: "text",
      currency: "USD",
      inputCentsPerMillion: 200,
      outputCentsPerMillion: 1000,
      maxInputBytes: 65536,
      maxOutputTokens: 4096,
      source: "https://example.com/pricing",
      verifiedAt: "2026-11-06",
      qualified: true,
    },
  };
  s.jobs = [job];
  return s;
}
const receipt: WorkerReceipt = {
  version: 1,
  jobId: "job-1",
  leaseId: lease,
  receivedAt: now,
  outcome: {
    text: JSON.stringify({
      body: "A useful household handoff can explain routines and who to contact.",
      metadata: "",
      sources: [],
      questions: [],
    }),
    completion: "complete",
    usage: {
      inputTokens: 100,
      outputTokens: 300,
      cacheReadTokens: 0,
      cacheCreationTokens: 0,
    },
  },
};
test("a real saved response settles its own expired lease once, applies copy and records usage cost", () => {
  const s = fixture(),
    next = applyWorkerReceipt(s, receipt);
  assert.equal(s.jobs[0].state, "unknown");
  assert.equal(next.jobs[0].state, "succeeded");
  assert.match(next.contents[0].text, /useful household/);
  assert.equal(next.jobs[0].actual, 1);
  assert.equal(next.jobs[0].reserved, 0);
  assert.equal(next.jobs[0].costBasis, "provider_usage");
  assert.equal(applyWorkerReceipt(next, receipt), next);
});
test("receipt cannot overwrite human reconciliation, another lease, edited copy or a newer attempt", () => {
  for (const alter of [
    (s: ReturnType<typeof fixture>) => {
      s.jobs[0].costBasis = "human_reconciled";
      s.jobs[0].actual = 7;
    },
    (s: ReturnType<typeof fixture>) => {
      s.jobs[0].leaseId = "different";
    },
  ]) {
    const s = fixture();
    alter(s);
    assert.throws(() => applyWorkerReceipt(s, receipt), /changed/);
  }
  const edited = fixture();
  edited.contents[0].text = "Human text";
  edited.contents[0].revision++;
  const recovered = applyWorkerReceipt(edited, receipt);
  assert.equal(recovered.contents[0].text, "Human text");
  assert.equal(recovered.jobs[0].outputStatus, "conflict");
  assert.ok(recovered.jobs[0].result);
  const newer = fixture();
  newer.jobs[0].writingFollowupId = "new-job";
  assert.equal(applyWorkerReceipt(newer, receipt).contents[0].text, "");
});
test("ambiguous transport receipts remain unknown and reserved, and recovery is idempotent", () => {
  const s = fixture();
  s.jobs[0].state = "running";
  s.jobs[0].error = undefined;
  const problem: WorkerReceipt = {
    version: 1,
    jobId: "job-1",
    leaseId: lease,
    receivedAt: now,
    problem: {
      ambiguous: true,
      message: "Transport interruption; result unknown.",
    },
  };
  const next = applyWorkerReceipt(s, problem);
  assert.equal(next.jobs[0].state, "unknown");
  assert.equal(next.jobs[0].reserved, 14);
  assert.equal(next.contents[0].text, "");
  assert.equal(applyWorkerReceipt(next, problem), next);
});
test("provider outcomes are encrypted in private immutable storage and bound to exact job/lease", async () => {
  const previous = process.env.STUDIO_ENCRYPTION_KEY;
  process.env.STUDIO_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString("base64");
  let stored: Buffer | undefined,
    key = "",
    options: any;
  const db = {
    storage: {
      from: (bucket: string) => {
        assert.equal(bucket, "studio-assets");
        return {
          upload: async (path: string, bytes: Buffer, opts: any) => {
            stored = bytes;
            key = path;
            options = opts;
            return { error: null };
          },
          download: async (path: string) => {
            assert.equal(path, key);
            return { data: new Blob([new Uint8Array(stored!)]), error: null };
          },
        };
      },
    },
  } as any;
  try {
    await saveWorkerReceipt(db, receipt);
    assert.equal(options.upsert, false);
    assert.ok(key.startsWith("worker-outcomes/job-1/"));
    assert.equal(stored!.toString().includes("useful household"), false);
    assert.deepEqual(
      await readWorkerReceipt(db, { id: "job-1", leaseId: lease }),
      receipt,
    );
    stored![stored!.length - 5] ^= 1;
    await assert.rejects(() =>
      readWorkerReceipt(db, { id: "job-1", leaseId: lease }),
    );
  } finally {
    if (previous === undefined) delete process.env.STUDIO_ENCRYPTION_KEY;
    else process.env.STUDIO_ENCRYPTION_KEY = previous;
  }
});
test("saved receipt survives failed workspace settlement and replays after an expiry without another provider call", async () => {
  const { persistWorkerReceipt } = await import("../lib/studio/worker-receipt");
  let state = fixture(),
    writes = 0;
  const db = {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: { state: structuredClone(state) },
            error: null,
          }),
        }),
      }),
    }),
    rpc: async (_name: string, input: any) => {
      writes++;
      if (writes === 1) return { error: { code: "40001" } };
      state = structuredClone(input.p_state);
      return { error: null };
    },
  } as any;
  const settled = await persistWorkerReceipt(db, receipt);
  assert.equal(writes, 2);
  assert.equal(settled.state, "succeeded");
  assert.match(state.contents[0].text, /useful household/);
  assert.equal(state.jobs[0].actual, 1);
  await persistWorkerReceipt(db, receipt);
  assert.equal(writes, 2);
  assert.equal(state.contents[0].history.length, 1);
});

test("hosted generated images attach only to the unchanged draft and settle once", () => {
  const state = fixture();
  const draft = state.contents[0];
  draft.state = "draft";
  const job = state.jobs[0];
  job.kind = "image";
  job.autoAttachImage = true;
  job.mediaRevision = draft.mediaRevision ?? 1;
  job.outputContract = undefined;
  const assetUrl = "/api/studio/assets?id=28e35c89-8127-45ee-b5e5-ed47ee553885";
  const imageReceipt = { ...receipt, mediaReturned: true, storedMedia: assetUrl };

  const attached = applyWorkerReceipt(state, imageReceipt);
  assert.equal(attached.contents[0].media.imageUrl, assetUrl);
  assert.equal(attached.contents[0].text, draft.text);
  assert.equal(applyWorkerReceipt(attached, imageReceipt), attached);

  const edited = structuredClone(state);
  edited.contents[0].revision++;
  const preserved = applyWorkerReceipt(edited, imageReceipt);
  assert.equal(preserved.contents[0].media.imageUrl, draft.media.imageUrl);
  assert.equal(preserved.jobs[0].result, assetUrl);
});
