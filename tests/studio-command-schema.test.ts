import { test } from "node:test";
import assert from "node:assert/strict";
import { commandSchema } from "../lib/studio/commands";
test("workflows can be saved before connecting every AI function", () => {
  assert.doesNotThrow(() =>
    commandSchema.parse({
      type: "workflow.save",
      channel: "LinkedIn",
      title: "Workflow",
      audience: "Professional",
      instructions: "Write precisely.",
      guardrails: "No invented claims",
      references: [],
      examples: "",
      outputFormat: "Post",
      checks: "Human review",
      connectionId: "",
      functionConnections: {},
    }),
  );
});
test("optional budget maps accept partial function, role and channel caps", () => {
  assert.doesNotThrow(() =>
    commandSchema.parse({
      type: "settings.save",
      timezone: "America/New_York",
      trashDays: 90,
      monthlyCap: 10000,
      requestCap: 1000,
      confirmationThreshold: 100,
      currency: "USD",
      functionCaps: { text: 500 },
      roleCaps: { editor: 1000 },
      channelCaps: { LinkedIn: 1000 },
      userCaps: {},
      accountCaps: {},
      projectCaps: {},
    }),
  );
});
