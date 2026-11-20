export const CHANNELS = [
  "LinkedIn",
  "Instagram",
  "TikTok",
  "Facebook",
  "YouTube",
  "Reddit",
  "Notes",
  "Newsletter",
  "Hub",
] as const;
export type Channel = (typeof CHANNELS)[number];
export const ROLES = [
  "founder",
  "administrator",
  "manager",
  "editor",
  "creator",
  "viewer",
] as const;
export type Role = (typeof ROLES)[number];
export const FUNCTIONS = [
  "research",
  "ideas",
  "text",
  "review",
  "image",
  "video",
  "audio",
] as const;
export type FunctionKind = (typeof FUNCTIONS)[number];
export interface Grant {
  action: string;
  function?: FunctionKind;
  channel?: Channel;
  contentId?: string;
  account?: string;
}
export interface Member {
  id: string;
  email: string;
  roles: Role[];
  grants: Grant[];
  revoked: boolean;
}
export interface Actor {
  id: string;
  email: string;
}
export interface Reference {
  id: string;
  sourceJobId?: string;
  title: string;
  content: string;
  channel: Channel | "Shared";
  kind: "brand" | "source" | "example";
  createdAt: string;
}
export interface Workflow {
  activationId?: string;
  updatedAt?: string;
  updatedBy?: string;
  id: string;
  channel: Channel;
  version: number;
  status: "draft" | "review" | "active";
  title: string;
  audience: string;
  instructions: string;
  guardrails: string;
  references: string[];
  examples: string;
  outputFormat: string;
  checks: string;
  connectionId: string;
  functionConnections?: Partial<Record<FunctionKind, string>>;
  createdBy: string;
  createdAt: string;
}
export interface Idea {
  pipelineBriefId?: string;
  pipelineSnapshot?: import("./pipeline").PipelineBrief;
  boardStage?: import("./idea-board").IdeaStage;
  researchJobIds?: string[];
  id: string;
  title: string;
  brief: string;
  channel: Channel;
  state: "pending" | "approved" | "rejected";
  rejection?: string;
  sourceId?: string;
  createdBy: string;
  createdAt: string;
  sources: string[];
  origin?: "manual" | "demo_sample" | "agent";
  audience?: string;
  format?: string;
  generationRunId?: string;
  selectedTextAlternativeId?: string;
  researchUnavailable?: true;
}
export type SlideLayer = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
} & (
  | {
      kind: "text";
      text: string;
      color: string;
      fontSize: number;
      weight: 400 | 700;
      align: "left" | "center" | "right";
    }
  | { kind: "shape"; shape: "rectangle" | "ellipse"; fill: string }
);
export interface Slide {
  layers?: SlideLayer[];
  id: string;
  title: string;
  body: string;
  image?: string;
  color: string;
  background: string;
  x: number;
  y: number;
  fontSize: number;
}
export interface Scene {
  id: string;
  title: string;
  script: string;
  duration: number;
  sourceUrl?: string;
  audioUrl?: string;
  preserveAudio: boolean;
}
export interface MediaProject {
  slides: Slide[];
  scenes: Scene[];
  imagePrompt: string;
  imageUrl?: string;
  imageAlt?: string;
  imageCaption?: string;
  sectionImages?: import("./document-sections").SectionImage[];
  narration: string;
  captions: string;
  aspect: "9:16" | "16:9" | "1:1";
  templateId?: string;
}
export interface Revision {
  id: string;
  text: string;
  title: string;
  metadata: string;
  media: MediaProject;
  createdBy: string;
  createdAt: string;
  reason: string;
}
export const STAGE_KEYS = [
  "intake",
  "evidence",
  "creation",
  "independent_review",
  "visual_review",
  "release_check",
  "human_approval",
  "handoff",
  "publication_record",
] as const;
export type StageKey = (typeof STAGE_KEYS)[number];
export interface StageRecord {
  key: StageKey;
  status: "pending" | "pass" | "revise" | "hold" | "na";
  reason: string;
  evidence: string;
  actor: string;
  at: string;
  textRevision: number;
  mediaRevision: number;
  factsRevision?: number;
  workflowId: string;
  ruleVersion: string;
  packageId?: string;
}
export interface CopyAcceptance {
  id: string;
  actor: string;
  at: string;
  identity: string;
  evidence: string;
  policyVersion: string;
}
export interface AgentReview {
  sourcePolicyExcluded?: boolean;
  jobId: string;
  identity: string;
  provider: Connection["provider"];
  model: string;
  independent: boolean;
  at: string;
  summary: string;
  issues: {
    severity: "block" | "warning";
    message: string;
    referenceIds: string[];
  }[];
  context: "provided_references";
}
export interface PreparationAuthorization {
  budgetCategory?: import("./budget-categories").BudgetCategory;
  id: string;
  contentId: string;
  channel: Channel;
  account: string;
  authorizedFor: string;
  authorizedBy: string;
  at: string;
  period: string;
  maxCents: number;
  functions: FunctionKind[];
  policyVersion: string;
}
export interface SoloReviewPolicy {
  budgetCategory?: import("./budget-categories").BudgetCategory;
  mode: "two_step";
  version: string;
  adoptedBy: string;
  adoptedAt: string;
  requireIndependentReview: boolean;
  packageCap: number;
  autoDraft: boolean;
  autoReview: boolean;
  autoCorrect?: boolean;
}
export interface Content {
  saveOperations?: import("./save-operation").SaveOperation[];
  pipelineRequestKey?: string;
  pipelineBriefId?: string;
  pipelineSnapshot?: import("./pipeline").PipelineBrief;
  researchJobIds?: string[];
  id: string;
  channel: Channel;
  account: string;
  title: string;
  format: string;
  text: string;
  metadata: string;
  media: MediaProject;
  ideaId?: string;
  ideaTextAlternative?: import("./idea-alternatives").IdeaTextAlternative;
  newsletterSources?: import("./newsletter-bundle").NewsletterSourceSnapshot[];
  newsletterOutline?: string;
  newsletterRequestKey?: string;
  newsletterRequestHash?: string;
  newsletterSource?: { kind: "idea" | "content"; id: string; channel: Channel; title: string; text: string; metadata: string; revision?: number; capturedAt: string };
  assignedTo: string;
  revision: number;
  factsRevision?: number;
  textRevision?: number;
  mediaRevision?: number;
  history: Revision[];
  state: "draft" | "review" | "changes";
  workflowId?: string;
  docId?: string;
  docsBase?: string;
  docsFetchedAt?: string;
  docsOwnerId?: string;
  docsOwnerEmail?: string;
  docsLastCheckedAt?: string;
  docsSyncError?: string;
  docsIncoming?: { text: string; fetchedAt: string; reason: string };
  createdBy: string;
  updatedAt: string;
  deletedAt?: string;
  collection?: string;
  stages?: StageRecord[];
  copyAcceptances?: CopyAcceptance[];
  agentReview?: AgentReview;
  initialWriting?: {id:string; actor:string; at:string; policyVersion:string; identity:string; revision:number};
  automaticWriting?: {intentId:string; jobId?:string; error?:string; at:string};
  reviewCycle?: {rootSubmissionId:string;rounds:number;jobId?:string;status:"correcting"|"reviewing"|"ready"|"needs_input"|"stopped";reason?:string;at:string};
  reviewSubmission?: { rootId?:string; id: string; actor: string; identity: string; at: string };
  automaticReview?: { acceptanceId: string; jobId?: string; error?: string; at: string };
  generatedBy?: {
    provider: Connection["provider"];
    model: string;
    jobId: string;
  };
  preparationId?: string;
}
export interface Package {
  documentLayout?: import("./document-layout").DocumentLayout;
  format?: string;
  editorialOverride?: { actor: string; at: string; reason: string; checks: string[] };
  singleReview?: boolean;
  researchSnapshots?: {jobId:string;raw:string}[];
  copyAcceptanceSnapshot?: CopyAcceptance;
  id: string;
  contentId: string;
  channel: Channel;
  account: string;
  title: string;
  revision: number;
  textRevision?: number;
  mediaRevision?: number;
  textId?: string;
  mediaId?: string;
  text: string;
  metadata: string;
  media: MediaProject;
  workflowId?: string;
  ruleVersion: string;
  approvedBy: string;
  approvedAt: string;
  hash: string;
}
export interface Schedule {
  id: string;
  contentId: string;
  packageId?: string;
  at: string;
  groupId?: string;
  owner: string;
  state: "planned" | "blocked" | "published";
  publicationUrl?: string;
  confirmedBy?: string;
  confirmedAt?: string;
  verification?: "human_confirmed";
}
export interface Connection {
  supportedFunctions?: ("text" | "ideas" | "review")[];
  researchCapability?: { model:string; webSearchSupported:true; maxInputTokens:number; maxOutputTokens:number; checkedAt:string; connectionUpdatedAt:string };
  id: string;
  title: string;
  provider: "anthropic" | "openai" | "google";
  function: FunctionKind;
  model: string;
  hasKey: boolean;
  status: "unverified" | "validated" | "disconnected";
  updatedAt: string;
}
export interface Job {
  researchSourceUrls?: string[];
  reviewCorrection?: {reviewJobId:string;rootSubmissionId:string;round:number};
  uncertainPredecessorIds?: string[];
  writingFollowupId?: string;
  leaseExpiredAt?: string;
  settledReceiptLeaseId?: string;
  outcomeReceiptVersion?: 1;
  providerCompletion?: "complete"|"incomplete"|"refused";
  providerStopReason?: string;
  ideaRecovery?: {count:number;expected?:number;by:string;at:string};
  systemSnapshot?: string;
  referenceSnapshots?: Reference[];
  agentContextSnapshot?: ReturnType<typeof import("./agent-context").agentContext>;
  ideaPurpose?: "manual_assistance";
  providerUsage?: import("./usage-cost").ClaudeUsage;
  costBasis?: "provider_usage" | "human_reconciled";
  pricingSnapshot?: unknown;
  researchJobIds?: string[];
  researchSnapshots?: {jobId: string; raw: string}[];
  targetRevision?: number;
  targetIdentity?: string;
  targetAccepted?: boolean;
  outputContract?: "draft_v1" | "review_v1";
  outputStatus?: "ready" | "incomplete" | "invalid" | "conflict" | "applied";
  candidate?: import("./output-contracts").DraftResult;
  questionsDisposition?: { by: string; at: string; evidence: string };
  appliedAt?: string;
  appliedRevision?: number;
  preparationId?: string;
  connectionSnapshot?: {
    provider: Connection["provider"];
    model: string;
    function: FunctionKind;
  };
  id: string;
  kind: FunctionKind;
  channel: Channel;
  contentId?: string;
  prompt: string;
  connectionId: string;
  estimate: number;
  reserved: number;
  actual?: number;
  state:
    | "awaiting_confirmation"
    | "queued"
    | "running"
    | "succeeded"
    | "failed"
    | "unknown"
    | "cancelled"
    | "blocked";
  attempt: number;
  idempotencyKey: string;
  createdBy: string;
  createdAt: string;
  result?: string;
  error?: string;
  mediaRevision?: number;
  account?: string;
  workflowId?: string;
  workflowSnapshot?: Workflow;
  rulesSnapshot?: string;
  period?: string;
  payloadHash?: string;
  leaseId?: string;
  leaseUntil?: string;
  dispatchStartedAt?: string;
  localVideoOperation?: string;
  researchUnavailable?: true;
}
export interface Notice {
  id: string;
  user: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  emailState: "not_configured" | "pending" | "sent" | "failed";
  eventId: string;
}
export interface Audit {
  id: string;
  actor: string;
  action: string;
  target: string;
  at: string;
}
export interface Template {
  id: string;
  title: string;
  channel: Channel;
  slides: Slide[];
  status: "pending" | "approved";
  createdBy: string;
}
export interface Recurrence {
  id: string;
  title: string;
  channel: Channel;
  quantity: number;
  nextAt: string;
  research: boolean;
  state: "active" | "paused";
  lastOccurrence?: string;
  researchChoice?: { occurrence: string; allowed: boolean };
  cadence?: "daily" | "weekly";
}
export interface Settings {
  timezone: string;
  trashDays: number;
  monthlyCap: number;
  requestCap: number;
  confirmationThreshold: number;
  currency: string;
  functionCaps: Partial<Record<FunctionKind, number>>;
  userCaps: Record<string, number>;
  roleCaps?: Partial<Record<Role, number>>;
  projectCaps?: Record<string, number>;
  channelCaps?: Partial<Record<Channel, number>>;
  accountCaps?: Record<string, number>;
  protectedRules: string;
  protectedVersion: string;
  emailEnabled: boolean;
  docsMode: "manual" | "automatic";
  reviewPolicy?: SoloReviewPolicy;
  defaultConnections?: Partial<Record<FunctionKind, string>>;
  qualifiedRates?: import("./pricing").Rate[];
  pricingRegistryVersion?: number;
  founderSetup?: {actorId:string; email:string; at:string};
}
export interface FounderException {
  id: string;
  contentId: string;
  revision: number;
  wording: string;
  reason: string;
  by: string;
  at: string;
  ruleVersion: string;
}
export interface PlanningTask {
  id: string;
  title: string;
  kind: "draft" | "editing" | "workflow";
  contentId?: string;
  workflowId?: string;
  channel: Channel;
  at: string;
  notes: string;
  owner: string;
  state: "planned" | "done" | "cancelled";
  createdBy: string;
  createdAt: string;
}
export interface StudioState {
  pipelineBriefs?: import("./pipeline").PipelineBrief[];
  pipelineImports?: import("./pipeline").PipelineImport[];
  boundedChannelSelection?: {connectionId:string;value:boolean};
  agentVoiceExamples?: import("./agent-voice-library").AgentVoiceExample[];
  agentPackageArchives?: import("./agent-archives").AgentArchive[];
  agentRuleFiles?: import("./agent-rule-files").AgentRuleFile[];
  verificationRuns?: import("./verification-pack").VerificationRun[];
  preparations?: PreparationAuthorization[];
  planningTasks?: PlanningTask[];
  version: number;
  exceptions?: FounderException[];
  members: Member[];
  references: Reference[];
  workflows: Workflow[];
  ideas: Idea[];
  contents: Content[];
  packages: Package[];
  schedules: Schedule[];
  connections: Connection[];
  jobs: Job[];
  notices: Notice[];
  audit: Audit[];
  templates: Template[];
  recurrences: Recurrence[];
  settings: Settings;
}
export interface Command {
  type: string;
  [key: string]: unknown;
}
export interface StudioResponse {
  state: StudioState;
  actor: Actor;
  mode: "demo" | "live";
}
