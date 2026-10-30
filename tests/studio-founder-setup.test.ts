import { test } from "node:test";
import assert from "node:assert/strict";
import { initialState } from "../lib/studio/seed";
import { claimFounder, founderSetupStatus } from "../lib/studio/founder-setup";
import { applyCommand } from "../lib/studio/engine";
const actor = { id: "verified-id", email: "owner@example.com" },
  now = "2026-10-30T12:00:00Z";
test("only the server-designated existing administrator explicitly claims the first founder", () => {
  const s = initialState(actor);
  assert.equal(founderSetupStatus(s, actor, undefined).eligible, false);
  assert.throws(
    () =>
      claimFounder(
        s,
        actor,
        { expectedVersion: s.version, acknowledge: true },
        undefined,
        now,
        "id",
      ),
    /unavailable/,
  );
  assert.throws(
    () =>
      claimFounder(
        s,
        actor,
        { expectedVersion: s.version, acknowledge: true },
        "other@example.com",
        now,
        "id",
      ),
    /unavailable/,
  );
  assert.throws(() =>
    claimFounder(
      s,
      actor,
      { expectedVersion: s.version, acknowledge: false },
      actor.email,
      now,
      "id",
    ),
  );
  assert.throws(
    () =>
      claimFounder(
        s,
        actor,
        { expectedVersion: s.version + 1, acknowledge: true },
        actor.email,
        now,
        "id",
      ),
    /changed/,
  );
  assert.throws(() =>
    claimFounder(
      s,
      actor,
      {
        expectedVersion: s.version,
        acknowledge: true,
        configuredEmail: actor.email,
      },
      actor.email,
      now,
      "id",
    ),
  );
  const next = claimFounder(
    s,
    actor,
    { expectedVersion: s.version, acknowledge: true },
    actor.email,
    now,
    "id",
  );
  assert.deepEqual(next.members[0].roles, ["administrator", "founder"]);
  assert.equal(s.members[0].roles.includes("founder"), false);
  assert.equal(next.settings.founderSetup!.actorId, actor.id);
  assert.equal(next.audit.at(-1)!.action, "founder.initial_claim");
  assert.equal(
    claimFounder(
      next,
      actor,
      { expectedVersion: s.version, acknowledge: true },
      actor.email,
      now,
      "id",
    ),
    next,
  );
  assert.equal(next.settings.reviewPolicy, undefined);
  assert.equal(next.settings.monthlyCap, 0);
  assert.equal(next.jobs.length, 0);
});
test("founder claim cannot replace an existing or revoked founder or escalate non-administrators", () => {
  const s = initialState(actor);
  s.members[0].roles = ["creator"];
  assert.throws(
    () =>
      claimFounder(
        s,
        actor,
        { expectedVersion: 0, acknowledge: true },
        actor.email,
        now,
        "id",
      ),
    /unavailable/,
  );
  s.members[0].roles = ["administrator"];
  s.members.push({
    id: "former",
    email: "former@example.com",
    roles: ["founder"],
    grants: [],
    revoked: true,
  });
  assert.throws(
    () =>
      claimFounder(
        s,
        actor,
        { expectedVersion: 0, acknowledge: true },
        actor.email,
        now,
        "id",
      ),
    /unavailable/,
  );
  s.members.pop();
  s.settings.founderSetup = {
    actorId: "former",
    email: "former@example.com",
    at: now,
  };
  assert.throws(
    () =>
      claimFounder(
        s,
        actor,
        { expectedVersion: 0, acknowledge: true },
        actor.email,
        now,
        "id",
      ),
    /unavailable/,
  );
});
test("policy adoption is explicit, versioned, founder-only and blocked during unresolved paid work", () => {
  const base = initialState(actor);
  let s = claimFounder(
    base,
    actor,
    { expectedVersion: base.version, acknowledge: true },
    actor.email,
    now,
    "id",
  );
  const command = {
    type: "policy.adoptSolo",
    expectedRuleVersion: s.settings.protectedVersion,
    packageCap: 50,
    monthlyCap: 500,
    requireIndependentReview: false,
    autoDraft: false,
    autoReview: true,
  };
  s = applyCommand(s, actor, command, { now });
  assert.equal(s.settings.monthlyCap, 500);
  assert.equal(s.settings.reviewPolicy!.packageCap, 50);
  assert.throws(
    () => applyCommand(s, actor, command, { now }),
    /policy changed/,
  );
  const edit = {
    ...command,
    expectedPolicyVersion: s.settings.reviewPolicy!.version,
  };
  s.jobs.push({ id: "uncertain", state: "unknown" } as (typeof s.jobs)[number]);
  assert.throws(() => applyCommand(s, actor, edit, { now }), /uncertain/);
});
