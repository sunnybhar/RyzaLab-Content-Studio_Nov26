import {jobHasExcludedSupport} from "./source-policy";
import {canReadNewsletterSource} from "./newsletter-source";
import type {
  Actor,
  Channel,
  FunctionKind,
  Grant,
  Member,
  StudioState,
} from "./types";
export interface Scope {
  channel?: Channel;
  contentId?: string;
  account?: string;
  function?: FunctionKind;
  assignedTo?: string;
}
export class StudioError extends Error {
  constructor(
    public code: number,
    message: string,
  ) {
    super(message);
  }
}
export function memberFor(state: StudioState, actor: Actor): Member {
  const m = state.members.find(
    (m) => m.email === actor.email.toLowerCase() && !m.revoked,
  );
  if (!m)
    throw new StudioError(403, "Your Studio membership is missing or revoked.");
  return m;
}
export function can(
  state: StudioState,
  actor: Actor,
  action: string,
  scope: Scope = {},
): boolean {
  let member: Member;
  try {
    member = memberFor(state, actor);
  } catch {
    return false;
  }
  if (member.roles.includes("founder")) return true;
  if (action === "policy.manage") return false;
  if (member.roles.includes("administrator")) return true;
  const match = (g: Grant) =>
    (g.action === action || g.action === "*") &&
    (!g.channel || g.channel === scope.channel) &&
    (!g.contentId || g.contentId === scope.contentId) &&
    (!g.account || g.account === scope.account) &&
    (!g.function || g.function === scope.function);
  if (member.grants.some(match)) return true;
  // Explicit scoped grants replace profile defaults, rather than accidentally broadening them.
  if (member.grants.length) return false;
  if (["read", "export"].includes(action))
    return !scope.contentId || scope.assignedTo === actor.email;
  if (member.roles.includes("manager"))
    return (
      [
        "idea.edit",
        "idea.review",
        "stage.review",
        "content.create",
        "content.edit",
        "content.assign",
        "schedule.manage",
        "publication.confirm",
        "workflow.edit",
        "workflow.review",
        "reference.edit",
        "job.create",
        "template.edit",
      ].includes(action) &&
      (!scope.contentId || scope.assignedTo === actor.email)
    );
  if (member.roles.some((r) => r === "editor" || r === "creator"))
    return (
      [
        "idea.edit",
        "content.create",
        "content.edit",
        "workflow.edit",
        "reference.edit",
        "job.create",
        "template.edit",
      ].includes(action) &&
      (!scope.contentId || scope.assignedTo === actor.email)
    );
  return false;
}
export function requirePermission(
  state: StudioState,
  actor: Actor,
  action: string,
  scope: Scope = {},
) {
  if (!can(state, actor, action, scope))
    throw new StudioError(
      403,
      `You do not have permission for ${action} in this scope.`,
    );
}
export function filteredState(state: StudioState, actor: Actor): StudioState {
  memberFor(state, actor);
  if (can(state, actor, "users.manage")) return structuredClone(state);
  const s = structuredClone(state),
    visible = s.contents.filter((c) =>
      canReadNewsletterSource(state,actor,c) && can(state, actor, "read", {
        channel: c.channel,
        account: c.account,
        contentId: c.id,
        assignedTo: c.assignedTo,
      }),
    ),
    ids = new Set(visible.map((c) => c.id));
  s.contents = visible;
  for(const content of s.contents){const reportJob=state.jobs.find(job=>job.id===content.agentReview?.jobId);if(content.agentReview&&reportJob&&jobHasExcludedSupport(reportJob))content.agentReview={...content.agentReview,sourcePolicyExcluded:true};}
  s.pipelineBriefs=s.pipelineBriefs?.filter(b=>can(state,actor,"read",{channel:b.channel,account:b.account}));
  s.pipelineImports=s.pipelineImports?.filter(i=>i.by===actor.email);
  s.agentVoiceExamples=s.agentVoiceExamples?.filter(example=>can(state,actor,"workflow.edit",{channel:example.channel==="Shared"?undefined:example.channel}));
  s.agentPackageArchives=s.agentPackageArchives?.filter(file=>can(state,actor,"workflow.edit",{channel:file.channel}));
  s.agentRuleFiles=s.agentRuleFiles?.filter(file=>can(state,actor,"workflow.edit",{channel:file.channel}));
  s.verificationRuns=s.verificationRuns?.filter(r=>r.createdBy===actor.email&&r.cases.every(c=>!c.contentId||ids.has(c.contentId)));
  s.preparations = s.preparations?.filter((p) => ids.has(p.contentId));
  s.planningTasks = s.planningTasks?.filter((t) =>
    t.kind === "workflow"
      ? can(state, actor, "read", { channel: t.channel })
      : Boolean(t.contentId && ids.has(t.contentId)),
  );
  s.exceptions = s.exceptions?.filter((e) => ids.has(e.contentId));
  s.packages = s.packages.filter((p) => ids.has(p.contentId));
  s.schedules = s.schedules.filter((p) => ids.has(p.contentId));
  s.ideas = s.ideas.filter((i) =>
    can(state, actor, "read", { channel: i.channel }),
  );
  s.jobs = s.jobs.filter(
    (j) =>
      j.createdBy === actor.email && (!j.contentId || ids.has(j.contentId)) &&
      (!j.researchAnalysisSourceId || Boolean(state.jobs.find(source =>
        source.id === j.researchAnalysisSourceId && (!source.contentId || ids.has(source.contentId)) &&
        can(state, actor, "read", {channel:source.channel, contentId:source.contentId,
          account:source.account, assignedTo:state.contents.find(c=>c.id===source.contentId)?.assignedTo})
      ))),
  );
  s.workflows = s.workflows.filter((w) =>
    can(state, actor, "read", { channel: w.channel }),
  );
  const channels = new Set(s.workflows.map((w) => w.channel));
  s.references = s.references.filter(
    (r) => r.channel === "Shared" || channels.has(r.channel),
  );
  s.templates = s.templates.filter((t) => channels.has(t.channel));
  s.recurrences = s.recurrences.filter((r) => channels.has(r.channel));
  s.notices = s.notices.filter((n) => n.user === actor.email);
  s.audit = s.audit.filter((e) => e.actor === actor.email);
  s.members = s.members.filter((m) => m.email === actor.email);
  s.connections = s.connections.map((c) => ({ ...c, hasKey: c.hasKey }));
  s.settings.userCaps = {
    [actor.email]: s.settings.userCaps[actor.email] ?? 0,
  };
  return s;
}
