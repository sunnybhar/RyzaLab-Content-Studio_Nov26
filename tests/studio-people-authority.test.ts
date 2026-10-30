import { test } from "node:test";
import assert from "node:assert/strict";
import { initialState, DEMO_ACTOR } from "../lib/studio/seed";
import { applyCommand } from "../lib/studio/engine";
import { ROLES, type Member } from "../lib/studio/types";
import { can } from "../lib/studio/permissions";
test("both administrators and founders can grant all roles to themselves and other people", () => {
  for (const role of ["administrator", "founder"] as const) {
    let s = initialState(DEMO_ACTOR, true);
    s.members[0].roles = [role];
    const other = { id: "other", email: "other@example.com" };
    s.members.push({ ...other, roles: ["viewer"], grants: [], revoked: false });
    s = applyCommand(
      s,
      DEMO_ACTOR,
      {
        type: "member.save",
        email: other.email,
        roles: [...ROLES],
        grants: [],
      },
      { demo: true },
    );
    assert.deepEqual(s.members[1].roles, [...ROLES]);
    assert.equal(s.audit.at(-1)?.action, "member.save");
    s = applyCommand(
      s,
      DEMO_ACTOR,
      {
        type: "member.save",
        email: DEMO_ACTOR.email,
        roles: [...ROLES],
        grants: [],
      },
      { demo: true },
    );
    assert.ok(can(s, DEMO_ACTOR, "policy.manage"));
    assert.ok(can(s, other, "users.manage"));
  }
});
test("administrator can edit or revoke founder access while lower roles cannot manage people", () => {
  let s = initialState(DEMO_ACTOR, true);
  s.members[0].roles = ["administrator"];
  const other = { id: "other", email: "other@example.com" };
  s.members.push({ ...other, roles: ["founder"], grants: [], revoked: false });
  s = applyCommand(
    s,
    DEMO_ACTOR,
    {
      type: "member.save",
      email: other.email,
      roles: ["founder", "editor"],
      grants: [],
    },
    { demo: true },
  );
  assert.deepEqual(s.members[1].roles, ["founder", "editor"]);
  s = applyCommand(
    s,
    DEMO_ACTOR,
    { type: "member.revoke", email: other.email },
    { demo: true },
  );
  assert.equal(s.members[1].revoked, true);
  for (const role of ["manager", "editor", "creator", "viewer"] as const) {
    const lower = { id: role, email: `${role}@example.com` };
    s.members.push({ ...lower, roles: [role], grants: [], revoked: false });
    assert.throws(
      () =>
        applyCommand(
          s,
          lower,
          {
            type: "member.save",
            email: lower.email,
            roles: [...ROLES],
            grants: [],
          },
          { demo: true },
        ),
      /permission/,
    );
  }
});
test("People preserves at least one active full-access owner and never silently adopts review policy", () => {
  let s = initialState(DEMO_ACTOR, true);
  s.members[0].roles = ["administrator"];
  assert.throws(
    () =>
      applyCommand(
        s,
        DEMO_ACTOR,
        {
          type: "member.save",
          email: DEMO_ACTOR.email,
          roles: ["viewer"],
          grants: [],
        },
        { demo: true },
      ),
    /at least one active founder or administrator/,
  );
  assert.throws(
    () =>
      applyCommand(
        s,
        DEMO_ACTOR,
        { type: "member.revoke", email: DEMO_ACTOR.email },
        { demo: true },
      ),
    /own membership/,
  );
  s = applyCommand(
    s,
    DEMO_ACTOR,
    {
      type: "member.save",
      email: DEMO_ACTOR.email,
      roles: ["founder"],
      grants: [],
    },
    { demo: true },
  );
  assert.ok(can(s, DEMO_ACTOR, "users.manage"));
  assert.equal(s.settings.reviewPolicy, undefined);
  assert.equal(s.settings.monthlyCap, 50000);
  assert.equal(s.jobs.length, 0);
});
