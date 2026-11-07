import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { applyCommand } from "../lib/studio/engine";
import {
  commitDraftSave,
  type DraftSaveCommand,
} from "../lib/studio/draft-save";
import { initialState, DEMO_ACTOR } from "../lib/studio/seed";
import { StudioError } from "../lib/studio/permissions";
import {
  clearRecovery,
  equalDraft,
  readRecovery,
  recoveryKey,
  valuesOf,
  type DraftRecovery,
} from "../lib/studio/draft-recovery";
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
function fixture() {
  const state = initialState(DEMO_ACTOR, true);
  const draft = state.contents[0];
  return {
    state,
    draft,
    command: {
      type: "content.save",
      id: draft.id,
      expectedRevision: draft.revision,
      operationId: crypto.randomUUID(),
      ...valuesOf(draft),
      text: "Edited draft for save recovery.",
    } satisfies DraftSaveCommand,
  };
}
test("save receipt is atomic, bound to actor/target/payload, and replay cannot create another revision or replace later writing", () => {
  const { state, command } = fixture();
  const saved = applyCommand(state, DEMO_ACTOR, command, { hash });
  const d = saved.contents.find((c) => c.id === command.id)!;
  assert.equal(d.saveOperations![0].savedRevision, d.revision);
  assert.deepEqual(applyCommand(saved, DEMO_ACTOR, command, { hash }), saved);
  assert.throws(
    () =>
      applyCommand(
        saved,
        DEMO_ACTOR,
        { ...command, text: "Changed payload" },
        { hash },
      ),
    /different edits/,
  );
  const later = applyCommand(
    saved,
    DEMO_ACTOR,
    {
      ...command,
      operationId: crypto.randomUUID(),
      expectedRevision: d.revision,
      text: "Newer writing",
    },
    { hash },
  );
  assert.deepEqual(applyCommand(later, DEMO_ACTOR, command, { hash }), later);
  assert.equal(
    later.contents.find((c) => c.id === command.id)!.text,
    "Newer writing",
  );
});
test("committed save with lost acknowledgement reconciles by receipt, without another write", async () => {
  const { state, command } = fixture();
  let db = state,
    writes = 0;
  const result = await commitDraftSave(
    state,
    DEMO_ACTOR,
    command,
    {
      load: async () => db,
      commit: async (_, next) => {
        writes++;
        db = structuredClone(next);
        throw new StudioError(503, "Save response lost");
      },
    },
    { hash },
  );
  assert.equal(writes, 1);
  assert.equal(
    result.contents.find((c) => c.id === command.id)!.text,
    command.text,
  );
});
test("unknown no-commit save never retries automatically, and later explicit exact retry saves once", async () => {
  const { state, command } = fixture();
  let writes = 0;
  await assert.rejects(
    commitDraftSave(
      state,
      DEMO_ACTOR,
      command,
      {
        load: async () => state,
        commit: async () => {
          writes++;
          throw new StudioError(503, "Database timed out");
        },
      },
      { hash },
    ),
    /timed out/,
  );
  assert.equal(writes, 1);
  const result = await commitDraftSave(
    state,
    DEMO_ACTOR,
    command,
    {
      load: async () => state,
      commit: async () => {
        writes++;
      },
    },
    { hash },
  );
  assert.equal(
    result.contents.find((c) => c.id === command.id)!.saveOperations!.length,
    1,
  );
});
test("unrelated workspace CAS contention can retry the pure save once; changed draft remains a conflict", async () => {
  const { state, command } = fixture();
  const newer = structuredClone(state);
  newer.version++;
  newer.settings.monthlyCap++;
  let writes = 0;
  const result = await commitDraftSave(
    state,
    DEMO_ACTOR,
    command,
    {
      load: async () => newer,
      commit: async () => {
        writes++;
        if (writes === 1) throw new StudioError(409, "CAS conflict");
      },
    },
    { hash },
  );
  assert.equal(writes, 2);
  assert.equal(result.settings.monthlyCap, newer.settings.monthlyCap);
  const changed = applyCommand(
    newer,
    DEMO_ACTOR,
    {
      ...command,
      operationId: crypto.randomUUID(),
      text: "Someone else's changes",
    },
    { hash },
  );
  writes = 0;
  await assert.rejects(
    commitDraftSave(
      state,
      DEMO_ACTOR,
      command,
      {
        load: async () => changed,
        commit: async () => {
          writes++;
          throw new StudioError(409, "CAS conflict");
        },
      },
      { hash },
    ),
    /CAS conflict/,
  );
  assert.equal(writes, 1);
});
test("validation and current edit permissions still apply to receipt replay", () => {
  const { state, command } = fixture();
  const saved = applyCommand(state, DEMO_ACTOR, command, { hash });
  saved.members.find((m) => m.email === DEMO_ACTOR.email)!.roles = ["viewer"];
  assert.throws(
    () => applyCommand(saved, DEMO_ACTOR, command, { hash }),
    /content.edit/,
  );
});
class MemoryStorage implements Storage {
  map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  clear() {
    this.map.clear();
  }
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
  key(i: number) {
    return [...this.map.keys()][i] ?? null;
  }
}
test("local recovery is account/workspace/draft scoped, expires, validates payload and cleans up on sign-out", () => {
  const { draft, command } = fixture(),
    storage = new MemoryStorage(),
    now = Date.now();
  const key = recoveryKey("live", "workspace-A", "actor-A", draft.id),
    other = recoveryKey("live", "workspace-B", "actor-B", draft.id);
  const record: DraftRecovery = {
    v: 1,
    at: now,
    baseRevision: draft.revision,
    base: valuesOf(draft),
    values: { ...valuesOf(draft), text: "Recovered edits" },
    pending: command,
  };
  storage.setItem(key, JSON.stringify(record));
  storage.setItem(other, JSON.stringify(record));
  assert.equal(readRecovery(storage, key, now)!.values.text, "Recovered edits");
  assert.equal(readRecovery(storage, key, now + 73 * 3600000), undefined);
  storage.setItem(key, JSON.stringify(record));
  storage.setItem("unrelated", "keep");
  clearRecovery(storage, "actor-A");
  assert.equal(storage.getItem(key), null);
  assert.ok(storage.getItem(other));
  assert.equal(storage.getItem("unrelated"), "keep");
  storage.setItem(key, "invalid json");
  assert.equal(readRecovery(storage, key), undefined);
  assert.ok(equalDraft(valuesOf(draft), { ...valuesOf(draft) }));
});
