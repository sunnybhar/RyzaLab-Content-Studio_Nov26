import type { Actor, Channel, StudioState } from "./types";
import { requirePermission, StudioError } from "./permissions";
import {
  validateStoredAgentFile,
  type StoredAgentFile,
} from "./agent-rule-files";
export interface AgentVoiceExample {
  id: string;
  title: string;
  contentType: "article" | "post" | "newsletter";
  channel: Channel | "Shared";
  text?: string;
  file?: StoredAgentFile;
  createdBy: string;
  createdAt: string;
  requestKey: string;
}
export function saveAgentVoiceExample(
  input: StudioState,
  actor: Actor,
  change: Omit<AgentVoiceExample, "id" | "createdBy" | "createdAt">,
  now: string,
  id: string,
) {
  requirePermission(input, actor, "workflow.edit", {
    channel: change.channel === "Shared" ? undefined : change.channel,
  });
  if (Boolean(change.text?.trim()) === Boolean(change.file))
    throw new StudioError(400, "Provide pasted text or one uploaded file.");
  if (change.file) validateStoredAgentFile(change.file);
  const existing = input.agentVoiceExamples?.find(
    (e) => e.createdBy === actor.email && e.requestKey === change.requestKey,
  );
  if (existing) {
    const sameFile =
      (!existing.file && !change.file) ||
      Boolean(
        existing.file &&
        change.file &&
        existing.file.fileName === change.file.fileName &&
        existing.file.base64 === change.file.base64 &&
        existing.file.byteSize === change.file.byteSize,
      );
    if (
      existing.title !== change.title ||
      existing.contentType !== change.contentType ||
      existing.channel !== change.channel ||
      (existing.text || undefined) !== (change.text || undefined) ||
      !sameFile
    )
      throw new StudioError(
        409,
        "This request key belongs to a different example.",
      );
    return input;
  }
  if ((input.agentVoiceExamples?.length || 0) >= 100)
    throw new StudioError(
      409,
      "The voice library currently supports 100 examples. Remove an older example before adding another.",
    );
  const next = structuredClone(input);
  next.agentVoiceExamples ??= [];
  next.agentVoiceExamples.unshift({
    ...change,
    id,
    createdBy: actor.email,
    createdAt: now,
  });
  next.version++;
  next.audit.push({
    id,
    actor: actor.email,
    action: "agentRules.voiceExampleSaved",
    target: id,
    at: now,
  });
  return next;
}
