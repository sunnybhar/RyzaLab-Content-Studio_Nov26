import { nextOccurrence } from "./time";
import { applyCommand } from "./engine";
import { quote } from "./pricing";
import type { StudioState } from "./types";
export function maintenance(
  input: StudioState,
  now = new Date().toISOString(),
): StudioState {
  let state = structuredClone(input);
  let changed = false;
  const notify = (
    user: string,
    title: string,
    body: string,
    eventId: string,
  ) => {
    if (state.notices.some((n) => n.user === user && n.eventId === eventId))
      return;
    state.notices.push({
      id: crypto.randomUUID(),
      user,
      title,
      body,
      read: false,
      createdAt: now,
      eventId,
      emailState: "not_configured",
    });
    changed = true;
  };
  for (const job of state.jobs.filter((j) =>
    ["unknown", "failed", "blocked"].includes(j.state),
  )) {
    notify(
      job.createdBy,
      "Generation job needs attention",
      `${job.kind} · ${job.channel} · ${job.state}. Inspect job ${job.id} in Studio. Do not blindly retry unknown outcomes.`,
      `job-alert:${job.id}:${job.attempt}:${job.state}`,
    );
  }
  for (const task of (state.planningTasks || []).filter(
    (t) => t.state === "planned" && t.at <= now,
  )) {
    notify(
      task.owner,
      "Planning task due",
      `${task.title}: open Studio to complete the ${task.kind} task. No generation or publication was started.`,
      `planning-due:${task.id}:${task.at}`,
    );
  }
  for (const task of state.schedules.filter(
    (t) => t.state === "planned" && t.at <= now,
  )) {
    const content = state.contents.find((c) => c.id === task.contentId),
      approved = state.packages.find(
        (p) => p.id === task.packageId && p.contentId === task.contentId,
      );
    if (!content || content.deletedAt || !approved) {
      task.state = "blocked";
      notify(
        task.owner,
        "Publication task blocked",
        "Required approved content was missing at the due time. Resolve readiness and explicitly reschedule.",
        `due-blocked:${task.id}:${task.at}`,
      );
      changed = true;
    } else
      notify(
        task.owner,
        "Ready for manual publication",
        `Review and publish the selected approved package for ${content.title}. Studio will not post automatically.`,
        `due-ready:${task.id}:${task.at}`,
      );
  }
  const owner =
    state.members.find((m) => m.roles.includes("founder") && !m.revoked) ||
    state.members.find((m) => m.roles.includes("administrator") && !m.revoked);
  for (const r of state.recurrences.filter(
    (r) =>
      r.state === "active" &&
      r.nextAt > now &&
      Date.parse(r.nextAt) - Date.parse(now) < 86400000,
  )) {
    if (owner)
      notify(
        owner.email,
        "Choose research for the next idea run",
        `${r.title}: confirm whether current web research may be used for occurrence ${r.nextAt}. No response means no web research.`,
        `research-choice:${r.id}:${r.nextAt}`,
      );
  }
  for (const schedule of state.recurrences.filter(
    (r) =>
      r.state === "active" && r.nextAt <= now && r.lastOccurrence !== r.nextAt,
  )) {
    const occurrence = schedule.nextAt,
      allowed =
        schedule.researchChoice?.occurrence === occurrence &&
        schedule.researchChoice.allowed;
    try {
      if (!owner)
        throw new Error("Configure an owner before recurring generation.");
      if (allowed)
        throw new Error(
          "Web research requires a qualified research adapter; no researched run was fabricated.",
        );
      const workflow = state.workflows.find(
          (w) => w.channel === schedule.channel && w.status === "active",
        ),
        connectionId =
          workflow?.functionConnections?.ideas ||
          state.connections.find((c) => c.function === "ideas")?.id;
      if (!connectionId)
        throw new Error(
          "Configure the idea function connection and pricing first.",
        );
      const command = {
        type: "job.enqueue",
        kind: "ideas",
        channel: schedule.channel,
        prompt: JSON.stringify({
          task: "Generate idea cards as a complete JSON ideas array. Web research is off; use only supplied references and never imply current sources were opened.",
          quantity: schedule.quantity,
          topic: schedule.title,
        }),
        connectionId,
        estimate: 0,
        idempotencyKey: `recurrence:${schedule.id}:${occurrence}`,
      };
      const priced = quote(state, command);
      state = applyCommand(
        state,
        { id: owner.id, email: owner.email },
        command,
        {
          now,
          quotedCost: priced.cost,
          pricingSnapshot: priced.pricingSnapshot,
        },
      );
      const r = state.recurrences.find((r) => r.id === schedule.id)!;
      r.lastOccurrence = occurrence;
      r.nextAt = nextOccurrence(
        occurrence,
        state.settings.timezone,
        r.cadence === "daily" ? 1 : 7,
        now,
      );
      delete r.researchChoice;
      notify(
        owner.email,
        "Recurring idea run queued",
        `Quantity ${schedule.quantity}; web research off. Any required cost confirmation remains a separate gate.`,
        `recurrence:${schedule.id}:${occurrence}`,
      );
    } catch (error) {
      const r = state.recurrences.find((r) => r.id === schedule.id)!;
      r.lastOccurrence = occurrence;
      r.state = "paused";
      if (owner)
        notify(
          owner.email,
          "Recurring ideas need attention",
          `${schedule.title}: ${error instanceof Error ? error.message : "Configuration required"} No paid call was started. Reschedule explicitly after resolving the gate.`,
          `recurrence:${schedule.id}:${occurrence}`,
        );
    }
    changed = true;
  }
  const threshold = new Date(
    Date.parse(now) - state.settings.trashDays * 86400000,
  ).toISOString();
  state.contents = state.contents.filter((c) => {
    if (!c.deletedAt || c.deletedAt > threshold) return true;
    if (
      state.packages.some((p) => p.contentId === c.id) ||
      state.schedules.some((s) => s.contentId === c.id) ||
      state.planningTasks?.some(
        (t) => t.contentId === c.id && t.state === "planned",
      )
    )
      return true;
    changed = true;
    return false;
  });
  if (!changed) return input;
  state.version = input.version + 1;
  state.audit.push({
    id: crypto.randomUUID(),
    actor: "studio-maintenance",
    action: "maintenance.completed",
    target: "workspace",
    at: now,
  });
  return state;
}
