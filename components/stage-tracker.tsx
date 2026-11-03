"use client";
import { ShieldCheck } from "lucide-react";
import type { Content, StudioState, Actor, Command } from "@/lib/studio/types";
import { copyIdentity } from "@/lib/studio/solo-quality";
/** The normal editor exposes status, never a manual nine-stage checklist. */
export function StageTracker({
  content,
  state,
}: {
  content: Content;
  state: StudioState;
  actor: Actor;
  send: (command: Command) => Promise<unknown>;
  onError?: (message: string) => void;
}) {
  const approved = state.packages.some(
    (p) => p.contentId === content.id && p.revision === content.revision,
  );
  const job = state.jobs.find((j) => j.id === content.automaticReview?.jobId);
  const status = approved
    ? "Approved for publication"
    : content.state !== "review"
      ? "Create your content, then submit for review"
      : content.agentReview?.identity === copyIdentity(content, state)
        ? "Checks complete — open Reviews"
        : job?.state === "running"
          ? "Automatic review in progress"
          : job?.state === "queued"
            ? "Automatic review queued"
            : "Open Reviews to check or override findings";
  return (
    <div className="s-info-strip" role="status">
      <ShieldCheck size={17} />
      <span>{status}</span>
    </div>
  );
}
