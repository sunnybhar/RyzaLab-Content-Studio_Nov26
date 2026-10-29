"use client";
import { PricingManager } from "./pricing-manager";
import { ConnectionEditor } from "./connection-editor";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowDownToLine,
  BarChart3,
  UserRound,
  Palette,
  ArrowLeft,
  ArrowRight,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Clock3,
  Copy,
  FileText,
  FolderOpen,
  Grid2X2,
  History,
  House,
  Layers3,
  Lightbulb,
  Link2,
  ListFilter,
  LogOut,
  Menu,
  MoreHorizontal,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  Pin,
  PinOff,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  Video,
  WandSparkles,
  X,
  Zap,
} from "lucide-react";
import { ReviewCard } from "./review-card";
import { SoloReview } from "./solo-review";
import { DraftAssistant } from "./draft-assistant";
import { WorkflowVersions } from "./workflow-versions";
import { useStudio } from "@/lib/studio/client";
import {
  CHANNELS,
  FUNCTIONS,
  ROLES,
  type Channel,
  type Actor,
  type Command,
  type Content,
  type Idea,
  type MediaProject,
  type StudioState,
  type Slide,
  type Scene,
  type FunctionKind,
} from "@/lib/studio/types";
import { downloadCampaignArchive } from "@/lib/studio/campaign-export";
import { downloadText } from "@/lib/export";
import {
  exportContentDocument,
  importDocx,
  exportSlides,
  exportPostPackage,
  exportProject,
  importProject,
  exportSubtitles,
} from "@/lib/studio/exports";
import { can, type Scope } from "@/lib/studio/permissions";
import { stageSummary } from "@/lib/studio/stages";
import { SlideLayerEditor, SlideLayerPreview } from "./slide-layers";
import { StudioOperations } from "./studio-operations";
import { StudioAnalytics } from "./studio-analytics";
import { IdeaGenerationStatus } from "./idea-generation-status";
import { IdeasBrowser } from "./ideas-browser";
import { GenerationActivity } from "./generation-activity";
import { CalendarPackagePreview } from "./calendar-package-preview";
import { StageTracker } from "./stage-tracker";
import { PasswordLogin } from "./password-login";
import { configured, supabase } from "@/lib/supabase";
import "./workspace.css";

type Page =
  | "Home"
  | "Ideas"
  | "Calendar"
  | "Create"
  | "Reviews"
  | "Library"
  | "Workflow settings"
  | "People"
  | "AI & budgets"
  | "Notifications"
  | "Account & appearance"
  | "Analytics"
  | "Training & QA"
  | "Operations";
type Field = {
  name: string;
  label: string;
  value?: string | number;
  placeholder?: string;
  type?: string;
  options?: readonly string[];
  optionLabels?: Record<string, string>;
  required?: boolean;
  hint?: string;
  min?: number;
  max?: number;
  step?: number;
};
type Dialog = {
  title: string;
  description?: string;
  fields: Field[];
  submit: string;
  onSubmit: (data: FormData) => Promise<void>;
};
const nav = [
  { name: "Home", icon: House },
  { name: "Ideas", icon: Lightbulb },
  { name: "Calendar", icon: CalendarDays },
  { name: "Create", icon: Sparkles },
  { name: "Reviews", icon: ShieldCheck },
  { name: "Library", icon: FolderOpen },
  { name: "Analytics", icon: BarChart3 },
  { name: "Training & QA", icon: BookOpen },
] as const;
const channelMarks: Record<Channel, string> = {
  LinkedIn: "in",
  Instagram: "◎",
  TikTok: "♪",
  Facebook: "f",
  YouTube: "▶",
  Reddit: "r",
  Notes: "N",
  Newsletter: "✉",
  Hub: "H",
};
const channelDescriptions: Record<Channel, string> = {
  LinkedIn: "Perspectives that start a conversation.",
  Instagram: "Stories made to stop the scroll.",
  TikTok: "Fresh ideas, one scene at a time.",
  Facebook: "Bring your community closer.",
  YouTube: "Make room for the bigger story.",
  Reddit: "Conversations built on real value.",
  Notes: "Small thoughts. Lasting connections.",
  Newsletter: "A direct line to your audience.",
  Hub: "Your home for long-form thinking.",
};
const money = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    v / 100,
  );
const stamp = (v: string) =>
  new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const field = (
  name: string,
  label: string,
  value?: string | number,
  type = "text",
): Field => ({ name, label, value, type });
const val = (d: FormData, k: string) => String(d.get(k) || "");
const cents = (d: FormData, k: string) =>
  Math.round(Number(d.get(k) || 0) * 100);
const key = () => globalThis.crypto.randomUUID();
const makeSlide = (): Slide => ({
  id: key(),
  title: "A new perspective",
  body: "Add your story here.",
  background: "#f4f2e9",
  color: "#103f43",
  x: 8,
  y: 18,
  fontSize: 70,
});
const makeScene = (): Scene => ({
  id: key(),
  title: "New scene",
  script: "",
  duration: 5,
  preserveAudio: true,
});
function workspaceTime(value: string, zone: string): string {
  const [year, month, day, hour, minute] = value.split(/[-T:]/).map(Number);
  const target = Date.UTC(year, month - 1, day, hour, minute);
  let result = target;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  for (let i = 0; i < 3; i++) {
    const p = Object.fromEntries(
      formatter.formatToParts(new Date(result)).map((p) => [p.type, p.value]),
    );
    const represented = Date.UTC(
      Number(p.year),
      Number(p.month) - 1,
      Number(p.day),
      Number(p.hour),
      Number(p.minute),
    );
    result += target - represented;
  }
  const p = Object.fromEntries(
    formatter.formatToParts(new Date(result)).map((p) => [p.type, p.value]),
  );
  if (Number(p.hour) !== hour || Number(p.minute) !== minute)
    throw new Error(
      "This time does not exist in the workspace timezone. Choose another time.",
    );
  return new Date(result).toISOString();
}
function dateKey(value: string, zone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}
function safeUrl(value: string | undefined) {
  if (!value) return undefined;
  try {
    const u = new URL(
      value,
      typeof window === "undefined"
        ? "https://studio.invalid"
        : window.location.origin,
    );
    return ["http:", "https:"].includes(u.protocol) ? u.href : undefined;
  } catch {
    return undefined;
  }
}
const initialMedia = (): MediaProject => ({
  slides: [],
  scenes: [],
  imagePrompt: "",
  narration: "",
  captions: "",
  aspect: "9:16",
});
function AssetMedia({
  source,
  kind = "image",
}: {
  source: string;
  kind?: "image" | "video" | "audio";
}) {
  const [url, setUrl] = useState<string | undefined>();
  const [failure, setFailure] = useState("");
  useEffect(() => {
    let disposed = false;
    let objectUrl = "";
    setFailure("");
    setUrl(undefined);
    async function load() {
      if (!source.startsWith("/api/studio/assets")) {
        const allowed = source.startsWith("data:") ? source : safeUrl(source);
        setUrl(allowed);
        return;
      }
      try {
        const session = await supabase?.auth.getSession();
        const token = session?.data.session?.access_token;
        if (!token) throw new Error("Sign in to preview private media.");
        const response = await fetch(source, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok)
          throw new Error("Private media preview is unavailable.");
        objectUrl = URL.createObjectURL(await response.blob());
        if (!disposed) setUrl(objectUrl);
      } catch (e) {
        if (!disposed) setFailure(String(e));
      }
    }
    void load();
    return () => {
      disposed = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [source]);
  if (failure) return <small className="s-asset-error">{failure}</small>;
  if (!url) return <small className="s-asset-error">Loading media…</small>;
  return kind === "video" ? (
    <video controls preload="metadata" src={url} />
  ) : kind === "audio" ? (
    <audio controls preload="metadata" src={url} />
  ) : (
    <img src={url} alt="Slide source" />
  );
}
function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`s-badge s-${tone}`}>{children}</span>;
}
function ChannelIcon({
  channel,
  small = false,
}: {
  channel: Channel;
  small?: boolean;
}) {
  return (
    <span
      className={`s-channel-icon s-channel-${channel.toLowerCase()} ${small ? "s-small" : ""}`}
    >
      {channelMarks[channel]}
    </span>
  );
}
function Empty({
  icon: Icon = FolderOpen,
  title,
  children,
  action,
}: {
  icon?: typeof FolderOpen;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="s-empty">
      <span>
        <Icon size={27} />
      </span>
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
function FieldInput({ item }: { item: Field }) {
  return (
    <label className="s-field">
      {item.label}
      {item.type === "checkbox" ? (
        <input
          aria-label={item.label}
          type="checkbox"
          name={item.name}
          required={item.required}
          defaultChecked={item.value === "true"}
        />
      ) : item.type === "textarea" ? (
        <textarea
          aria-label={item.label}
          name={item.name}
          defaultValue={item.value}
          placeholder={item.placeholder}
          required={item.required}
          rows={5}
        />
      ) : item.options ? (
        <select
          aria-label={item.label}
          name={item.name}
          defaultValue={item.value}
        >
          {item.options.map((v) => (
            <option key={v} value={v}>
              {item.optionLabels?.[v] || v || "Choose an option"}
            </option>
          ))}
        </select>
      ) : (
        <input
          aria-label={item.label}
          name={item.name}
          defaultValue={item.value}
          placeholder={item.placeholder}
          type={item.type || "text"}
          required={item.required}
          min={item.min ?? (item.type === "number" ? 0 : undefined)}
          max={item.max}
          step={item.step ?? (item.type === "number" ? "0.01" : undefined)}
          autoComplete={item.type === "password" ? "new-password" : undefined}
        />
      )}{" "}
      {item.hint && <small>{item.hint}</small>}
    </label>
  );
}

export default function Workspace() {
  const { state, actor, mode, loading, error, send, refresh, signOut } =
    useStudio();
  const [page, setPage] = useState<Page>("Home");
  const [channel, setChannel] = useState<Channel | "All channels">(
    "All channels",
  );
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [busy, setBusy] = useState(false);
  const [connectionChecks, setConnectionChecks] = useState<
    Record<
      string,
      { status: "checking" | "success" | "error"; message: string }
    >
  >({});
  const [notice, setNoticeState] = useState("");
  const [noticeSequence, setNoticeSequence] = useState(0);
  const setNotice = (message: string) => {
    setNoticeState(message);
    setNoticeSequence((n) => n + 1);
  };
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNoticeState(""), 10000);
    return () => clearTimeout(timer);
  }, [notice, noticeSequence]);
  const [localError, setLocalError] = useState("");
  const [approvalErrors, setApprovalErrors] = useState<Record<string, string>>(
    {},
  );
  const [approvalTarget, setApprovalTarget] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [libraryTab, setLibraryTab] = useState("Content");
  const [ideaTab, setIdeaTab] = useState("All ideas");
  const [calendarView, setCalendarView] = useState("Month");
  const [calendarPreview, setCalendarPreview] = useState<string | null>(null);
  const [month, setMonth] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavigation, setMobileNavigation] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 760px)");
    const update = () => {
      setMobileNavigation(media.matches);
      setMenuOpen(false);
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const [queueTarget, setQueueTarget] = useState<Content | "general" | null>(
    null,
  );
  const [workflowChannel, setWorkflowChannel] = useState<Channel>("LinkedIn");
  const [layout, setLayout] = useState<"command" | "board">("command");
  const [theme, setTheme] = useState<"midnight" | "daylight">("midnight");
  const [sidebarPinned, setSidebarPinned] = useState(true);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [preferenceActor, setPreferenceActor] = useState("");
  const preferenceKey = actor
    ? `ryzalab:workspace-preferences:v1:${actor.id}`
    : "";
  useEffect(() => {
    if (!preferenceKey) {
      setPreferenceActor("");
      return;
    }
    let preferences: {
      layout?: string;
      pinned?: boolean;
      expanded?: boolean;
      theme?: string;
    } = {};
    try {
      preferences = JSON.parse(localStorage.getItem(preferenceKey) || "{}");
    } catch {
      /* Device storage may be unavailable. */
    }
    setLayout(preferences.layout === "board" ? "board" : "command");
    setTheme(preferences.theme === "daylight" ? "daylight" : "midnight");
    setSidebarPinned(preferences.pinned !== false);
    setSidebarExpanded(preferences.expanded !== false);
    setMenuOpen(false);
    setPreferenceActor(preferenceKey);
  }, [preferenceKey]);
  useEffect(() => {
    if (!preferenceKey || preferenceActor !== preferenceKey) return;
    try {
      localStorage.setItem(
        preferenceKey,
        JSON.stringify({
          layout,
          theme,
          pinned: sidebarPinned,
          expanded: sidebarExpanded,
        }),
      );
    } catch {
      /* Keep preferences for this session. */
    }
  }, [
    preferenceKey,
    preferenceActor,
    layout,
    theme,
    sidebarPinned,
    sidebarExpanded,
  ]);
  useEffect(() => {
    if (!dialog && !queueTarget && !menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const previous = document.activeElement as HTMLElement | null;
    const container = document.querySelector<HTMLElement>(
      dialog || queueTarget ? '[role="dialog"]' : "#workspace-navigation",
    );
    const focusable = () =>
      Array.from(
        container?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]',
        ) || [],
      ).filter((el) => el.getClientRects().length > 0);
    focusable()[0]?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) {
        setDialog(null);
        setQueueTarget(null);
        setMenuOpen(false);
      }
      if (event.key === "Tab") {
        const items = focusable();
        const first = items[0],
          last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, [dialog, queueTarget, menuOpen, busy]);
  async function execute(command: Command, message = "Changes saved") {
    setBusy(true);
    setLocalError("");
    const approvalKey =
      command.type === "package.approve"
        ? `${command.contentId}:${command.expectedRevision}`
        : "";
    if (approvalKey) {
      setApprovalTarget(approvalKey);
      setApprovalErrors((previous) => ({ ...previous, [approvalKey]: "" }));
    }
    try {
      await send(command);
      if (message) setNotice(message);
      if (approvalKey)
        requestAnimationFrame(() => {
          if (!document.querySelector(".s-review-grid")) return;
          const target =
            document.querySelector<HTMLElement>(
              ".s-review-grid .s-review-row button",
            ) || document.querySelector<HTMLElement>(".s-page-heading h1");
          target?.focus({ preventScroll: true });
        });
      return true;
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "The action could not be completed.";
      setLocalError(message);
      if (approvalKey)
        setApprovalErrors((previous) => ({
          ...previous,
          [approvalKey]: message,
        }));
      return false;
    } finally {
      if (approvalKey) setApprovalTarget("");
      setBusy(false);
    }
  }
  function openForm(
    title: string,
    fields: Field[],
    command: (d: FormData) => Command,
    description?: string,
    submit = "Save changes",
  ) {
    document
      .querySelector<HTMLDialogElement>(".s-review-dialog[open]")
      ?.close();
    setLocalError("");
    setDialog({
      title,
      fields,
      description,
      submit,
      onSubmit: async (d) => {
        if (await execute(command(d))) setDialog(null);
      },
    });
  }
  function move(next: Page) {
    setPage(next);
    setSelected(null);
    setMenuOpen(false);
    setSearch("");
  }
  if (!loading && !actor && configured && !error) return <PasswordLogin />;
  if (loading || !state || !actor)
    return (
      <div className="studio-v2">
        <div className="s-loading">
          <span className="s-brand">
            RyzaLab<span>STUDIO</span>
          </span>
          <p>{error || "Opening your workspace…"}</p>
          {error && (
            <button className="s-btn" onClick={() => void refresh()}>
              Try again
            </button>
          )}
        </div>
      </div>
    );
  const member = state.members.find(
    (m) => m.email.toLowerCase() === actor.email.toLowerCase() && !m.revoked,
  );
  const roles = member?.roles || [];
  const founder = roles.includes("founder");
  const admin = founder || roles.includes("administrator");
  const readOnly = roles.length === 0 || roles.every((r) => r === "viewer");
  const liveContents = state.contents.filter((c) => !c.deletedAt);
  const matches = (c: { channel: Channel; title: string }) =>
    (channel === "All channels" || c.channel === channel) &&
    (!search || c.title.toLowerCase().includes(search.toLowerCase()));
  const filtered = liveContents.filter(matches);
  const pendingIdeas = state.ideas.filter((i) => i.state === "pending");
  const reviews = liveContents.filter(
    (c) =>
      c.state === "review" &&
      !state.packages.some(
        (p) => p.contentId === c.id && p.revision === c.revision,
      ),
  );
  const unread = state.notices.filter((n) => !n.read);
  const upcoming = state.schedules
    .filter((s) => s.state === "planned")
    .sort((a, b) => a.at.localeCompare(b.at));
  const activeContent = state.contents.find(
    (c) => c.id === selected && !c.deletedAt,
  );
  const totalSpend = state.jobs.reduce(
    (a, j) => a + (j.actual || j.reserved || 0),
    0,
  );
  const activePackages = state.packages.filter(
    (p) => !state.contents.find((c) => c.id === p.contentId)?.deletedAt,
  );
  const allowed = (action: string, scope: Scope = {}) =>
    can(state, actor, action, scope);
  const readyToPlan = activePackages.filter((p) => {
    const content = state.contents.find((c) => c.id === p.contentId && !c.deletedAt);
    return Boolean(content && content.account === p.account && matches(p) &&
      allowed("schedule.manage", { channel: content.channel, account: content.account, contentId: content.id, assignedTo: content.assignedTo }) &&
      !state.schedules.some((s) => s.packageId === p.id) &&
      !activePackages.some((other) => other.contentId === p.contentId && other.approvedAt > p.approvedAt));
  });
  const previewSchedule = state.schedules.find((s) => s.id === calendarPreview);
  const newContent = (
    ideaId?: string,
    ideaTitle?: string,
    ideaChannel?: Channel,
  ) =>
    openForm(
      "Create something worth sharing",
      [
        {
          name: "title",
          label: "Working title",
          value: ideaTitle,
          placeholder: "What is your story?",
          required: true,
        },
        {
          name: "channel",
          label: "Channel",
          value:
            ideaChannel || (channel === "All channels" ? "LinkedIn" : channel),
          options: CHANNELS,
        },
        {
          name: "format",
          label: "Format",
          value: "Text post",
          options: [
            "Text post",
            "Carousel",
            "Image",
            "Video",
            "Article",
            "Newsletter",
            "Audio",
          ],
        },
        field("account", "Account / publication (optional)"),
      ],
      (d) => ({
        type: "content.create",
        title: val(d, "title"),
        channel: val(d, "channel"),
        format: val(d, "format"),
        account: val(d, "account"),
        ideaId,
      }),
      "Start with a clear idea. Your channel workflow will guide the draft.",
      "Create draft",
    );
  async function useIdea(idea: Idea, format: string, account: string) {
    setBusy(true);
    setLocalError("");
    try {
      const result = await send({
        type: "idea.use", id: idea.id, format, account,
      });
      const draft = result.state.contents.find(
        (item) => item.ideaId === idea.id && item.createdBy === actor!.email && !item.deletedAt,
      );
      if (!draft) throw new Error("The linked draft could not be found. Refresh the workspace and try again.");
      setPage("Create");
      setSelected(draft.id);
      setSearch("");
      setNotice("Draft ready to edit.");
      return true;
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "The idea could not be opened.");
      return false;
    } finally { setBusy(false); }
  }
  const scheduleForm = (contentId?: string, initialPackageId?: string) => {
    const packages = activePackages.filter(
      (p) => !contentId || p.contentId === contentId,
    );
    if (!packages.length) {
      setLocalError(
        "Approve a content revision in Reviews before adding it to the calendar.",
      );
      return;
    }
    setDialog({
      title: "Plan a manual publication",
      description:
        "Schedule an approved package. A person will publish it and confirm the final link.",
      submit: "Add to calendar",
      fields: [
        {
          name: "packageId",
          label: "Approved package",
          value: packages.find((p) => p.id === initialPackageId)?.id || packages[0].id,
          options: packages.map((p) => p.id),
          optionLabels: Object.fromEntries(
            packages.map((p) => [
              p.id,
              `${p.title} · ${p.channel} · Revision ${p.revision}`,
            ]),
          ),
          hint: packages
            .map((p) => `${p.id}: ${p.title} · v${p.revision}`)
            .join("\n"),
        },
        {
          name: "at",
          label: `Publication time (${state.settings.timezone})`,
          type: "datetime-local",
          required: true,
        },
        field("groupId", "Campaign group (optional)"),
      ],
      onSubmit: async (d) => {
        const p = packages.find((p) => p.id === val(d, "packageId"))!;
        if (
          await execute(
            {
              type: "schedule.create",
              contentId: p.contentId,
              packageId: p.id,
              at: workspaceTime(val(d, "at"), state.settings.timezone),
              groupId: val(d, "groupId") || undefined,
            },
            "Publication planned",
          )
        )
          setDialog(null);
      },
    });
  };
  function openDraft(id: string) {
    move("Create");
    setSelected(id);
  }
  function taskForm(kind: "draft" | "editing" | "workflow", day?: string) {
    const targets =
      kind === "workflow"
        ? state!.workflows.filter((w) =>
            allowed("workflow.edit", { channel: w.channel }),
          )
        : state!.contents.filter(
            (c) =>
              !c.deletedAt &&
              allowed("content.edit", {
                channel: c.channel,
                contentId: c.id,
                account: c.account,
                assignedTo: c.assignedTo,
              }),
          );
    if (!targets.length) {
      setLocalError(
        kind === "workflow"
          ? "Create a workflow in Workflow settings before planning its work."
          : "Create a draft in Create before planning drafting or editing work.",
      );
      return;
    }
    setDialog({
      title:
        kind === "workflow"
          ? "Plan workflow work"
          : kind === "draft"
            ? "Plan drafting"
            : "Plan editing",
      description:
        "A planning task is a reminder for a person. It does not approve, publish or run paid generation.",
      submit: "Save planning task",
      fields: [
        {
          ...field(
            "title",
            "Task title",
            kind === "workflow"
              ? "Review channel workflow"
              : kind === "draft"
                ? "Write draft"
                : "Edit draft",
          ),
          required: true,
        },
        {
          name: "target",
          label: kind === "workflow" ? "Workflow" : "Draft",
          options: targets.map((t) => t.id),
          optionLabels: Object.fromEntries(
            targets.map((t) => [t.id, `${t.title} · ${t.channel}`]),
          ),
        },
        {
          name: "at",
          label: `Task time (${state!.settings.timezone})`,
          type: "datetime-local",
          value: day ? day + "T09:00" : undefined,
          required: true,
        },
        field("notes", "Task notes", "", "textarea"),
      ],
      onSubmit: async (data) => {
        const target = targets.find((t) => t.id === val(data, "target"))!;
        if (
          await execute(
            {
              type: "task.create",
              title: val(data, "title"),
              kind,
              channel: target.channel,
              ...(kind === "workflow"
                ? { workflowId: target.id }
                : { contentId: target.id }),
              at: workspaceTime(val(data, "at"), state!.settings.timezone),
              notes: val(data, "notes"),
            },
            "Planning task saved",
          )
        )
          setDialog(null);
      },
    });
  }
  function calendarChoice(day?: string) {
    setDialog({
      title: "Add to calendar",
      description:
        "Choose a publication or a human work task. Publication requires an approved package.",
      submit: "Continue",
      fields: [
        {
          name: "kind",
          label: "What do you want to schedule?",
          options: [
            "Drafting",
            "Editing",
            "Workflow work",
            "Approved publication",
          ],
        },
      ],
      onSubmit: async (data) => {
        const kind = val(data, "kind");
        if (kind === "Approved publication") {
          setDialog(null);
          scheduleForm();
        } else
          taskForm(
            kind === "Workflow work"
              ? "workflow"
              : kind === "Drafting"
                ? "draft"
                : "editing",
            day,
          );
      },
    });
  }
  function openPlanningTask(
    task: NonNullable<StudioState["planningTasks"]>[number],
  ) {
    if (task.contentId) openDraft(task.contentId);
    else {
      setWorkflowChannel(task.channel);
      move("Workflow settings");
    }
  }
  async function pricingRequest(body?: unknown) {
    const session = await supabase?.auth.getSession();
    const token = session?.data.session?.access_token;
    if (!token) throw new Error("Sign in to manage verified pricing.");
    const response = await fetch("/api/studio/pricing", { method: body ? "POST" : "GET", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, ...(body ? {body: JSON.stringify(body)} : {}), signal: AbortSignal.timeout(30000) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not update pricing.");
    return result;
  }
  async function discoverAccountModels(input: Record<string, unknown>) {
    const session = await supabase?.auth.getSession();
    const token = session?.data.session?.access_token;
    if (!token) throw new Error("Sign in to load provider account models.");
    const response = await fetch("/api/studio/connections/models", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(input), signal: AbortSignal.timeout(30000) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not load account models.");
    return result.models as string[];
  }
  async function validateAI(id: string) {
    if (mode === "demo") {
      setLocalError(
        "Provider validation requires a live workspace and stored provider credentials.",
      );
      return;
    }
    setBusy(true);
    setLocalError("");
    setConnectionChecks((previous) => ({
      ...previous,
      [id]: {
        status: "checking",
        message: "Checking model access with your provider…",
      },
    }));
    try {
      const session = await supabase?.auth.getSession();
      const token = session?.data.session?.access_token;
      if (!token) throw new Error("Sign in to validate a connection.");
      const response = await fetch("/api/studio/connections/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id }),
        signal: AbortSignal.timeout(30000),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Provider validation failed.");
      await refresh();
      setConnectionChecks((previous) => ({
        ...previous,
        [id]: {
          status: "success",
          message:
            "Model access checked successfully. Generation remains subject to pricing and budget setup.",
        },
      }));
      setNotice(
        "Model access validated. Review output quality and spending allowances before generation.",
      );
    } catch (e) {
      const message =
        e instanceof Error &&
        (e.name === "TimeoutError" || e.name === "AbortError")
          ? "The access check timed out. No content generation was requested. Retry the model access check."
          : e instanceof Error
            ? e.message
            : "Provider validation failed.";
      setConnectionChecks((previous) => ({
        ...previous,
        [id]: { status: "error", message },
      }));
      setLocalError(message);
    } finally {
      setBusy(false);
    }
  }
  const addMember = () =>
    setDialog({
      title: "Add a team member",
      description:
        "Assign an existing account, or set an initial password to create a new sign-in account. No invitation email is sent.",
      submit: "Save member",
      fields: [
        {
          name: "email",
          label: "Email address",
          type: "email",
          required: true,
        },
        {
          name: "password",
          label: "Initial password (new accounts only)",
          type: "password",
          hint:
            mode === "demo"
              ? "Demo mode never creates accounts or stores passwords."
              : "At least 12 characters. Share it privately with the person; they can change it after signing in.",
        },
        {
          name: "roles",
          label: "Roles (comma separated)",
          value: "creator",
          hint: ROLES.join(", "),
        },
        {
          name: "grants",
          label: "Scoped grants (JSON array)",
          type: "textarea",
          value: "[]",
          hint: 'Optional: [{"action":"content.edit","channel":"LinkedIn"}]',
        },
      ],
      onSubmit: async (d) => {
        const email = val(d, "email");
        const password = val(d, "password");
        const grants = JSON.parse(val(d, "grants") || "[]");
        if (password && mode === "live") {
          setBusy(true);
          try {
            const session = await supabase?.auth.getSession();
            const token = session?.data.session?.access_token;
            if (!token) throw new Error("Sign in to add an account.");
            const response = await fetch("/api/invite", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ email, password }),
            });
            const result = await response.json();
            if (!response.ok)
              throw new Error(
                result.error || "The account could not be created.",
              );
          } finally {
            setBusy(false);
          }
        }
        if (
          await execute(
            {
              type: "member.save",
              email,
              roles: val(d, "roles")
                .split(",")
                .map((x) => x.trim())
                .filter(Boolean),
              grants,
            },
            "Member access saved",
          )
        )
          setDialog(null);
      },
    });
  const reject = (type: "idea.review" | "package.reject", id: string) =>
    openForm(
      "Request changes",
      [
        {
          name: "reason",
          label: "Feedback for the creator",
          type: "textarea",
          required: true,
        },
      ],
      (d) =>
        type === "idea.review"
          ? { type, id, decision: "rejected", reason: val(d, "reason") }
          : { type, contentId: id, reason: val(d, "reason") },
      "Give clear, specific feedback so the next revision is stronger.",
      "Send feedback",
    );
  const openContent = (c: Content) => {
    setSelected(c.id);
    setPage("Create");
  };
  const contentRows = (items: Content[]) =>
    items.length ? (
      <div className="s-table">
        <div className="s-table-head">
          <span>Content</span>
          <span>Channel</span>
          <span>Status</span>
          <span>Updated</span>
          <span />
        </div>
        {items.map((c) => (
          <div className="s-table-row" key={c.id}>
            <button className="s-content-title" onClick={() => openContent(c)}>
              <span className="s-doc-icon">
                <FileText size={17} />
              </span>
              <span>
                <strong>{c.title}</strong>
                <small>
                  {c.format} · Revision {c.revision}
                  {c.collection ? ` · ${c.collection}` : ""}
                </small>
              </span>
            </button>
            <span className="s-inline">
              <ChannelIcon channel={c.channel} small />
              {c.channel}
            </span>
            <span>
              <Badge
                tone={
                  state.packages.some(
                    (p) => p.contentId === c.id && p.revision === c.revision,
                  )
                    ? "green"
                    : c.state === "review"
                      ? "amber"
                      : c.state === "changes"
                        ? "red"
                        : "neutral"
                }
              >
                {state.packages.some(
                  (p) => p.contentId === c.id && p.revision === c.revision,
                )
                  ? "Approved"
                  : c.state === "review"
                    ? "In review"
                    : c.state === "changes"
                      ? "Changes requested"
                      : "Draft"}
              </Badge>
            </span>
            <span className="s-muted">{stamp(c.updatedAt)}</span>
            <button
              className="s-icon-button"
              aria-label={`Open ${c.title}`}
              onClick={() => openContent(c)}
            >
              <ArrowRight size={17} />
            </button>
          </div>
        ))}
      </div>
    ) : (
      <Empty
        title="A little space for your next big idea"
        action={
          !readOnly && (
            <button className="s-btn s-primary" onClick={() => newContent()}>
              <Plus size={15} /> Create content
            </button>
          )
        }
      >
        Your drafts and stories will appear here as you create.
      </Empty>
    );
  const pageDescription: Record<Page, string> = {
    Operations:
      "Inspect job failures, uncertain charges and application dependencies.",
    "Training & QA":
      "Step-by-step training, manual acceptance tests and the delivery backlog.",
    Home: "You create. Your team reviews. A person always hits publish.",
    Ideas: "The starting point for your next great story.",
    Calendar:
      "Plan publications, drafting, editing and workflow work in one calendar.",
    Analytics:
      "Track content, human-confirmed publications and Studio activity.",
    "Account & appearance": "Your profile, layout and display preferences.",
    Create: "Turn a good idea into something people remember.",
    Reviews: "A thoughtful second look before the world sees it.",
    Library: "Everything you have created, all in one place.",
    "Workflow settings":
      "A shared standard. A distinct voice for every channel.",
    People: "Good work is better together.",
    "AI & budgets": "Your tools, your limits, your creative control.",
    Notifications: "Stay in the loop, without the noise.",
  };
  const heading =
    page === "Home"
      ? layout === "board"
        ? "Your production board"
        : "Your campaign command center"
      : page === "Workflow settings"
        ? "Built around your brand"
        : page;
  return (
    <div
      className={`studio-v2 s-theme-${theme} ${sidebarPinned ? "s-sidebar-pinned" : "s-sidebar-unpinned"} ${sidebarExpanded ? "s-sidebar-expanded" : "s-sidebar-collapsed"}`}
    >
      {menuOpen && (
        <button
          className="s-navigation-backdrop"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside
        id="workspace-navigation"
        aria-label="Workspace navigation"
        inert={!menuOpen && (!sidebarPinned || mobileNavigation)}
        role={menuOpen ? "dialog" : undefined}
        aria-modal={menuOpen ? true : undefined}
        className={`s-sidebar ${menuOpen ? "s-open" : ""}`}
      >
        <div className="s-sidebar-controls">
          <button
            className="s-icon-button s-collapse-control"
            aria-label={sidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
            title={sidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
            onClick={() => setSidebarExpanded(!sidebarExpanded)}
          >
            {sidebarExpanded ? (
              <PanelLeftClose size={19} />
            ) : (
              <PanelLeftOpen size={19} />
            )}
          </button>
          <button
            className="s-icon-button s-pin-control"
            aria-label={sidebarPinned ? "Unpin sidebar" : "Pin sidebar"}
            aria-pressed={sidebarPinned}
            title={sidebarPinned ? "Unpin sidebar" : "Pin sidebar"}
            onClick={() => {
              setSidebarPinned(!sidebarPinned);
              setMenuOpen(false);
            }}
          >
            {sidebarPinned ? <Pin size={17} /> : <PinOff size={17} />}
          </button>
          <button
            className="s-icon-button s-close-navigation"
            aria-label="Close navigation"
            onClick={() => setMenuOpen(false)}
          >
            <X size={19} />
          </button>
        </div>
        <button
          className="s-brand"
          aria-label="RyzaLab Studio home"
          title="RyzaLab Studio home"
          onClick={() => move("Home")}
        >
          RyzaLab<span>STUDIO</span>
        </button>
        <div className="s-workspace-switch">
          <span className="s-workspace-mark">R</span>
          <span>
            <strong>RyzaLab workspace</strong>
            <small>{mode === "demo" ? "Demo workspace" : "Content team"}</small>
          </span>
          <ChevronDown size={14} />
        </div>
        <span className="s-nav-label">WORKSPACE</span>
        <nav>
          {nav.map(({ name, icon: Icon }) => (
            <button
              key={name}
              aria-label={name}
              title={name}
              aria-current={page === name ? "page" : undefined}
              className={page === name ? "s-active" : ""}
              onClick={() => move(name)}
            >
              <Icon size={18} />
              <span>{name}</span>
              {name === "Reviews" && reviews.length > 0 && (
                <b>{reviews.length}</b>
              )}
            </button>
          ))}
        </nav>
        <div className="s-nav-separator" />
        <span className="s-nav-label">MANAGE</span>
        <nav>
          <button
            aria-label="Workflow settings"
            title="Workflow settings"
            aria-current={page === "Workflow settings" ? "page" : undefined}
            className={page === "Workflow settings" ? "s-active" : ""}
            onClick={() => move("Workflow settings")}
          >
            <Settings2 size={18} />
            <span>Workflow settings</span>
          </button>
          <button
            aria-label="People & access"
            title="People & access"
            aria-current={page === "People" ? "page" : undefined}
            className={page === "People" ? "s-active" : ""}
            onClick={() => move("People")}
          >
            <Users size={18} />
            <span>People & access</span>
          </button>
          <button
            aria-label="AI & budgets"
            title="AI & budgets"
            aria-current={page === "AI & budgets" ? "page" : undefined}
            className={page === "AI & budgets" ? "s-active" : ""}
            onClick={() => move("AI & budgets")}
          >
            <Zap size={18} />
            <span>AI & budgets</span>
          </button>
        </nav>
        {allowed("settings.manage") && (
          <button
            className={`s-btn s-small-btn ${page === "Operations" ? "s-active" : ""}`}
            aria-current={page === "Operations" ? "page" : undefined}
            onClick={() => move("Operations")}
          >
            <ShieldCheck size={16} /> Operations
          </button>
        )}
        <div className="s-sidebar-bottom">
          <button
            className={`s-user ${page === "Account & appearance" ? "s-active" : ""}`}
            aria-current={page === "Account & appearance" ? "page" : undefined}
            onClick={() => move("Account & appearance")}
            title="Account & appearance"
            aria-label="Open account and appearance"
          >
            <span>{actor.email.slice(0, 2).toUpperCase()}</span>
            <span>
              <strong>{actor.email.split("@")[0]}</strong>
              <small>{roles.join(", ") || "Member"}</small>
            </span>
            <LogOut size={15} />
          </button>
        </div>
      </aside>
      <div className="s-main">
        <header className="s-topbar">
          <div className="s-breadcrumb">
            <button
              className="s-mobile-menu"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="workspace-navigation"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>{page}</strong>
          </div>
          <div
            className="s-layout-toggle"
            role="group"
            aria-label="Workspace layout"
          >
            <button
              aria-pressed={layout === "command"}
              onClick={() => {
                setLayout("command");
                move("Home");
              }}
            >
              <House size={15} />
              <span>Command Center</span>
            </button>
            <button
              aria-pressed={layout === "board"}
              onClick={() => {
                setLayout("board");
                move("Home");
              }}
            >
              <Grid2X2 size={15} />
              <span>Production Board</span>
            </button>
          </div>
          <div className="s-top-actions">
            <div className="s-release-label" aria-label="Studio version">
              <strong>RyzaLab Studio</strong>
              <small>
                v{process.env.NEXT_PUBLIC_STUDIO_VERSION || "0.2.0"} ·{" "}
                {process.env.NEXT_PUBLIC_STUDIO_COMMIT || "local"}
              </small>
            </div>
            <button
              className="s-btn s-small-btn"
              aria-label="Appearance and layout"
              onClick={() => move("Account & appearance")}
            >
              <Palette size={16} />
              <span>Appearance</span>
            </button>
            {mode === "demo" && (
              <Badge tone="amber">Demo mode · saved on this device</Badge>
            )}
            <span className="s-manual">
              <span /> Manual publishing
            </span>
            <button
              className="s-icon-button s-bell"
              aria-label="Notifications"
              onClick={() => move("Notifications")}
            >
              <Bell size={19} />
              {unread.length > 0 && <i />}
            </button>
            <button
              className="s-avatar"
              aria-label="Open profile"
              title="Account & appearance"
              onClick={() => move("Account & appearance")}
            >
              {actor.email.slice(0, 2).toUpperCase()}
            </button>
          </div>
        </header>
        <main className="s-main-content">
          {(error || localError) && (
            <div className="s-alert s-error" role="alert">
              <span>{localError || error}</span>
              <button
                aria-label="Dismiss error"
                onClick={() => setLocalError("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {notice && (
            <div className="s-toast" role="status">
              <Check size={17} />
              {notice}
              <button
                aria-label="Dismiss notification"
                onClick={() => setNotice("")}
              >
                <X size={15} />
              </button>
            </div>
          )}
          <div className="s-page-heading">
            <div>
              <div className="s-eyebrow">
                {page === "Home"
                  ? new Date().toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    }) + " · RYZALAB STUDIO · HUMAN BY DESIGN"
                  : "RYZALAB STUDIO"}
              </div>
              <h1 tabIndex={-1}>{heading}</h1>
              <p>{pageDescription[page]}</p>
            </div>
            <div className="s-actions">
              {page === "Calendar" ? (
                <button
                  disabled={readOnly}
                  className="s-btn s-primary"
                  onClick={() => calendarChoice()}
                >
                  <Plus size={16} /> Add to calendar
                </button>
              ) : page === "Ideas" ? (
                <>
                  <button
                    disabled={readOnly}
                    className="s-btn s-primary"
                    onClick={() =>
                      openForm(
                        "Generate ideas with an agent",
                        [
                          {
                            ...field("topic", "Topic / Brief", "", "textarea"),
                            required: true,
                          },
                          { ...field("audience", "Audience"), required: true },
                          {
                            ...field("quantity", "Quantity", 3, "number"),
                            min: 1,
                            max: 20,
                            step: 1,
                            required: true,
                          },
                          {
                            name: "channel",
                            label: "Channel",
                            options: CHANNELS,
                            value:
                              channel === "All channels" ? "LinkedIn" : channel,
                          },
                          {
                            name: "research",
                            label: "Use web research",
                            type: "checkbox",
                            hint: "Research is optional and only runs with your explicit choice.",
                          },
                          {
                            ...field(
                              "sourceText",
                              "Source references / source text",
                              "",
                              "textarea",
                            ),
                            hint: "Paste source URLs, excerpts, or reference notes.",
                          },
                          ...(mode === "demo"
                            ? []
                            : [
                                {
                                  name: "consent",
                                  label:
                                    "I authorize this AI request and its configured budget usage",
                                  type: "checkbox",
                                  required: true,
                                },
                              ]),
                        ],
                        (d) => ({
                          type: "idea.generate",
                          channel: val(d, "channel"),
                          topic: val(d, "topic"),
                          audience: val(d, "audience"),
                          quantity: Number(val(d, "quantity")),
                          research: d.get("research") === "on",
                          sourceText: val(d, "sourceText"),
                          idempotencyKey: key(),
                        }),
                        mode === "demo"
                          ? "Preview clearly labelled sample ideas. This demo does not call a paid agent."
                          : "This request uses your active workflow and validated AI binding. Submitting explicitly queues an AI request within your configured budget; provider and model follow workspace settings.",
                        mode === "demo"
                          ? "Preview sample ideas"
                          : "Generate ideas",
                      )
                    }
                  >
                    <WandSparkles size={17} /> Generate with agent
                  </button>
                  <button
                    disabled={readOnly}
                    className="s-btn"
                    aria-label="Add idea"
                    title="Add manually"
                    onClick={() =>
                      openForm(
                        "Capture a new idea",
                        [
                          { ...field("title", "Idea title"), required: true },
                          {
                            name: "channel",
                            label: "Channel",
                            options: CHANNELS,
                            value:
                              channel === "All channels" ? "LinkedIn" : channel,
                          },
                          field("brief", "What is the angle?", "", "textarea"),
                        ],
                        (d) => ({
                          type: "idea.create",
                          title: val(d, "title"),
                          brief: val(d, "brief"),
                          channel: val(d, "channel"),
                        }),
                        undefined,
                        "Add idea",
                      )
                    }
                  >
                    <Plus size={16} /> Add manually
                  </button>
                </>
              ) : page === "People" ? (
                <button
                  disabled={!admin}
                  className="s-btn s-primary"
                  onClick={addMember}
                >
                  <Plus size={16} /> Add member
                </button>
              ) : (
                ["Home", "Create", "Library"].includes(page) && (
                  <button
                    disabled={readOnly}
                    className="s-btn s-primary"
                    onClick={() => newContent()}
                  >
                    <Plus size={16} /> Create content
                  </button>
                )
              )}
            </div>
          </div>
          {[
            "Home",
            "Ideas",
            "Calendar",
            "Create",
            "Reviews",
            "Library",
          ].includes(page) && (
            <div className="s-channel-tabs" aria-label="Filter by channel">
              <button
                className={channel === "All channels" ? "s-selected" : ""}
                aria-pressed={channel === "All channels"}
                onClick={() => setChannel("All channels")}
              >
                <Grid2X2 size={15} />
                All channels
              </button>
              {CHANNELS.map((c) => (
                <button
                  key={c}
                  className={channel === c ? "s-selected" : ""}
                  aria-pressed={channel === c}
                  onClick={() => setChannel(c)}
                >
                  <ChannelIcon channel={c} small />
                  {c}
                </button>
              ))}
            </div>
          )}
          {page === "Home" && layout === "board" && (
            <ProductionBoard
              state={state}
              contents={filtered}
              ideas={state.ideas.filter(matches)}
              openContent={openContent}
              openIdeas={() => move("Ideas")}
            />
          )}
          {page === "Home" && layout === "command" && (
            <>
              <div className="s-stats">
                <Stat
                  label="Ideas in the pipeline"
                  number={pendingIdeas.length}
                  icon={<Lightbulb size={19} />}
                  note="Good things start here"
                  onClick={() => move("Ideas")}
                />
                <Stat
                  label="Work in progress"
                  number={
                    liveContents.filter((c) => c.state === "draft").length
                  }
                  icon={<FileText size={19} />}
                  note="Stories taking shape"
                  onClick={() => move("Create")}
                />
                <Stat
                  label="Ready for review"
                  number={reviews.length}
                  icon={<ShieldCheck size={19} />}
                  note="A fresh pair of eyes"
                  onClick={() => move("Reviews")}
                />
                <Stat
                  label="Upcoming publications"
                  number={upcoming.length}
                  icon={<CalendarDays size={19} />}
                  note="Your next moments"
                  onClick={() => move("Calendar")}
                />
              </div>
              <div className="s-dashboard-grid">
                <section className="s-panel s-channel-panel">
                  <div className="s-section-heading">
                    <div>
                      <h2>Your channels</h2>
                      <p>One brand. Nine ways to connect.</p>
                    </div>
                    <button
                      className="s-text-button"
                      onClick={() => move("Workflow settings")}
                    >
                      Manage workflows <ArrowRight size={14} />
                    </button>
                  </div>
                  <div className="s-channel-grid">
                    {CHANNELS.filter(
                      (c) => channel === "All channels" || c === channel,
                    ).map((c) => {
                      const active = state.workflows.find(
                        (w) => w.channel === c && w.status === "active",
                      );
                      return (
                        <button
                          key={c}
                          className="s-channel-card"
                          onClick={() => {
                            setChannel(c);
                            move("Create");
                          }}
                        >
                          <div className="s-channel-card-top">
                            <ChannelIcon channel={c} />
                            <ArrowRight size={15} />
                          </div>
                          <h3>{c}</h3>
                          <p>{channelDescriptions[c]}</p>
                          <div>
                            <span>
                              {
                                liveContents.filter((x) => x.channel === c)
                                  .length
                              }{" "}
                              drafts & stories
                            </span>
                            <span
                              className={active ? "s-live-dot" : "s-setup-dot"}
                            >
                              {active ? "Workflow active" : "Set up workflow"}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
                <div className="s-dashboard-side">

              <section className="s-panel">
                    <div className="s-section-heading">
                      <h2>Up next</h2>
                      <button
                        className="s-icon-button"
                        aria-label="Open calendar"
                        onClick={() => move("Calendar")}
                      >
                        <ArrowRight size={16} />
                      </button>
                    </div>
                    {upcoming.slice(0, 3).map((s) => {
                      const c = state.contents.find(
                        (c) => c.id === s.contentId,
                      );
                      return (
                        c && (
                          <button
                            className="s-upcoming"
                            key={s.id}
                            onClick={() => move("Calendar")}
                          >
                            <span className="s-date-tile">
                              <small>
                                {new Date(s.at).toLocaleDateString("en-US", {
                                  month: "short",
                                })}
                              </small>
                              <strong>{new Date(s.at).getDate()}</strong>
                            </span>
                            <span>
                              <strong>{c.title}</strong>
                              <small>
                                {c.channel} ·{" "}
                                {new Date(s.at).toLocaleTimeString("en-US", {
                                  hour: "numeric",
                                  minute: "2-digit",
                                  timeZone: state.settings.timezone,
                                })}
                              </small>
                              <Badge>Human publication</Badge>
                            </span>
                          </button>
                        )
                      );
                    })}
                    {!upcoming.length && (
                      <div className="s-quiet-empty">
                        <CalendarDays size={24} />
                        <p>Your next stories start here.</p>
                        <small>
                          Approved content can be added to the calendar.
                        </small>
                      </div>
                    )}
                    <button
                      className="s-panel-link"
                      onClick={() => move("Calendar")}
                    >
                      View calendar <ArrowRight size={14} />
                    </button>
                  </section>
                  <section className="s-brand-card">
                    <span className="s-eyebrow">A LITTLE CREATIVE CLARITY</span>
                    <Sparkles size={25} />
                    <h2>
                      Good content starts
                      <br />
                      with a clear direction.
                    </h2>
                    <p>
                      Set your voice, references and review checks once. Create
                      with confidence, every time.
                    </p>
                    <button onClick={() => move("Workflow settings")}>
                      Shape your workflow <ArrowRight size={15} />
                    </button>
                    <div className="s-brand-orbit" />
                  </section>
                </div>
              </div>
              <section className="s-panel s-recent-panel">
                <div className="s-section-heading">
                  <div>
                    <h2>Keep the momentum going</h2>
                    <p>Pick up where you left off.</p>
                  </div>
                  <button
                    className="s-text-button"
                    onClick={() => move("Library")}
                  >
                    View all content <ArrowRight size={14} />
                  </button>
                </div>
                {contentRows(filtered.slice(0, 4))}
              </section>
            </>
          )}
          {page === "Ideas" && (
            <>
              <IdeaGenerationStatus
                state={state}
                actor={actor}
                channel={channel}
                live={mode === "live"}
                refresh={() => refresh(true)}
                send={send}
              />
              <div className="s-toolbar">
                <div className="s-view-tabs">
                  {[
                    "All ideas",
                    "Pending",
                    "Approved",
                    "Rejected",
                    "Recurring",
                  ].map((v) => (
                    <button
                      className={ideaTab === v ? "s-selected" : ""}
                      aria-pressed={ideaTab === v}
                      key={v}
                      onClick={() => setIdeaTab(v)}
                    >
                      {v}
                      {v === "Pending" && <span>{pendingIdeas.length}</span>}
                    </button>
                  ))}
                </div>
                <SearchBox value={search} set={setSearch} />
              </div>
              {ideaTab === "Recurring" ? (
                <section className="s-panel">
                  <div className="s-section-heading">
                    <div>
                      <h2>A rhythm for your ideas</h2>
                      <p>
                        Recurring requests are queued for review; publication
                        stays manual.
                      </p>
                    </div>
                    <button
                      className="s-btn"
                      disabled={readOnly}
                      onClick={() =>
                        openForm(
                          "Create recurring idea request",
                          [
                            {
                              ...field("title", "Request title"),
                              required: true,
                            },
                            {
                              name: "channel",
                              label: "Channel",
                              options: CHANNELS,
                            },
                            field(
                              "quantity",
                              "Ideas per occurrence",
                              3,
                              "number",
                            ),
                            {
                              name: "nextAt",
                              label: "Next occurrence",
                              type: "datetime-local",
                              required: true,
                            },
                            {
                              name: "research",
                              label: "Research required",
                              options: ["No", "Yes"],
                            },
                          ],
                          (d) => ({
                            type: "recurrence.save",
                            title: val(d, "title"),
                            channel: val(d, "channel"),
                            quantity: Number(val(d, "quantity")),
                            nextAt: workspaceTime(
                              val(d, "nextAt"),
                              state.settings.timezone,
                            ),
                            research: val(d, "research") === "Yes",
                          }),
                        )
                      }
                    >
                      <Plus size={15} /> New recurrence
                    </button>
                  </div>
                  {state.recurrences.map((r) => (
                    <div className="s-list-row" key={r.id}>
                      <div>
                        <strong>{r.title}</strong>
                        <p>
                          {r.channel} · {r.quantity} ideas · {stamp(r.nextAt)}
                        </p>
                      </div>
                      <Badge>{r.state}</Badge>
                      <button
                        className="s-btn"
                        disabled={!admin || r.lastOccurrence === r.nextAt}
                        onClick={() =>
                          void execute({
                            type: "recurrence.research",
                            id: r.id,
                            occurrence: r.nextAt,
                            allowed: !(
                              r.researchChoice?.occurrence === r.nextAt &&
                              r.researchChoice.allowed
                            ),
                          })
                        }
                      >
                        {r.researchChoice?.occurrence === r.nextAt &&
                        r.researchChoice.allowed
                          ? "Research allowed"
                          : "Research off / unanswered"}
                      </button>
                      <button
                        className="s-btn"
                        disabled={!admin}
                        onClick={() =>
                          void execute({ type: "recurrence.pause", id: r.id })
                        }
                      >
                        {r.state === "paused" ? "Resume" : "Pause"}
                      </button>
                    </div>
                  ))}
                </section>
              ) : (
                <IdeasBrowser
                  ideas={state.ideas.filter((idea) => matches(idea) && (ideaTab === "All ideas" || idea.state.toLowerCase() === ideaTab.toLowerCase()))}
                  allIdeas={state.ideas}
                  contents={state.contents}
                  schedules={state.schedules}
                  actorEmail={actor.email}
                  busy={busy}
                  error={localError}
                  onOpen={() => setLocalError("")}
                  canReview={(idea) => allowed("idea.review", { channel: idea.channel })}
                  canUse={(idea, account) => allowed("content.create", { channel: idea.channel, account }) && (idea.state !== "pending" || allowed("idea.review", { channel: idea.channel }))}
                  canReuse={(idea) => allowed("idea.edit", { channel: idea.channel })}
                  onUse={useIdea}
                  onApprove={(idea) => execute({ type: "idea.review", id: idea.id, decision: "approved" })}
                  onReject={(idea) => reject("idea.review", idea.id)}
                  onReuse={(idea, mode) => execute({ type: "idea.reuse", id: idea.id, mode })}
                />
              )}
            </>
          )}
          {page === "Calendar" && (
            <>
              <div className="s-calendar-toolbar">
                <div className="s-inline">
                  <h2>
                    {month.toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                  </h2>
                  <button
                    className="s-icon-button"
                    aria-label="Previous month"
                    onClick={() =>
                      setMonth(
                        new Date(month.getFullYear(), month.getMonth() - 1, 1),
                      )
                    }
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    className="s-icon-button"
                    aria-label="Next month"
                    onClick={() =>
                      setMonth(
                        new Date(month.getFullYear(), month.getMonth() + 1, 1),
                      )
                    }
                  >
                    <ChevronRight size={18} />
                  </button>
                  <button
                    className="s-btn s-small-btn"
                    onClick={() =>
                      setMonth(
                        new Date(
                          new Date().getFullYear(),
                          new Date().getMonth(),
                          1,
                        ),
                      )
                    }
                  >
                    Today
                  </button>
                </div>
                <div className="s-view-tabs">
                  {["Month", "Agenda"].map((v) => (
                    <button
                      key={v}
                      className={v === calendarView ? "s-selected" : ""}
                      aria-pressed={v === calendarView}
                      onClick={() => setCalendarView(v)}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <div className="s-info-strip">
                <ShieldCheck size={16} />
                <span>
                  Planned content is published by a person. Confirm the final
                  public URL after publishing.
                </span>
                <span className="s-timezone">{state.settings.timezone}</span>
              </div>
              {readyToPlan.length > 0 && (
                <section className="s-panel s-calendar-ready" aria-label="Ready to plan">
                  <h2>Ready to plan</h2>
                  <p>Choose when and where to publish each approved package.</p>
                  {readyToPlan.map((p) => (
                    <div className="s-calendar-ready-item" key={p.id}>
                      <div><strong>{p.title}</strong><p>{p.channel} · {p.account || "Account not specified"} · Approved revision {p.revision}</p></div>
                      <button className="s-btn" onClick={() => scheduleForm(p.contentId, p.id)}>Choose date and time</button>
                    </div>
                  ))}
                </section>
              )}
              <div className="s-calendar-quick-actions">
                <button
                  className="s-btn"
                  disabled={readOnly}
                  onClick={() => taskForm("draft")}
                >
                  Plan drafting
                </button>
                <button
                  className="s-btn"
                  disabled={readOnly}
                  onClick={() => taskForm("editing")}
                >
                  Plan editing
                </button>
                <button
                  className="s-btn"
                  disabled={readOnly}
                  onClick={() => taskForm("workflow")}
                >
                  Plan workflow
                </button>
                <button
                  className="s-btn"
                  disabled={readOnly}
                  onClick={() => scheduleForm()}
                >
                  Plan publication
                </button>
              </div>
              {calendarView === "Month" ? (
                <section className="s-calendar">
                  <div className="s-weekdays">
                    {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map(
                      (d) => (
                        <span key={d}>{d}</span>
                      ),
                    )}
                  </div>
                  <div className="s-calendar-grid">
                    {Array.from({ length: 42 }, (_, i) => {
                      const d = new Date(
                        month.getFullYear(),
                        month.getMonth(),
                        i - month.getDay() + 1,
                      );
                      const today =
                        d.toDateString() === new Date().toDateString();
                      return (
                        <div
                          className={`s-calendar-day ${d.getMonth() !== month.getMonth() ? "s-other-month" : ""}`}
                          key={i}
                        >
                          <button
                            className={`s-calendar-date ${today ? "s-today" : ""}`}
                            aria-label={`Plan work on ${dateKey(d.toISOString(), "UTC")}`}
                            disabled={readOnly}
                            onClick={() =>
                              calendarChoice(
                                `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
                              )
                            }
                          >
                            {d.getDate()} <Plus size={12} />
                          </button>
                          {(state.planningTasks || [])
                            .filter(
                              (t) =>
                                t.state !== "cancelled" &&
                                dateKey(t.at, state.settings.timezone) ===
                                  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` &&
                                (channel === "All channels" ||
                                  t.channel === channel),
                            )
                            .map((t) => (
                              <button
                                className="s-calendar-event s-planning-event"
                                key={t.id}
                                onClick={() => openPlanningTask(t)}
                              >
                                <span>
                                  {t.kind} · {t.state}
                                </span>
                                <strong>{t.title}</strong>
                              </button>
                            ))}
                          {state.schedules
                            .filter(
                              (s) =>
                                dateKey(s.at, state.settings.timezone) ===
                                `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
                            )
                            .map((s) => {
                              const c = state.contents.find(
                                (c) => c.id === s.contentId,
                              );
                              const p = state.packages.find((p) => p.id === s.packageId);
                              if (!c || !matches(p || c)) return null;
                              return (
                                <button
                                  className={`s-calendar-event s-event-${s.state}`}
                                  key={s.id}
                                  onClick={() => {
                                    setCalendarPreview(s.id);
                                  }}
                                >
                                  <span>
                                    {new Date(s.at).toLocaleTimeString(
                                      "en-US",
                                      {
                                        hour: "numeric",
                                        minute: "2-digit",
                                        timeZone: state.settings.timezone,
                                      },
                                    )}{" "}
                                    · {p?.channel || c.channel}
                                  </span>
                                  <strong>{p?.title || c.title}</strong>
                                  <small>
                                    {s.state === "published"
                                      ? "Published · human confirmed"
                                      : s.state === "blocked"
                                        ? "Blocked"
                                        : "Ready for manual publication"}
                                  </small>
                                </button>
                              );
                            })}
                        </div>
                      );
                    })}
                  </div>
                </section>
              ) : (
                <section className="s-panel">
                  {state.schedules
                    .filter((s) => {
                      const c = state.contents.find(
                        (c) => c.id === s.contentId,
                      );
                      const p = state.packages.find((p) => p.id === s.packageId);
                      return c && matches(p || c);
                    })
                    .sort((a, b) => a.at.localeCompare(b.at))
                    .map((s) => {
                      const c = state.contents.find(
                        (c) => c.id === s.contentId,
                      )!;
                      const p = state.packages.find(
                        (p) => p.id === s.packageId,
                      );
                      const replacements = state.packages.filter(
                        (p) => p.contentId === c.id,
                      );
                      return (
                        <div className="s-schedule-row" key={s.id}>
                          <span className="s-date-tile">
                            <small>
                              {new Date(s.at).toLocaleDateString("en-US", {
                                month: "short",
                              })}
                            </small>
                            <strong>{new Date(s.at).getDate()}</strong>
                          </span>
                          <div className="s-schedule-main">
                            <button
                              className="s-link-button"
                              onClick={() => setCalendarPreview(s.id)}
                            >
                              {p?.title || c.title}
                            </button>
                            <p>
                              {p?.channel || c.channel} ·{" "}
                              {new Date(s.at).toLocaleString("en-US", {
                                timeZone: state.settings.timezone,
                              })}{" "}
                              · Approved revision {p?.revision || "missing"}
                            </p>
                            <Badge
                              tone={
                                s.state === "published"
                                  ? "green"
                                  : s.state === "blocked"
                                    ? "red"
                                    : "amber"
                              }
                            >
                              {s.state === "published"
                                ? "Published · human confirmed"
                                : s.state}
                            </Badge>
                            {s.publicationUrl && (
                              <a
                                href={s.publicationUrl}
                                target="_blank"
                                rel="noreferrer"
                              >
                                View publication ↗
                              </a>
                            )}
                          </div>
                          <div className="s-actions">
                            {s.state !== "published" && (
                              <>
                                <button
                                  disabled={readOnly}
                                  className="s-btn s-small-btn"
                                  onClick={() =>
                                    openForm(
                                      "Move publication",
                                      [
                                        {
                                          name: "at",
                                          label: "New publication time",
                                          type: "datetime-local",
                                          required: true,
                                        },
                                      ],
                                      (d) => ({
                                        type: "schedule.move",
                                        id: s.id,
                                        at: workspaceTime(
                                          val(d, "at"),
                                          state.settings.timezone,
                                        ),
                                      }),
                                    )
                                  }
                                >
                                  Move
                                </button>
                                <button
                                  disabled={readOnly}
                                  className="s-btn s-small-btn"
                                  onClick={() =>
                                    setDialog({
                                      title: "Replace approved package",
                                      description:
                                        "This changes the exact approved revision scheduled for manual publication.",
                                      fields: [
                                        {
                                          name: "packageId",
                                          label: "Approved package",
                                          options: replacements.map(
                                            (p) => p.id,
                                          ),
                                          optionLabels: Object.fromEntries(
                                            replacements.map((p) => [
                                              p.id,
                                              `${p.title} · Revision ${p.revision}`,
                                            ]),
                                          ),
                                          hint: replacements
                                            .map(
                                              (p) =>
                                                `${p.id}: v${p.revision} · ${p.title}`,
                                            )
                                            .join("\n"),
                                        },
                                      ],
                                      submit: "Replace package",
                                      onSubmit: async (d) => {
                                        if (
                                          await execute({
                                            type: "schedule.replace",
                                            id: s.id,
                                            packageId: val(d, "packageId"),
                                            expectedPackageId: s.packageId,
                                          })
                                        )
                                          setDialog(null);
                                      },
                                    })
                                  }
                                >
                                  Replace
                                </button>
                                <button
                                  disabled={readOnly}
                                  className="s-btn s-small-btn"
                                  onClick={() =>
                                    void execute({
                                      type: "schedule.block",
                                      id: s.id,
                                    })
                                  }
                                >
                                  Block
                                </button>
                                <button
                                  disabled={readOnly || s.state === "blocked"}
                                  className="s-btn s-primary s-small-btn"
                                  onClick={() =>
                                    openForm(
                                      "Confirm manual publication",
                                      [
                                        {
                                          name: "url",
                                          label: "Public publication URL",
                                          type: "url",
                                          required: true,
                                        },
                                      ],
                                      (d) => ({
                                        type: "schedule.confirm",
                                        id: s.id,
                                        url: val(d, "url"),
                                        expectedPackageId: s.packageId,
                                      }),
                                      `Confirm only after you have manually published revision ${p?.revision || "missing"} of “${c.title}”. The selected approved package must stay unchanged.`,
                                      "Confirm published",
                                    )
                                  }
                                >
                                  Confirm published
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  {!state.schedules.length && (
                    <Empty
                      icon={CalendarDays}
                      title="Your calendar is a clean slate"
                    >
                      Approve a draft, then choose when a person will publish
                      it.
                    </Empty>
                  )}
                </section>
              )}
              {previewSchedule && <CalendarPackagePreview
                key={previewSchedule.id}
                schedule={previewSchedule}
                approved={state.packages.find((p) => p.id === previewSchedule.packageId)}
                timezone={state.settings.timezone}
                AssetMedia={AssetMedia}
                onClose={() => setCalendarPreview(null)}
                onEdit={(id) => { setCalendarPreview(null); openDraft(id); }}
              />}
            </>
          )}
          {page === "Calendar" && (
            <section className="s-panel s-planning-list">
              <h2>Draft, editing and workflow tasks</h2>
              {!(state.planningTasks || []).filter(
                (t) => t.state !== "cancelled",
              ).length && (
                <p>
                  No work tasks yet. Use Add to calendar or select a date to
                  plan work.
                </p>
              )}
              {(state.planningTasks || [])
                .filter(
                  (t) =>
                    t.state !== "cancelled" &&
                    (channel === "All channels" || t.channel === channel),
                )
                .sort((a, b) => a.at.localeCompare(b.at))
                .map((t) => (
                  <div className="s-list-row" key={t.id}>
                    <div>
                      <button
                        className="s-link-button"
                        onClick={() => openPlanningTask(t)}
                      >
                        {t.title}
                      </button>
                      <p>
                        {t.kind} · {t.channel} ·{" "}
                        {new Date(t.at).toLocaleString("en-US", {
                          timeZone: state.settings.timezone,
                        })}{" "}
                        · {t.state}
                      </p>
                      {t.notes && <p>{t.notes}</p>}
                    </div>
                    <div className="s-actions">
                      <button
                        className="s-btn"
                        onClick={() => openPlanningTask(t)}
                      >
                        Open {t.kind === "workflow" ? "workflow" : "draft"}
                      </button>
                      {t.state === "planned" && !readOnly && (
                        <>
                          <button
                            className="s-btn"
                            onClick={() =>
                              openForm(
                                "Move planning task",
                                [
                                  {
                                    name: "at",
                                    label: "New task time",
                                    type: "datetime-local",
                                    required: true,
                                  },
                                ],
                                (d) => ({
                                  type: "task.update",
                                  id: t.id,
                                  at: workspaceTime(
                                    val(d, "at"),
                                    state.settings.timezone,
                                  ),
                                }),
                              )
                            }
                          >
                            Move task
                          </button>
                          <button
                            className="s-btn"
                            onClick={() =>
                              void execute({
                                type: "task.update",
                                id: t.id,
                                state: "done",
                              })
                            }
                          >
                            Mark done
                          </button>
                          <button
                            className="s-btn"
                            onClick={() =>
                              void execute({
                                type: "task.update",
                                id: t.id,
                                state: "cancelled",
                              })
                            }
                          >
                            Cancel task
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
            </section>
          )}
          {page === "Training & QA" && (
            <section className="s-panel s-account-panel">
              <h2>Training, testing and backlog</h2>
              <p>
                Start with module 00, then use the document for the section you
                are testing. Each module has steps, a practice exercise and
                known limitations.
              </p>
              <div className="s-actions">
                <a
                  className="s-btn s-primary"
                  href="/training/RyzaLab-Training-and-QA.zip"
                  download
                >
                  Download all training and QA
                </a>
                <a
                  className="s-btn"
                  href="/training/RyzaLab-QA-and-Backlog.xlsx"
                  download
                >
                  Download QA workbook
                </a>
                <a
                  className="s-btn"
                  href="/training/RyzaLab-Backlog.xlsx"
                  download
                >
                  Download backlog
                </a>
              </div>
              <p>
                The QA workbook has 160 cases, a defect log and blank manual
                results. Live integration cases require a configured test
                workspace.
              </p>
              <h2>Section training documents</h2>
              <ul className="s-training-links">
                {[
                  ["00-Start-Here", "Start here — complete user journey"],
                  ["01-Home-and-Navigation", "Home and navigation"],
                  ["02-Account-and-Appearance", "Account and appearance"],
                  ["03-Ideas", "Ideas"],
                  ["04-Create", "Create — writing, slides and scenes"],
                  ["05-Reviews-and-Approvals", "Reviews and approvals"],
                  ["06-Calendar", "Calendar"],
                  ["07-Workflow-Settings", "Workflow settings"],
                  ["08-Library-and-Exports", "Library and exports"],
                  ["09-People-and-Permissions", "People and permissions"],
                  ["10-AI-and-Budgets", "AI and budgets"],
                  ["11-Analytics", "Analytics"],
                  ["12-Notifications", "Notifications"],
                  ["13-Operations", "Operations and incidents"],
                ].map(([file, label]) => (
                  <li key={file}>
                    <a href={`/training/${file}.docx`} download>
                      {label} (Word)
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {page === "Operations" && allowed("settings.manage") && (
            <StudioOperations
              state={state}
              live={mode === "live"}
              openJobs={() => move("AI & budgets")}
            />
          )}
          {page === "Analytics" && (
            <StudioAnalytics state={state} channel={channel} />
          )}
          {page === "Account & appearance" && (
            <section className="s-panel s-account-panel">
              <h2>
                <UserRound size={22} /> Your account
              </h2>
              <dl>
                <dt>Email</dt>
                <dd>{actor.email}</dd>
                <dt>Assigned profiles</dt>
                <dd>{roles.join(", ") || "Member"}</dd>
                <dt>Workspace mode</dt>
                <dd>
                  {mode === "demo"
                    ? "Preview — local to this browser"
                    : "Live workspace"}
                </dd>
              </dl>
              <h2>Appearance and layout</h2>
              <p>
                Choose your home layout and color theme. Preferences are saved
                for this account on this device.
              </p>
              <fieldset>
                <legend>Home layout</legend>
                <div className="s-actions">
                  <button
                    className="s-btn"
                    aria-pressed={layout === "command"}
                    onClick={() => setLayout("command")}
                  >
                    Command Center
                  </button>
                  <button
                    className="s-btn"
                    aria-pressed={layout === "board"}
                    onClick={() => setLayout("board")}
                  >
                    Production Board
                  </button>
                  <button
                    className="s-btn s-primary"
                    onClick={() => move("Home")}
                  >
                    Open selected layout
                  </button>
                </div>
              </fieldset>
              <fieldset>
                <legend>Color theme</legend>
                <div className="s-actions">
                  <button
                    className="s-btn"
                    aria-pressed={theme === "midnight"}
                    onClick={() => setTheme("midnight")}
                  >
                    Midnight Teal
                  </button>
                  <button
                    className="s-btn"
                    aria-pressed={theme === "daylight"}
                    onClick={() => setTheme("daylight")}
                  >
                    Daylight Teal
                  </button>
                </div>
              </fieldset>
              <fieldset>
                <legend>Navigation</legend>
                <label>
                  <input
                    type="checkbox"
                    checked={sidebarPinned}
                    onChange={(e) => setSidebarPinned(e.target.checked)}
                  />{" "}
                  Pin sidebar
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={sidebarExpanded}
                    onChange={(e) => setSidebarExpanded(e.target.checked)}
                  />{" "}
                  Expand sidebar
                </label>
              </fieldset>
              {mode === "demo" ? (
                <p>
                  You are using the preview identity. No live account is signed
                  in. <a href="/studio">Open live sign-in</a>
                </p>
              ) : (
                <button className="s-btn" onClick={() => void signOut()}>
                  <LogOut size={16} /> Sign out
                </button>
              )}
            </section>
          )}
          {page === "Create" &&
            (activeContent ? (
              <Editor
                key={activeContent.id}
                content={activeContent}
                actor={actor}
                send={send}
                state={state}
                readOnly={readOnly}
                busy={busy}
                mode={mode as "demo" | "live"}
                run={execute}
                back={() => setSelected(null)}
                form={openForm}
                onError={setLocalError}
                refresh={() => refresh(true)}
                queue={() => setQueueTarget(activeContent)}
              />
            ) : (
              <>
                <div className="s-toolbar">
                  <div className="s-inline">
                    <h2>Your workbench</h2>
                    <Badge>{filtered.length} stories</Badge>
                  </div>
                  <SearchBox value={search} set={setSearch} />
                </div>
                {contentRows(filtered)}
              </>
            ))}
          {page === "Reviews" && (
            <>
              <div className="s-info-strip">
                <ShieldCheck size={17} />
                <span>
                  Approval captures an immutable package of this revision. Later
                  edits need a new approval.
                </span>
              </div>
              <div className="s-review-grid">
                {reviews.filter(matches).map((c) => (
                  <ReviewCard
                    key={c.id}
                    title={c.title}
                    channel={c.channel}
                    revision={c.revision}
                  >
                    <div className="s-inline s-between">
                      <span className="s-inline">
                        <ChannelIcon channel={c.channel} small />
                        {c.channel}
                      </span>
                      <Badge tone="amber">Review requested</Badge>
                    </div>
                    <h2>{c.title}</h2>
                    <p className="s-review-copy">
                      {c.text ||
                        "No written copy in this draft. Open the media project to review its assets."}
                    </p>
                    <div className="s-review-meta">
                      Revision {c.revision} · {c.format} ·{" "}
                      {c.media.slides.length} slides · {c.media.scenes.length}{" "}
                      scenes
                      <br />
                      Active workflow v
                      {state.workflows.find(
                        (w) => w.channel === c.channel && w.status === "active",
                      )?.version || "not configured"}{" "}
                      · Protected rules {state.settings.protectedVersion}
                    </div>
                    {state.settings.reviewPolicy ? (
                      <SoloReview key={`${c.id}:${c.revision}`} content={c} state={state} actor={actor} send={send} refresh={() => refresh(true)} demo={mode === "demo"}
                        renderAsset={(source, kind) => <AssetMedia source={source} kind={kind} />}
                        openDraft={() => openContent(c)}
                        requestChanges={() => reject("package.reject", c.id)}
                        recordPriceException={() => openForm(
                          "Scoped founder price exception",
                          [{ name: "wording", label: "Exact content line", required: true, type: "textarea" },
                           { name: "reason", label: "Reason and evidence", required: true }],
                          (d) => ({ type: "exception.record", contentId: c.id, expectedRevision: c.revision, wording: val(d, "wording"), reason: val(d, "reason") }),
                          "This applies only to the quoted wording in this exact revision. It cannot waive misinformation or misrepresentation.",
                        )} />
                    ) : <>
                    <StageTracker
                      content={c}
                      state={state}
                      actor={actor}
                      send={send}
                      onError={setLocalError}
                    />
                    <details className="s-review-policy">
                      <summary>Review current workflow & brand rules</summary>
                      <h4>Channel workflow</h4>
                      <p>
                        {state.workflows.find(
                          (w) =>
                            w.channel === c.channel && w.status === "active",
                        )?.instructions ||
                          "Activate a channel workflow before approving."}
                      </p>
                      <h4>Review checks</h4>
                      <p>
                        {state.workflows.find(
                          (w) =>
                            w.channel === c.channel && w.status === "active",
                        )?.checks || "No review checks configured."}
                      </p>
                      <h4>Protected brand rules</h4>
                      <p>{state.settings.protectedRules}</p>
                    </details>
                    {[
                      c.media.imageUrl,
                      ...c.media.slides.map((s) => s.image),
                      ...c.media.scenes.flatMap((s) => [
                        s.sourceUrl,
                        s.audioUrl,
                      ]),
                    ]
                      .filter(Boolean)
                      .some(
                        (url) =>
                          !url!.startsWith("/api/studio/assets") &&
                          !(mode === "demo" && url!.startsWith("data:image/")),
                      ) && (
                      <div className="s-info-strip">
                        Approval requires private uploaded media. External
                        source URLs stay editable references until their files
                        are uploaded.
                      </div>
                    )}
                    <button
                      className="s-text-button"
                      onClick={() => openContent(c)}
                    >
                      Open complete draft <ArrowRight size={14} />
                    </button>
                    {allowed("policy.manage") &&
                      /\bfree\b|\$\s*\d/i.test(c.text + " " + c.metadata) && (
                        <button
                          className="s-text-button"
                          onClick={() =>
                            openForm(
                              "Scoped founder price exception",
                              [
                                {
                                  name: "wording",
                                  label: "Exact content line",
                                  required: true,
                                  type: "textarea",
                                },
                                {
                                  name: "reason",
                                  label: "Reason and evidence",
                                  required: true,
                                },
                              ],
                              (d) => ({
                                type: "exception.record",
                                contentId: c.id,
                                expectedRevision: c.revision,
                                wording: val(d, "wording"),
                                reason: val(d, "reason"),
                              }),
                              "This applies only to the quoted wording in this exact revision. It cannot waive misinformation or misrepresentation.",
                            )
                          }
                        >
                          Record founder CTA exception
                        </button>
                      )}
                    {approvalErrors[`${c.id}:${c.revision}`] && (
                      <div
                        className="s-alert s-error"
                        role="alert"
                        aria-label="Approval error"
                      >
                        {approvalErrors[`${c.id}:${c.revision}`]}
                      </div>
                    )}
                    <div className="s-card-actions">
                      <button
                        disabled={
                          busy ||
                          !allowed("package.approve", {
                            channel: c.channel,
                            contentId: c.id,
                            account: c.account,
                            assignedTo: c.assignedTo,
                          })
                        }
                        className="s-btn s-primary"
                        onClick={() =>
                          void execute(
                            {
                              type: "package.approve",
                              contentId: c.id,
                              expectedRevision: c.revision,
                              expectedWorkflowId: state.workflows.find(
                                (w) =>
                                  w.channel === c.channel &&
                                  w.status === "active",
                              )?.id,
                              expectedRuleVersion:
                                state.settings.protectedVersion,
                            },
                            "Revision approved. Ready to schedule for manual publication.",
                          )
                        }
                      >
                        <Check size={15} />{" "}
                        {busy && approvalTarget === `${c.id}:${c.revision}`
                          ? "Approving…"
                          : "Approve revision"}
                      </button>
                      <button
                        disabled={
                          !allowed("package.approve", {
                            channel: c.channel,
                            contentId: c.id,
                            account: c.account,
                            assignedTo: c.assignedTo,
                          })
                        }
                        className="s-btn"
                        onClick={() => reject("package.reject", c.id)}
                      >
                        Request changes
                      </button>
                    </div>
                    </>}
                  </ReviewCard>
                ))}
              </div>
              {!reviews.filter(matches).length && (
                <Empty icon={ShieldCheck} title="All caught up">
                  When a creator submits a draft, it will be ready for a
                  thoughtful review here.
                </Empty>
              )}
              <section className="s-panel s-recent-panel">
                <div className="s-section-heading">
                  <h2>Approved packages</h2>
                  <Badge tone="green">{activePackages.length} approved</Badge>
                </div>
                {activePackages.filter(matches).map((p) => (
                  <div className="s-list-row" key={p.id}>
                    <div>
                      <strong>{p.title}</strong>
                      <p>
                        {p.channel} · Revision {p.revision} · Approved{" "}
                        {stamp(p.approvedAt)}
                      </p>
                    </div>
                    <span className="s-muted">{p.approvedBy}</span>
                    <button
                      disabled={readOnly}
                      className="s-btn"
                      onClick={() => scheduleForm(p.contentId)}
                    >
                      <CalendarDays size={14} /> Plan publication
                    </button>
                    <button
                      className="s-icon-button"
                      aria-label={`Export ${p.title}`}
                      onClick={() =>
                        void exportPostPackage(p).catch((e) =>
                          setLocalError(String(e)),
                        )
                      }
                    >
                      <ArrowDownToLine size={16} />
                    </button>
                  </div>
                ))}
              </section>
            </>
          )}
          {page === "Library" && (
            <>
              <div className="s-actions s-calendar-quick-actions">
                <button
                  className="s-btn"
                  disabled={busy}
                  onClick={() =>
                    setDialog({
                      title: "Export campaign and inventory",
                      description:
                        "Only records you can read and export are included. Approved packages preserve exact versions/assets; publication-task dependencies are included even when all-versions is off. Working copies are optional and explicitly unapproved. Large exports must be split.",
                      submit: "Download campaign ZIP",
                      fields: [
                        {
                          name: "channel",
                          label: "Export channel",
                          options: ["All channels", ...CHANNELS],
                          value: channel,
                        },
                        field(
                          "collection",
                          "Campaign / collection (blank for all)",
                        ),
                        {
                          name: "drafts",
                          label: "Include unapproved working copies",
                          type: "checkbox",
                        },
                        {
                          name: "versions",
                          label: "Include all approved versions",
                          type: "checkbox",
                        },
                      ],
                      onSubmit: async (data) => {
                        setBusy(true);
                        try {
                          await downloadCampaignArchive(state, actor, {
                            channel: val(data, "channel") as
                              Channel | "All channels",
                            collection: val(data, "collection") || undefined,
                            includeDrafts: data.get("drafts") === "on",
                            allVersions: data.get("versions") === "on",
                          });
                          setDialog(null);
                          setNotice("Campaign export downloaded");
                        } catch (e) {
                          setLocalError(
                            e instanceof Error ? e.message : "Export failed.",
                          );
                        } finally {
                          setBusy(false);
                        }
                      },
                    })
                  }
                >
                  <ArrowDownToLine size={16} /> Export campaign / inventory
                </button>
              </div>
              <div className="s-toolbar">
                <div className="s-view-tabs">
                  {[
                    "Content",
                    "References",
                    "Templates",
                    "History",
                    "Trash",
                  ].map((t) => (
                    <button
                      key={t}
                      className={libraryTab === t ? "s-selected" : ""}
                      aria-pressed={libraryTab === t}
                      onClick={() => setLibraryTab(t)}
                    >
                      {t === "History" && <History size={14} />}{" "}
                      {t === "Trash" && <Trash2 size={14} />} {t}
                    </button>
                  ))}
                </div>
                <SearchBox value={search} set={setSearch} />
              </div>
              {libraryTab === "Content" && (
                <section className="s-panel">{contentRows(filtered)}</section>
              )}
              {libraryTab === "Trash" && (
                <section className="s-panel">
                  <div className="s-section-heading">
                    <div>
                      <h2>A second chance for your content</h2>
                      <p>
                        Trashed items are retained for{" "}
                        {state.settings.trashDays} days. Restoring keeps the
                        revision history.
                      </p>
                    </div>
                  </div>
                  {state.contents
                    .filter((c) => c.deletedAt && matches(c))
                    .map((c) => (
                      <div className="s-list-row" key={c.id}>
                        <div>
                          <strong>{c.title}</strong>
                          <p>
                            {c.channel} · Trashed {stamp(c.deletedAt!)}
                          </p>
                        </div>
                        <button
                          disabled={readOnly}
                          className="s-btn"
                          onClick={() =>
                            void execute(
                              { type: "content.untrash", id: c.id },
                              "Content restored",
                            )
                          }
                        >
                          Restore content
                        </button>
                      </div>
                    ))}
                  {!state.contents.some((c) => c.deletedAt) && (
                    <Empty icon={Trash2} title="Nothing in the trash">
                      Your workspace is looking tidy.
                    </Empty>
                  )}
                </section>
              )}
              {libraryTab === "References" && (
                <section className="s-panel">
                  <div className="s-section-heading">
                    <div>
                      <h2>Your source of truth</h2>
                      <p>
                        Brand guidance, trusted sources and examples for channel
                        workflows.
                      </p>
                    </div>
                    <button
                      disabled={readOnly}
                      className="s-btn"
                      onClick={() =>
                        openForm(
                          "Add a reference",
                          [
                            {
                              ...field("title", "Reference title"),
                              required: true,
                            },
                            {
                              name: "channel",
                              label: "Shared or channel-specific",
                              options: ["Shared", ...CHANNELS],
                            },
                            {
                              name: "kind",
                              label: "Reference kind",
                              options: ["brand", "source", "example"],
                            },
                            {
                              ...field(
                                "content",
                                "Reference content",
                                "",
                                "textarea",
                              ),
                              required: true,
                            },
                          ],
                          (d) => ({
                            type: "reference.create",
                            title: val(d, "title"),
                            channel: val(d, "channel"),
                            kind: val(d, "kind"),
                            content: val(d, "content"),
                          }),
                        )
                      }
                    >
                      <Plus size={15} /> Add reference
                    </button>
                  </div>
                  {state.references
                    .filter(
                      (r) =>
                        (channel === "All channels" ||
                          r.channel === "Shared" ||
                          r.channel === channel) &&
                        (!search ||
                          r.title.toLowerCase().includes(search.toLowerCase())),
                    )
                    .map((r) => (
                      <details className="s-reference" key={r.id}>
                        <summary>
                          <BookOpen size={18} />
                          <strong>{r.title}</strong>
                          <Badge>{r.channel}</Badge>
                          <Badge>{r.kind}</Badge>
                          <ChevronDown size={15} />
                        </summary>
                        <p>{r.content}</p>
                      </details>
                    ))}
                </section>
              )}
              {libraryTab === "Templates" && (
                <section className="s-panel">
                  <div className="s-section-heading">
                    <div>
                      <h2>A head start, with your signature</h2>
                      <p>
                        Save slide projects as templates from the editor.
                        Templates need approval before reuse.
                      </p>
                    </div>
                  </div>
                  {state.templates.filter(matches).map((t) => (
                    <div className="s-list-row" key={t.id}>
                      <div>
                        <strong>{t.title}</strong>
                        <p>
                          {t.channel} · {t.slides.length} slides
                        </p>
                      </div>
                      <Badge tone={t.status === "approved" ? "green" : "amber"}>
                        {t.status}
                      </Badge>
                      {t.status === "pending" && (
                        <button
                          disabled={!founder}
                          className="s-btn"
                          onClick={() =>
                            void execute({ type: "template.approve", id: t.id })
                          }
                        >
                          Approve template
                        </button>
                      )}
                    </div>
                  ))}
                </section>
              )}
              {libraryTab === "History" && (
                <section className="s-panel">
                  <div className="s-section-heading">
                    <div>
                      <h2>A clear record</h2>
                      <p>
                        Workspace changes and decisions, with the person behind
                        them.
                      </p>
                    </div>
                  </div>
                  {state.audit
                    .slice()
                    .reverse()
                    .slice(0, 100)
                    .map((a) => (
                      <div className="s-audit-row" key={a.id}>
                        <span className="s-doc-icon">
                          <History size={16} />
                        </span>
                        <div>
                          <strong>{a.action}</strong>
                          <p>
                            {a.actor} · {a.target}
                          </p>
                        </div>
                        <time>{new Date(a.at).toLocaleString()}</time>
                      </div>
                    ))}
                </section>
              )}
            </>
          )}
          {page === "Workflow settings" && (
            <div className="s-workflow-layout">
              <nav className="s-panel s-channel-list" aria-label="Channel workflows">
                <span className="s-nav-label">CHANNEL WORKFLOWS</span>
                {CHANNELS.map((c) => (
                  <button
                    key={c}
                    className={c === workflowChannel ? "s-selected" : ""}
                    aria-pressed={c === workflowChannel}
                    onClick={() => setWorkflowChannel(c)}
                  >
                    <ChannelIcon channel={c} small />
                    {c}
                    <span
                      aria-hidden="true"
                      title={
                        state.workflows.some(
                          (w) => w.channel === c && w.status === "active",
                        ) ? "Active workflow" : "No active workflow"
                      }
                      className={
                        state.workflows.some(
                          (w) => w.channel === c && w.status === "active",
                        )
                          ? "s-status-dot"
                          : "s-status-dot s-inactive"
                      }
                    />
                  </button>
                ))}
              </nav>
              <div>
                <section className="s-panel">
                  <div className="s-section-heading">
                    <div className="s-inline">
                      <ChannelIcon channel={workflowChannel} />
                      <div>
                        <h2>{workflowChannel} workflow</h2>
                        <p>A clear creative brief, every time.</p>
                      </div>
                    </div>
                    <button
                      className="s-btn"
                      disabled={readOnly || busy}
                      onClick={() =>
                        void execute(
                          {
                            type: "workflow.importPreset",
                            channel: workflowChannel,
                          },
                          "Channel preset imported as a draft workflow for review",
                        )
                      }
                    >
                      <BookOpen size={16} /> Import channel preset
                    </button>
                    <button
                      disabled={readOnly}
                      className="s-btn s-primary"
                      onClick={() => {
                        const w = state.workflows
                          .filter((w) => w.channel === workflowChannel)
                          .sort((a, b) => b.version - a.version)[0];
                        openForm(
                          "Edit workflow",
                          [
                            field(
                              "title",
                              "Workflow name",
                              w?.title ||
                                `${workflowChannel} editorial workflow`,
                            ),
                            field(
                              "audience",
                              "Who are we speaking to?",
                              w?.audience,
                              "textarea",
                            ),
                            field(
                              "instructions",
                              "Creative instructions",
                              w?.instructions,
                              "textarea",
                            ),
                            field(
                              "guardrails",
                              "Channel guardrails",
                              w?.guardrails,
                              "textarea",
                            ),
                            {
                              ...field(
                                "references",
                                "Reference IDs (comma separated)",
                                w?.references.join(", "),
                              ),
                              hint: state.references
                                .filter(
                                  (r) =>
                                    r.channel === "Shared" ||
                                    r.channel === workflowChannel,
                                )
                                .map((r) => `${r.id}: ${r.title}`)
                                .join("\n"),
                            },
                            field(
                              "examples",
                              "Examples of good output",
                              w?.examples,
                              "textarea",
                            ),
                            field(
                              "outputFormat",
                              "Output format",
                              w?.outputFormat,
                              "textarea",
                            ),
                            field(
                              "checks",
                              "Review checks",
                              w?.checks,
                              "textarea",
                            ),
                            ...FUNCTIONS.map((kind) => ({
                              name: `connection_${kind}`,
                              label: `${kind.charAt(0).toUpperCase() + kind.slice(1)} connection`,
                              value:
                                w?.functionConnections?.[kind] ||
                                (kind === "text" ? w?.connectionId : "") ||
                                "",
                              options: [
                                "",
                                ...state.connections
                                  .filter((c) => c.function === kind)
                                  .map((c) => c.id),
                              ],
                              optionLabels: Object.fromEntries(
                                state.connections
                                  .filter((c) => c.function === kind)
                                  .map((c) => [
                                    c.id,
                                    `${c.title} · ${c.model}`,
                                  ]),
                              ),
                              hint: "Activate this workflow version to apply its model mapping.",
                            })),
                          ],
                          (d) => ({
                            type: "workflow.save",
                            id: w?.id,
                            expectedUpdatedAt: w
                              ? w.updatedAt || w.createdAt
                              : undefined,
                            channel: workflowChannel,
                            title: val(d, "title"),
                            audience: val(d, "audience"),
                            instructions: val(d, "instructions"),
                            guardrails: val(d, "guardrails"),
                            references: val(d, "references")
                              .split(",")
                              .map((x) => x.trim())
                              .filter(Boolean),
                            examples: val(d, "examples"),
                            outputFormat: val(d, "outputFormat"),
                            checks: val(d, "checks"),
                            connectionId: val(d, "connection_text"),
                            functionConnections: Object.fromEntries(
                              FUNCTIONS.map((kind) => [
                                kind,
                                val(d, `connection_${kind}`),
                              ]).filter(([, id]) => id),
                            ),
                          }),
                          "Draft edits update the same revision and timestamp. Changes to an active workflow stay pending review before activation.",
                          "Save changes",
                        );
                      }}
                    >
                      <Plus size={15} /> Edit workflow
                    </button>
                  </div>
                  <WorkflowVersions
                    key={workflowChannel}
                    state={state}
                    actor={actor}
                    channel={workflowChannel}
                    readOnly={readOnly}
                    execute={execute}
                    editConnections={(id) => {
                      const w = state.workflows.find((w) => w.id === id);
                      if (!w) return;
                      openForm(
                        "Edit workflow connections",
                        FUNCTIONS.map((kind) => ({
                          name: `connection_${kind}`,
                          label: `${kind.charAt(0).toUpperCase() + kind.slice(1)} connection`,
                          value:
                            w.functionConnections?.[kind] ||
                            (kind === "text" ? w.connectionId : "") ||
                            "",
                          options: [
                            "",
                            ...state.connections
                              .filter(
                                (c) =>
                                  c.function === kind &&
                                  (c.status !== "disconnected" ||
                                    c.id ===
                                      (w.functionConnections?.[kind] ||
                                        (kind === "text"
                                          ? w.connectionId
                                          : ""))),
                              )
                              .map((c) => c.id),
                          ],
                          optionLabels: Object.fromEntries([
                            ["", "No connection (remove binding)"],
                            ...state.connections
                              .filter((c) => c.function === kind)
                              .map((c) => [
                                c.id,
                                `${c.title} · ${c.model}${c.status === "disconnected" ? " (disconnected)" : ""}`,
                              ]),
                          ]),
                          hint: "Choose No connection to remove this workflow binding. Saved API credentials are managed in AI & budgets.",
                        })),
                        (d) => ({
                          type: "workflow.save",
                          id: w.id,
                          expectedUpdatedAt: w.updatedAt || w.createdAt,
                          channel: w.channel,
                          title: w.title,
                          audience: w.audience,
                          instructions: w.instructions,
                          guardrails: w.guardrails,
                          references: w.references,
                          examples: w.examples,
                          outputFormat: w.outputFormat,
                          checks: w.checks,
                          connectionId: val(d, "connection_text"),
                          functionConnections: Object.fromEntries(
                            FUNCTIONS.map((kind) => [
                              kind,
                              val(d, `connection_${kind}`),
                            ]).filter(([, id]) => id),
                          ),
                        }),
                        `Editing Workflow v${w.version}. Draft edits update this revision. Changes to active instructions remain pending until reviewed and activated. Existing approvals and API credentials are preserved.`,
                        "Save changes",
                      );
                    }}
                  />
                  {!state.workflows.some(
                    (w) => w.channel === workflowChannel,
                  ) && (
                    <Empty
                      icon={Settings2}
                      title="Give this channel a direction"
                    >
                      Define its audience, creative instructions, references and
                      review checks.
                    </Empty>
                  )}
                </section>
                <section className="s-panel s-recent-panel">
                  <div className="s-section-heading">
                    <div>
                      <h2>Protected brand rules</h2>
                      <p>
                        These rules apply across every channel. Only the founder
                        can change them.
                      </p>
                    </div>
                    <Badge>{state.settings.protectedVersion}</Badge>
                  </div>
                  <pre className="s-policy-copy">
                    {state.settings.protectedRules ||
                      "No protected brand rules configured."}
                  </pre>
                  {founder && (
                    <div className="s-panel-padding">
                      <button
                        className="s-btn"
                        onClick={() =>
                          openForm(
                            "Update protected brand rules",
                            [
                              {
                                name: "rules",
                                label: "Cross-channel brand rules",
                                type: "textarea",
                                value: state.settings.protectedRules,
                                required: true,
                              },
                            ],
                            (d) => ({
                              type: "policy.save",
                              rules: val(d, "rules"),
                            }),
                          )
                        }
                      >
                        Edit protected rules
                      </button>
                    </div>
                  )}
                </section>
              </div>
            </div>
          )}
          {page === "People" && (
            <>
              <div className="s-info-strip">
                <Users size={17} />
                <span>
                  Access follows each member’s roles and scoped grants. Founders
                  can be assigned explicitly by administrators.
                </span>
              </div>
              <section className="s-panel">
                {state.members.map((m) => (
                  <div className="s-member-row" key={m.id}>
                    <span className="s-member-avatar">
                      {m.email.slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <strong>{m.email}</strong>
                      <p>
                        {m.grants.length
                          ? m.grants
                              .map(
                                (g) =>
                                  `${g.action}${g.channel ? ` · ${g.channel}` : ""}`,
                              )
                              .join(" / ")
                          : "Role-based workspace access"}
                      </p>
                    </div>
                    <div className="s-role-list">
                      {m.roles.map((r) => (
                        <Badge key={r}>{r}</Badge>
                      ))}
                      {m.revoked && <Badge tone="red">Revoked</Badge>}
                    </div>
                    <button
                      disabled={!admin}
                      className="s-btn s-small-btn"
                      onClick={() =>
                        openForm(
                          `Edit ${m.email}`,
                          [
                            {
                              name: "roles",
                              label: "Roles (comma separated)",
                              value: m.roles.join(", "),
                              hint: ROLES.join(", "),
                            },
                            {
                              name: "grants",
                              label: "Scoped grants (JSON)",
                              type: "textarea",
                              value: JSON.stringify(m.grants, null, 2),
                            },
                          ],
                          (d) => ({
                            type: "member.save",
                            email: m.email,
                            roles: val(d, "roles")
                              .split(",")
                              .map((x) => x.trim())
                              .filter(Boolean),
                            grants: JSON.parse(val(d, "grants") || "[]"),
                          }),
                        )
                      }
                    >
                      Edit access
                    </button>
                    <button
                      disabled={!admin || m.revoked}
                      className="s-icon-button"
                      aria-label={`Revoke ${m.email}`}
                      onClick={() =>
                        openForm(
                          "Revoke workspace access",
                          [],
                          () => ({ type: "member.revoke", email: m.email }),
                          `${m.email} will lose access to the workspace.`,
                          "Revoke access",
                        )
                      }
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </section>
              <div className="s-role-guide">
                {ROLES.map((r) => (
                  <article key={r}>
                    <ShieldCheck size={18} />
                    <h3>{r}</h3>
                    <p>
                      {
                        {
                          founder:
                            "Owns protected brand policy and workspace direction.",
                          administrator:
                            "Manages the workspace, members and configuration.",
                          manager:
                            "Coordinates content, reviews and publication planning.",
                          editor:
                            "Reviews and improves the content your team creates.",
                          creator: "Develops ideas and drafts for team review.",
                          viewer: "Reads the workspace without making changes.",
                        }[r]
                      }
                    </p>
                  </article>
                ))}
              </div>
            </>
          )}
          {page === "AI & budgets" && (
            <>
              <PricingManager request={pricingRequest} demo={mode === "demo"} disabled={!allowed("settings.manage")} changed={refresh}/>
              <div className="s-stats s-budget-stats">
                <Stat
                  label="Monthly budget"
                  number={money(state.settings.monthlyCap)}
                  icon={<Zap size={19} />}
                  note="Hard spending limit"
                />
                <Stat
                  label="Spent & reserved"
                  number={money(totalSpend)}
                  icon={<Clock3 size={19} />}
                  note="Includes queued reservations"
                />
                <Stat
                  label="Per-request cap"
                  number={money(state.settings.requestCap)}
                  icon={<ShieldCheck size={19} />}
                  note="Maximum estimated cost"
                />
              </div>
              <div className="s-info-strip">
                <ShieldCheck size={17} />
                <span>
                  {mode === "demo"
                    ? "Demo mode never runs paid providers or stores API keys."
                    : "Connections are unverified until a real provider check completes. Paid work is queued and respects spending limits."}
                </span>
              </div>
                  <section className="s-panel"><div className="s-section-heading"><div><h2>Set up by function</h2><p>Choose a provider and its account model for each type of work.</p></div></div><div className="s-actions">{FUNCTIONS.map((kind) => <ConnectionEditor key={kind} initialFunction={kind} demo={mode === "demo"} disabled={!allowed("connections.manage", {function: kind})} save={send} discover={discoverAccountModels} />)}</div></section>
              <section className="s-panel">
                <div className="s-section-heading">
                  <div>
                    <h2>AI connections</h2>
                    <p>Connect a provider for a specific creative function.</p>
                  </div>
                  <button
                    disabled={!admin}
                    className="s-btn s-primary"
                    onClick={() =>
                      openForm(
                        "Add AI connection",
                        [
                          {
                            ...field("title", "Connection name"),
                            required: true,
                          },
                          {
                            name: "provider",
                            label: "Provider",
                            options: ["anthropic", "openai", "google"],
                          },
                          {
                            name: "function",
                            label: "Function",
                            options: FUNCTIONS,
                          },
                          {
                            ...field("model", "Model identifier"),
                            required: true,
                          },
                          {
                            ...field(
                              "maxRequestCost",
                              "Local budget reservation allowance ($)",
                              0,
                              "number",
                            ),
                            hint: "A budget allowance is separate from verified provider pricing. Paid generation stays blocked until qualified pricing and execution are configured.",
                          },
                          {
                            name: "key",
                            label: "API key",
                            type: "password",
                            required: mode === "live",
                            hint:
                              mode === "demo"
                                ? "Keys are discarded in demo mode."
                                : "Encrypted on the server. Never shown or stored in the browser.",
                          },
                        ],
                        (d) => ({
                          type: "connection.save",
                          title: val(d, "title"),
                          provider: val(d, "provider"),
                          function: val(d, "function"),
                          model: val(d, "model"),
                          key: val(d, "key"),
                          maxRequestCost: cents(d, "maxRequestCost"),
                        }),
                        "Saving credentials does not validate provider access.",
                        "Save connection",
                      )
                    }
                  >
                    <Plus size={15} /> Add connection
                  </button>
                </div>
                {state.connections.map((c) => (
                  <div className="s-list-row s-connection-row" key={c.id}>
                    <ConnectionEditor connection={c} demo={mode === "demo"} disabled={!allowed("connections.manage", {function: c.function})} save={send} discover={discoverAccountModels} />
                    <span className="s-provider-icon">
                      <Sparkles size={20} />
                    </span>
                    <div>
                      <strong>{c.title}</strong>
                      <p>
                        {c.provider} · {c.model} · {c.function}
                      </p>
                      {connectionChecks[c.id] &&
                        c.status !== "disconnected" && (
                          <p
                            className={`s-connection-feedback s-check-${connectionChecks[c.id].status}`}
                            role={
                              connectionChecks[c.id].status === "error"
                                ? "alert"
                                : "status"
                            }
                            aria-live="polite"
                          >
                            {connectionChecks[c.id].message}
                          </p>
                        )}
                    </div>
                    <Badge tone={c.status === "validated" ? "green" : "amber"}>
                      {c.status === "disconnected"
                        ? "Disconnected"
                        : c.status === "validated"
                          ? "Model access checked"
                          : "Unverified"}
                    </Badge>
                    <span className="s-muted">
                      {c.hasKey
                        ? "•••••••• · Credential stored"
                        : "No credential"}
                    </span>
                    <button
                      className="s-btn s-small-btn"
                      disabled={!admin || busy || c.status === "disconnected"}
                      onClick={() => void validateAI(c.id)}
                    >
                      {connectionChecks[c.id]?.status === "checking"
                        ? "Checking model access…"
                        : "Check model access"}
                    </button>
                    {allowed("connections.manage", {
                      function: c.function,
                    }) && (
                      <div className="s-actions s-connection-actions">
                        <button
                          className="s-btn s-small-btn"
                          disabled={busy || c.status === "disconnected"}
                          onClick={() =>
                            openForm(
                              "Edit connection allowance",
                              [
                                {
                                  ...field(
                                    "allowance",
                                    "Per-request allowance ($)",
                                    (
                                      c as typeof c & {
                                        maxRequestCost?: number;
                                      }
                                    ).maxRequestCost
                                      ? (
                                          c as typeof c & {
                                            maxRequestCost: number;
                                          }
                                        ).maxRequestCost / 100
                                      : 0,
                                    "number",
                                  ),
                                  required: true,
                                },
                              ],
                              (d) => ({
                                type: "connection.allowance",
                                id: c.id,
                                expectedUpdatedAt: c.updatedAt,
                                maxRequestCost: cents(d, "allowance"),
                              }),
                              "This edits only the request allowance. Credentials and model stay unchanged. Resolve active jobs first.",
                            )
                          }
                        >
                          Edit allowance
                        </button>
                        <button
                          className="s-btn s-small-btn"
                          disabled={busy || c.status === "disconnected"}
                          aria-label={`Disconnect ${c.title}`}
                          onClick={() =>
                            openForm(
                              "Disconnect AI connection",
                              [],
                              () => ({
                                type: "connection.disconnect",
                                id: c.id,
                                expectedUpdatedAt: c.updatedAt,
                              }),
                              `Clear the saved API key for “${c.title}” and prevent future use. History and workflow versions remain. Active jobs must be resolved first. This does not revoke the key at the provider or disconnect other connections using the same key.`,
                              "Disconnect",
                            )
                          }
                        >
                          Disconnect
                        </button>
                        <button
                          className="s-btn s-small-btn"
                          disabled={busy}
                          aria-label={`Delete ${c.title}`}
                          onClick={() =>
                            openForm(
                              "Delete unused AI connection",
                              [],
                              () => ({
                                type: "connection.delete",
                                id: c.id,
                                expectedUpdatedAt: c.updatedAt,
                              }),
                              `Delete “${c.title}” and clear its saved credential. Allowed only with no job history or workflow references. Otherwise disconnect to retain history.`,
                              "Delete connection",
                            )
                          }
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {!state.connections.length && (
                  <Empty icon={Zap} title="Bring your own creative tools">
                    Add a provider connection when you are ready. Your workspace
                    works without one.
                  </Empty>
                )}
              </section>
              <section className="s-panel s-recent-panel">
                <div className="s-section-heading">
                  <div>
                    <h2>Spending & workspace settings</h2>
                    <p>
                      All amounts are in US dollars. A zero cap blocks paid
                      requests.
                    </p>
                  </div>
                  <button
                    disabled={!admin}
                    className="s-btn"
                    onClick={() =>
                      openForm(
                        "Workspace settings",
                        [
                          field(
                            "timezone",
                            "Timezone",
                            state.settings.timezone,
                          ),
                          {
                            name: "trashDays",
                            label: "Trash retention (days)",
                            value: "90",
                            options: ["90"],
                            hint: "Content is retained for the required 90-day recovery period.",
                          },
                          field(
                            "monthlyCap",
                            "Monthly cap ($)",
                            state.settings.monthlyCap / 100,
                            "number",
                          ),
                          field(
                            "requestCap",
                            "Per-request cap ($)",
                            state.settings.requestCap / 100,
                            "number",
                          ),
                          field(
                            "confirmationThreshold",
                            "Confirmation threshold ($)",
                            state.settings.confirmationThreshold / 100,
                            "number",
                          ),
                          {
                            name: "functionCaps",
                            label: "Per-function caps (JSON, US cents)",
                            type: "textarea",
                            value: JSON.stringify(
                              state.settings.functionCaps,
                              null,
                              2,
                            ),
                          },
                          {
                            name: "userCaps",
                            label: "Per-user caps (JSON, US cents)",
                            type: "textarea",
                            value: JSON.stringify(
                              state.settings.userCaps,
                              null,
                              2,
                            ),
                          },
                          {
                            name: "channelCaps",
                            label: "Per-channel caps (JSON, US cents)",
                            type: "textarea",
                            value: JSON.stringify(
                              state.settings.channelCaps || {},
                              null,
                              2,
                            ),
                          },
                          {
                            name: "accountCaps",
                            label: "Per-account caps (JSON, US cents)",
                            type: "textarea",
                            value: JSON.stringify(
                              state.settings.accountCaps || {},
                              null,
                              2,
                            ),
                          },
                          {
                            name: "emailEnabled",
                            label: "Email notifications",
                            options: ["Disabled", "Enabled"],
                            value: state.settings.emailEnabled
                              ? "Enabled"
                              : "Disabled",
                          },
                          {
                            name: "docsMode",
                            label: "Google Docs sync",
                            options: founder
                              ? ["manual", "automatic"]
                              : [state.settings.docsMode],
                            value: state.settings.docsMode,
                            hint: "Founder-controlled. Automatic mode checks linked, manually fetched documents periodically; conflicting or approved versions require human import.",
                          },
                        ],
                        (d) => ({
                          type: "settings.save",
                          timezone: val(d, "timezone"),
                          trashDays: Number(val(d, "trashDays")),
                          monthlyCap: cents(d, "monthlyCap"),
                          requestCap: cents(d, "requestCap"),
                          confirmationThreshold: cents(
                            d,
                            "confirmationThreshold",
                          ),
                          currency: "USD",
                          functionCaps: JSON.parse(
                            val(d, "functionCaps") || "{}",
                          ),
                          userCaps: JSON.parse(val(d, "userCaps") || "{}"),
                          channelCaps: JSON.parse(
                            val(d, "channelCaps") || "{}",
                          ),
                          accountCaps: JSON.parse(
                            val(d, "accountCaps") || "{}",
                          ),
                          emailEnabled: val(d, "emailEnabled") === "Enabled",
                          docsMode: val(d, "docsMode"),
                        }),
                      )
                    }
                  >
                    Edit settings
                  </button>
                </div>
                <div className="s-settings-grid">
                  <div>
                    <span>Confirmation required above</span>
                    <strong>
                      {money(state.settings.confirmationThreshold)}
                    </strong>
                  </div>
                  <div>
                    <span>Workspace timezone</span>
                    <strong>{state.settings.timezone}</strong>
                  </div>
                  <div>
                    <span>Trash retention</span>
                    <strong>{state.settings.trashDays} days</strong>
                  </div>
                  <div>
                    <span>Google Docs</span>
                    <strong>Manual fetch</strong>
                  </div>
                  <div>
                    <span>Email notifications</span>
                    <strong>
                      {state.settings.emailEnabled
                        ? "Enabled · delivery needs configuration"
                        : "Disabled"}
                    </strong>
                  </div>
                </div>
              </section>
              <section className="s-panel s-recent-panel">
                <div className="s-section-heading">
                  <div>
                    <h2>Generation activity</h2>
                    <p>
                      Track current requests and your 10 most recent results.
                    </p>
                  </div>
                  <button
                    disabled={readOnly}
                    className="s-btn"
                    onClick={() => setQueueTarget("general")}
                  >
                    <Plus size={15} /> Queue request
                  </button>
                </div>
                <GenerationActivity jobs={state.jobs} renderJob={(j) => (
                    <div className="s-job-row" key={j.id}>
                      <div>
                        <strong>
                          {j.kind} · {j.channel}
                        </strong>
                        <p>{stamp(j.createdAt)}</p>
                        {j.error && <p className="s-red-text">{j.error}</p>}
                        <details>
                          <summary>View request</summary>
                          <p>{j.prompt}</p>
                        </details>
                        {j.result && (
                          <details>
                            <summary>View provider result</summary>
                            <pre>{j.result}</pre>
                          </details>
                        )}
                      </div>
                      <Badge
                        tone={
                          j.state === "failed"
                            ? "red"
                            : j.state === "succeeded"
                              ? "green"
                              : "amber"
                        }
                      >
                        {j.state.replaceAll("_", " ")}
                      </Badge>
                      <span>{money(j.actual ?? (j.reserved || j.estimate))} {j.actual != null ? "actual" : j.reserved ? "reserved" : "estimated"}</span>
                      {j.kind === "research" &&
                        j.state === "succeeded" &&
                        j.result && (
                          <button
                            className="s-btn s-small-btn"
                            disabled={
                              !allowed("reference.edit", { channel: j.channel })
                            }
                            onClick={() =>
                              openForm(
                                "Save cited research reference",
                                [
                                  {
                                    ...field(
                                      "title",
                                      "Reference title",
                                      `${j.channel} research — ${stamp(j.createdAt)}`,
                                    ),
                                    required: true,
                                  },
                                ],
                                (d) => ({
                                  type: "research.saveReference",
                                  jobId: j.id,
                                  title: val(d, "title"),
                                }),
                                "This retains actual provider citations as untrusted evidence for human review. It does not activate a workflow or verify every claim.",
                                "Save source reference",
                              )
                            }
                          >
                            Save research as reference
                          </button>
                        )}
                      {j.state === "awaiting_confirmation" && (
                        <button
                          disabled={readOnly}
                          className="s-btn s-primary s-small-btn"
                          onClick={() =>
                            void execute({ type: "job.confirm", id: j.id })
                          }
                        >
                          Confirm {money(j.estimate)}
                        </button>
                      )}
                      {["queued", "awaiting_confirmation"].includes(
                        j.state,
                      ) && (
                        <button
                          disabled={readOnly}
                          className="s-btn s-small-btn"
                          onClick={() =>
                            void execute({ type: "job.cancel", id: j.id })
                          }
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  )} />
              </section>
            </>
          )}
          {page === "Notifications" && (
            <section className="s-panel">
              {state.notices
                .slice()
                .reverse()
                .map((n) => (
                  <div
                    className={`s-notification ${!n.read ? "s-unread" : ""}`}
                    key={n.id}
                  >
                    <span className="s-doc-icon">
                      <Bell size={18} />
                    </span>
                    <div>
                      <h3>{n.title}</h3>
                      <p>{n.body}</p>
                      <small>
                        {new Date(n.createdAt).toLocaleString()} · Email:{" "}
                        {n.emailState.replaceAll("_", " ")}
                      </small>
                    </div>
                    {!n.read && (
                      <button
                        className="s-btn s-small-btn"
                        onClick={() =>
                          void execute({ type: "notice.read", id: n.id }, "")
                        }
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                ))}
              {!state.notices.length && (
                <Empty icon={Bell} title="A quiet moment">
                  Reviews, assignments and workflow updates will appear here.
                </Empty>
              )}
            </section>
          )}
          <footer className="s-footer">
            <span>
              RyzaLab Studio <span>·</span> Yours by design.
            </span>
            <span>
              <ShieldCheck size={13} /> Thoughtfully created. Human published.
            </span>
          </footer>
        </main>
      </div>
      {queueTarget && (
        <QueueRequest
          state={state}
          content={queueTarget === "general" ? undefined : queueTarget}
          busy={busy}
          readOnly={readOnly}
          error={localError || error}
          run={execute}
          close={() => setQueueTarget(null)}
        />
      )}
      {dialog && (
        <div
          className="s-modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) setDialog(null);
          }}
        >
          <section
            className="s-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="studio-dialog-title"
          >
            <div className="s-modal-heading">
              <div>
                <span className="s-eyebrow">WORKSPACE</span>
                <h2 id="studio-dialog-title">{dialog.title}</h2>
              </div>
              <button
                aria-label="Close dialog"
                className="s-icon-button"
                disabled={busy}
                onClick={() => setDialog(null)}
              >
                <X size={20} />
              </button>
            </div>
            {dialog.description && (
              <p className="s-modal-description">{dialog.description}</p>
            )}
            {(localError || error) && (
              <div className="s-alert s-error" role="alert">
                {localError || error}
              </div>
            )}
            <form
              onSubmit={async (e: FormEvent<HTMLFormElement>) => {
                e.preventDefault();
                try {
                  await dialog.onSubmit(new FormData(e.currentTarget));
                } catch (e) {
                  setLocalError(
                    e instanceof Error
                      ? e.message
                      : "Check the form and try again.",
                  );
                }
              }}
            >
              {dialog.fields.map((f) => (
                <FieldInput key={f.name} item={f} />
              ))}
              <div className="s-modal-actions">
                <button
                  type="button"
                  className="s-btn"
                  disabled={busy}
                  onClick={() => setDialog(null)}
                >
                  Cancel
                </button>
                <button className="s-btn s-primary" disabled={busy}>
                  {busy ? "Saving…" : dialog.submit}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

function ProductionBoard({
  state,
  contents,
  ideas,
  openContent,
  openIdeas,
}: {
  state: StudioState;
  contents: Content[];
  ideas: StudioState["ideas"];
  openContent: (content: Content) => void;
  openIdeas: () => void;
}) {
  const buckets = [
    "Ideas",
    "Drafting",
    "Human review",
    "Ready to export",
    "Published",
  ] as const;
  const bucketFor = (content: Content) => stageSummary(content, state).bucket;
  return (
    <section className="s-production-board" aria-label="Production Board">
      {buckets.map((bucket) => {
        const cards = contents.filter(
          (content) => bucketFor(content) === bucket,
        );
        return (
          <section className="s-board-column" key={bucket} aria-label={bucket}>
            <div className="s-board-column-heading">
              <h2>{bucket}</h2>
              <Badge>{bucket === "Ideas" ? ideas.length : cards.length}</Badge>
            </div>
            {bucket === "Ideas" ? (
              <>
                <button className="s-btn s-board-add" onClick={openIdeas}>
                  <WandSparkles size={16} /> Generate or add ideas
                </button>
                {ideas.map((idea) => (
                  <button
                    key={idea.id}
                    className="s-board-card"
                    onClick={openIdeas}
                    aria-label={`Open idea ${idea.title}`}
                  >
                    <ChannelIcon channel={idea.channel} small />
                    <h3>{idea.title}</h3>
                    <p>{idea.brief || "Ready to shape into a story."}</p>
                    <Badge>{idea.state}</Badge>
                    <small>
                      {idea.origin === "demo_sample"
                        ? "Demo sample"
                        : idea.origin === "agent"
                          ? "Agent generated"
                          : "Added manually"}
                    </small>
                  </button>
                ))}
              </>
            ) : (
              cards.map((content) => (
                <button
                  key={content.id}
                  className="s-board-card"
                  onClick={() => openContent(content)}
                  aria-label={`Open ${content.title}`}
                >
                  <div className="s-inline">
                    <ChannelIcon channel={content.channel} small />
                    <span>{content.channel}</span>
                  </div>
                  <h3>{content.title}</h3>
                  <p>
                    {content.text ? content.text.slice(0, 120) : content.format}
                  </p>
                  <Badge>
                    {content.state === "changes" ? "Changes requested" : bucket}
                  </Badge>
                  <small>
                    {stageSummary(content, state).label} ·{" "}
                    {stageSummary(content, state).completed}/9 checks
                  </small>
                  <small>
                    Revision {content.revision} · Updated{" "}
                    {stamp(content.updatedAt)}
                  </small>
                  <span className="s-text-button">
                    Open content <ArrowRight size={15} />
                  </span>
                </button>
              ))
            )}
            {(bucket === "Ideas" ? ideas.length === 0 : cards.length === 0) && (
              <p className="s-board-empty">
                No {bucket.toLowerCase()} records.
              </p>
            )}
          </section>
        );
      })}
    </section>
  );
}

function QueueRequest({
  state,
  content,
  busy,
  readOnly,
  error,
  run,
  close,
}: {
  state: StudioState;
  content?: Content;
  busy: boolean;
  readOnly: boolean;
  error: string;
  run: (c: Command, m?: string) => Promise<boolean>;
  close: () => void;
}) {
  const [channel, setChannel] = useState<Channel>(
    content?.channel || "LinkedIn",
  );
  const [kind, setKind] = useState<FunctionKind>("text");
  const workflow = state.workflows.find(
    (w) => w.channel === channel && w.status === "active",
  );
  const binding =
    workflow?.functionConnections?.[kind] ||
    (kind === "text" ? workflow?.connectionId : "");
  const connection = state.connections.find((c) => c.id === binding);
  return (
    <div className="s-modal-backdrop">
      <section
        className="s-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="queue-dialog-title"
      >
        <div className="s-modal-heading">
          <div>
            <span className="s-eyebrow">CREATIVE QUEUE</span>
            <h2 id="queue-dialog-title">A little creative assistance</h2>
          </div>
          <button
            className="s-icon-button"
            aria-label="Close dialog"
            disabled={busy}
            onClick={close}
          >
            <X size={20} />
          </button>
        </div>
        <p className="s-modal-description">
          {content
            ? `For “${content.title}”, revision ${content.revision}. `
            : ""}
          Requests use the active channel workflow’s model mapping. They enter
          the queue for processing; they are not finished assets.
        </p>
        {error && (
          <div className="s-alert s-error" role="alert">
            {error}
          </div>
        )}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            if (
              await run(
                {
                  type: "job.enqueue",
                  kind,
                  channel,
                  contentId: content?.id,
                  connectionId: connection?.id || "",
                  prompt: val(data, "prompt"),
                  estimate: cents(data, "estimate"),
                  idempotencyKey: key(),
                },
                "Creative request queued",
              )
            )
              close();
          }}
        >
          <label className="s-field">
            Channel
            <select
              aria-label="Channel"
              disabled={!!content}
              value={channel}
              onChange={(e) => setChannel(e.target.value as Channel)}
            >
              {CHANNELS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="s-field">
            Creative function
            <select
              aria-label="Creative function"
              value={kind}
              onChange={(e) => setKind(e.target.value as FunctionKind)}
            >
              {FUNCTIONS.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </label>
          <div className="s-queue-binding">
            <h4>Active workflow binding</h4>
            <strong>{connection?.title || "No connection configured"}</strong>
            <p>
              {connection
                ? `${connection.provider} · ${connection.model} · ${kind}`
                : "Add a connection in AI & budgets, then activate the mapping in Workflow settings."}
            </p>
            <Badge tone={workflow ? "green" : "amber"}>
              {workflow
                ? `Workflow v${workflow.version}`
                : "No active workflow"}
            </Badge>
            <small>
              Only a permitted administrator can activate a different model
              mapping. A connection check verifies model access. Pricing and
              output quality require separate verification.
            </small>
          </div>
          <FieldInput
            item={{
              name: "prompt",
              label: "Request",
              type: "textarea",
              value: content?.media.imagePrompt || "",
              required: true,
            }}
          />
          <FieldInput
            item={{
              name: "estimate",
              label: "Budget reservation estimate ($)",
              type: "number",
              value: 0,
              hint: "A budget allowance is separate from verified provider pricing. A zero cap blocks paid work. Paid execution requires qualified pricing and provider configuration.",
            }}
          />
          <div className="s-modal-actions">
            <button
              type="button"
              className="s-btn"
              disabled={busy}
              onClick={close}
            >
              Cancel
            </button>
            <button
              className="s-btn s-primary"
              disabled={readOnly || busy || !workflow || !connection}
            >
              {busy ? "Queuing…" : "Queue request"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function SearchBox({
  value,
  set,
}: {
  value: string;
  set: (v: string) => void;
}) {
  return (
    <label className="s-search">
      <Search size={16} />
      <input
        aria-label="Search content"
        placeholder="Search content…"
        value={value}
        onChange={(e) => set(e.target.value)}
      />
    </label>
  );
}
function Stat({
  label,
  number,
  icon,
  note,
  onClick,
}: {
  label: string;
  number: string | number;
  icon: ReactNode;
  note: string;
  onClick?: () => void;
}) {
  return (
    <button className="s-stat" onClick={onClick} disabled={!onClick}>
      <div>
        <span>{label}</span>
        <i>{icon}</i>
      </div>
      <strong>{number}</strong>
      <small>
        <span /> {note}
      </small>
    </button>
  );
}

function comparableMedia(media: MediaProject) {
  return JSON.stringify(media, (_key, value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return value;
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)));
  });
}

function Editor({
  content: c,
  actor,
  send,
  state,
  readOnly: editorReadOnly,
  busy,
  mode,
  run,
  back,
  form,
  onError,
  refresh,
  queue,
}: {
  content: Content;
  actor: Actor;
  send: (command: Command) => Promise<unknown>;
  state: StudioState;
  readOnly: boolean;
  busy: boolean;
  mode: "demo" | "live";
  run: (c: Command, m?: string) => Promise<boolean>;
  back: () => void;
  form: (
    title: string,
    fields: Field[],
    command: (d: FormData) => Command,
    description?: string,
    submit?: string,
  ) => void;
  onError: (e: string) => void;
  refresh: () => Promise<void>;
  queue: () => void;
}) {
  const writingInFlight = state.settings.reviewPolicy?.mode === "two_step" && state.jobs.some((job) => job.contentId === c.id && job.kind === "text" && job.outputContract === "draft_v1" && ["queued", "running"].includes(job.state));
  // Prevent local edits while the worker may apply a result to the saved revision.
  const readOnly = editorReadOnly || Boolean(writingInFlight) || (state.settings.reviewPolicy?.mode === "two_step" && busy);
  const [title, setTitle] = useState(c.title);
  const [text, setText] = useState(c.text);
  const [metadata, setMetadata] = useState(c.metadata);
  const [collection, setCollection] = useState(c.collection || "");
  const [media, setMedia] = useState<MediaProject>(c.media || initialMedia());
  const [tab, setTab] = useState("Write");
  const [slideIndex, setSlideIndex] = useState(0);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [sceneIndex, setSceneIndex] = useState(0);
  const [docsText, setDocsText] = useState("");
  const baseline = useRef({ id: c.id, revision: c.revision, title: c.title, text: c.text, metadata: c.metadata, collection: c.collection || "", media: comparableMedia(c.media) });
  const [externalChange, setExternalChange] = useState(false);
  function loadSavedDraft() {
    setTitle(c.title);
    setText(c.text);
    setMetadata(c.metadata);
    setCollection(c.collection || "");
    setMedia(c.media || initialMedia());
    setSlideIndex((i) => Math.max(0, Math.min(i, c.media.slides.length - 1)));
    setSceneIndex((i) => Math.max(0, Math.min(i, c.media.scenes.length - 1)));
    baseline.current = { id: c.id, revision: c.revision, title: c.title, text: c.text, metadata: c.metadata, collection: c.collection || "", media: comparableMedia(c.media) };
    setExternalChange(false);
  }
  useEffect(() => {
    const previous = baseline.current;
    const unsaved = title !== previous.title || text !== previous.text || metadata !== previous.metadata || collection !== previous.collection || comparableMedia(media) !== previous.media;
    const matchesSaved = title === c.title && text === c.text && metadata === c.metadata && collection === (c.collection || "") && comparableMedia(media) === comparableMedia(c.media);
    if (previous.id === c.id && previous.revision !== c.revision && unsaved && !matchesSaved) {
      setExternalChange(true);
      return;
    }
    loadSavedDraft();
  }, [c.id, c.revision]);
  const dirty =
    title !== c.title ||
    text !== c.text ||
    metadata !== c.metadata ||
    collection !== (c.collection || "") ||
    comparableMedia(media) !== comparableMedia(c.media);
  const slide = media.slides[slideIndex];
  const scene = media.scenes[sceneIndex];
  const save = () =>
    externalChange ? Promise.resolve(false) : run(
      {
        type: "content.save",
        id: c.id,
        expectedRevision: c.revision,
        title,
        text,
        metadata,
        media,
        collection,
      },
      "Draft saved",
    );
  function updateMedia(p: Partial<MediaProject>) {
    setMedia((m) => ({ ...m, ...p }));
  }
  function updateSlide(p: Partial<Slide>) {
    updateMedia({
      slides: media.slides.map((s, i) =>
        i === slideIndex ? { ...s, ...p } : s,
      ),
    });
  }
  function updateScene(p: Partial<Scene>) {
    updateMedia({
      scenes: media.scenes.map((s, i) =>
        i === sceneIndex ? { ...s, ...p } : s,
      ),
    });
  }
  async function connectDocs() {
    if (mode === "demo") {
      onError(
        "Connecting Google Docs requires a live workspace. Demo mode does not simulate OAuth.",
      );
      return;
    }
    try {
      const session = await supabase?.auth.getSession();
      const token = session?.data.session?.access_token;
      if (!token) throw new Error("Sign in to connect Google Docs.");
      const response = await fetch("/api/studio/google/connect", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error || "Google Docs connection is not configured.",
        );
      if (!result.url)
        throw new Error("Google did not return a connection URL.");
      window.location.assign(result.url);
    } catch (e) {
      onError(
        e instanceof Error ? e.message : "Google Docs connection failed.",
      );
    }
  }
  async function uploadAsset(file: File, target: "image" | "video" | "audio") {
    if (mode === "demo") {
      onError(
        "Private file uploads require a live workspace and configured media storage. Use a source URL or import a media project in demo mode.",
      );
      return;
    }
    try {
      const session = await supabase?.auth.getSession();
      const token = session?.data.session?.access_token;
      if (!token) throw new Error("Sign in to upload media.");
      const response = await fetch("/api/studio/assets/sign", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contentId: c.id,
          name: file.name,
          mime: file.type,
          size: file.size,
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Upload authorization failed.");
      const upload = await supabase!.storage
        .from("studio-assets")
        .uploadToSignedUrl(result.path, result.token, file, {
          contentType: file.type,
        });
      if (upload.error)
        throw new Error(
          "Private media upload failed. Try a supported file up to 50 MB.",
        );
      if (target === "image") updateSlide({ image: result.url });
      else if (target === "video") updateScene({ sourceUrl: result.url });
      else updateScene({ audioUrl: result.url });
    } catch (e) {
      onError(e instanceof Error ? e.message : "Media upload failed.");
    }
  }
  async function fetchDocs() {
    if (mode === "demo") {
      onError(
        "Google Docs fetching needs a configured live workspace and Google credentials. Demo mode does not simulate a fetch.",
      );
      return;
    }
    try {
      const session = await supabase?.auth.getSession();
      const token = session?.data.session?.access_token;
      if (!token) throw new Error("Sign in to fetch Google Docs.");
      const res = await fetch("/api/studio/docs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          contentId: c.id,
          expectedDocId: c.docId,
          expectedRevision: c.revision,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Google Docs fetch failed.");
      await refresh();
    } catch (e) {
      onError(
        e instanceof Error ? e.message : "Google Docs is not configured.",
      );
    }
  }
  return (
    <>
      <div className="s-editor-heading">
        <button
          className="s-text-button"
          onClick={() => {
            if (dirty) {
              onError("Save your draft before leaving the editor.");
              return;
            }
            back();
          }}
        >
          <ArrowLeft size={15} /> All drafts
        </button>
        <div className="s-actions">
          <Badge>{c.channel}</Badge>
          <Badge>Revision {c.revision}</Badge>
          <Badge tone={dirty ? "amber" : "green"}>
            {dirty ? "Unsaved changes" : "Saved"}
          </Badge>
          <button
            disabled={readOnly || busy || !dirty || externalChange}
            className="s-btn"
            onClick={() => void save()}
          >
            Save draft
          </button>
          <button
            disabled={readOnly || busy || dirty || externalChange}
            className="s-btn s-primary"
            title={dirty ? "Save your changes before submitting" : ""}
            onClick={() =>
              void run(
                { type: "content.submit", id: c.id },
                "Draft submitted for human review",
              )
            }
          >
            <ShieldCheck size={15} /> Submit for review
          </button>
        </div>
      </div>
      {externalChange && (
        <div className="s-info-strip" role="alert">
          <span>This saved draft changed elsewhere while you had unsaved edits. Your edits are still here; copy them somewhere safe before loading the updated draft.</span>
          <button className="s-btn" onClick={() => { if (window.confirm("Discard your unsaved edits and load the current saved draft?")) loadSavedDraft(); }}>Discard unsaved edits and load latest</button>
        </div>
      )}
      {state.settings.reviewPolicy?.mode === "two_step" && (
        <DraftAssistant content={c} state={state} actor={actor} dirty={dirty || externalChange} readOnly={editorReadOnly} busy={busy} run={run} refresh={refresh} />
      )}
      <StageTracker
        content={c}
        state={state}
        actor={actor}
        send={send}
        onError={onError}
      />
      <div className="s-editor-layout">
        <section className="s-panel s-editor-main">
          <div className="s-editor-title">
            <input
              aria-label="Content title"
              disabled={readOnly}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <p>
              {c.format} · {c.channel} {c.account ? `· ${c.account}` : ""}
            </p>
          </div>
          <div className="s-view-tabs s-editor-tabs">
            {[
              "Write",
              "Slides",
              "Video & audio",
              "Google Docs",
              "Versions",
            ].map((t) => (
              <button
                className={tab === t ? "s-selected" : ""}
                aria-pressed={tab === t}
                key={t}
                onClick={() => setTab(t)}
              >
                {t === "Slides" ? (
                  <Layers3 size={15} />
                ) : t === "Video & audio" ? (
                  <Video size={15} />
                ) : t === "Versions" ? (
                  <History size={15} />
                ) : (
                  <FileText size={15} />
                )}{" "}
                {t}
              </button>
            ))}
          </div>
          {tab === "Write" && (
            <div className="s-writing">
              <textarea
                aria-label="Content text"
                disabled={readOnly}
                placeholder="Start with something worth saying…"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <div className="s-editor-wordcount">
                {text.trim() ? text.trim().split(/\s+/).length : 0} words{" "}
                <span>{text.length} characters</span>
              </div>
              <label className="s-field">
                Publication metadata / caption
                <textarea
                  aria-label="Publication metadata"
                  disabled={readOnly}
                  value={metadata}
                  onChange={(e) => setMetadata(e.target.value)}
                  placeholder="Add a caption, hashtags, SEO notes or a publication checklist."
                  rows={4}
                />
              </label>
              <label className="s-field">
                Collection
                <input
                  disabled={readOnly}
                  value={collection}
                  onChange={(e) => setCollection(e.target.value)}
                  placeholder="e.g. Brand stories / October campaign"
                />
              </label>
            </div>
          )}
          {tab === "Slides" && (
            <div className="s-media-editor">
              <div className="s-media-tools">
                <span>{media.slides.length} slides</span>
                <div className="s-actions">
                  <select
                    aria-label="Approved slide template"
                    disabled={readOnly}
                    defaultValue=""
                    onChange={(e) => {
                      const t = state.templates.find(
                        (t) => t.id === e.target.value,
                      );
                      if (t)
                        updateMedia({
                          slides: t.slides.map((s) => ({ ...s, id: key() })),
                          templateId: t.id,
                        });
                    }}
                  >
                    <option value="">Apply approved template</option>
                    {state.templates
                      .filter(
                        (t) =>
                          t.status === "approved" && t.channel === c.channel,
                      )
                      .map((t) => (
                        <option value={t.id} key={t.id}>
                          {t.title}
                        </option>
                      ))}
                  </select>
                  <button
                    className="s-btn s-small-btn"
                    disabled={readOnly}
                    onClick={() => {
                      updateMedia({ slides: [...media.slides, makeSlide()] });
                      setSlideIndex(media.slides.length);
                    }}
                  >
                    <Plus size={14} /> Add slide
                  </button>
                </div>
              </div>
              {slide ? (
                <>
                  <div className="s-slide-workspace">
                    <div className="s-slide-thumbs">
                      {media.slides.map((s, i) => (
                        <button
                          className={i === slideIndex ? "s-selected" : ""}
                          key={s.id}
                          onClick={() => setSlideIndex(i)}
                        >
                          <span>{i + 1}</span>
                          <strong>{s.title}</strong>
                        </button>
                      ))}
                    </div>
                    <div
                      className="s-slide-preview"
                      style={{
                        background: slide.background,
                        color: slide.color,
                      }}
                    >
                      {slide.image && <AssetMedia source={slide.image} />}
                      <div
                        className="s-slide-copy"
                        style={{
                          left: `${slide.x}%`,
                          top: `${slide.y}%`,
                          width: `max(1px, calc(${100 - slide.x}% - 3.7037cqw))`,
                        }}
                      >
                        <h2
                          style={{
                            fontSize: `calc(${slide.fontSize} / 1080 * 100cqw)`,
                          }}
                        >
                          {slide.title}
                        </h2>
                        <p
                          style={{
                            fontSize: `calc(${slide.fontSize * 0.55} / 1080 * 100cqw)`,
                            marginTop: `calc(${slide.fontSize * 0.4} / 1080 * 100cqw)`,
                          }}
                        >
                          {slide.body}
                        </p>
                      </div>
                      {(slide.layers || []).map((layer) => (
                        <SlideLayerPreview
                          key={layer.id}
                          layer={layer}
                          selected={
                            layer.id ===
                            ((slide.layers || []).find(
                              (l) => l.id === selectedLayerId,
                            )?.id || (slide.layers || [])[0]?.id)
                          }
                          onSelect={() => setSelectedLayerId(layer.id)}
                          onMove={(moved) =>
                            updateSlide({
                              layers: (slide.layers || []).map((l) =>
                                l.id === moved.id ? moved : l,
                              ),
                            })
                          }
                          readOnly={readOnly}
                        />
                      ))}
                    </div>
                  </div>
                  <SlideLayerEditor
                    layers={slide.layers || []}
                    onChange={(layers) => updateSlide({ layers })}
                    selectedId={selectedLayerId}
                    onSelect={setSelectedLayerId}
                    readOnly={readOnly}
                  />
                  <div className="s-slide-fields">
                    <label className="s-field">
                      Slide title
                      <input
                        disabled={readOnly}
                        value={slide.title}
                        onChange={(e) => updateSlide({ title: e.target.value })}
                      />
                    </label>
                    <label className="s-field">
                      Body
                      <textarea
                        aria-label="Slide body"
                        disabled={readOnly}
                        value={slide.body}
                        onChange={(e) => updateSlide({ body: e.target.value })}
                      />
                    </label>
                    <label className="s-file-button">
                      Upload slide image
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        disabled={readOnly}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void uploadAsset(file, "image");
                          e.target.value = "";
                        }}
                      />
                    </label>
                    <label className="s-field">
                      Image URL
                      <input
                        type="url"
                        disabled={readOnly}
                        value={slide.image || ""}
                        onChange={(e) =>
                          updateSlide({ image: e.target.value || undefined })
                        }
                      />
                    </label>
                    <div className="s-form-grid">
                      <label className="s-field">
                        Background
                        <input
                          type="color"
                          disabled={readOnly}
                          value={slide.background}
                          onChange={(e) =>
                            updateSlide({ background: e.target.value })
                          }
                        />
                      </label>
                      <label className="s-field">
                        Text color
                        <input
                          type="color"
                          disabled={readOnly}
                          value={slide.color}
                          onChange={(e) =>
                            updateSlide({ color: e.target.value })
                          }
                        />
                      </label>
                      <label className="s-field">
                        Text size
                        <input
                          type="number"
                          min="12"
                          max="180"
                          disabled={readOnly}
                          value={slide.fontSize}
                          onChange={(e) =>
                            updateSlide({ fontSize: Number(e.target.value) })
                          }
                        />
                      </label>
                      <label className="s-field">
                        X position (%)
                        <input
                          type="number"
                          min="0"
                          max="100"
                          disabled={readOnly}
                          value={slide.x}
                          onChange={(e) =>
                            updateSlide({ x: Number(e.target.value) })
                          }
                        />
                      </label>
                      <label className="s-field">
                        Y position (%)
                        <input
                          type="number"
                          min="0"
                          max="100"
                          disabled={readOnly}
                          value={slide.y}
                          onChange={(e) =>
                            updateSlide({ y: Number(e.target.value) })
                          }
                        />
                      </label>
                    </div>
                    <div className="s-actions">
                      <button
                        disabled={readOnly || slideIndex === 0}
                        className="s-btn s-small-btn"
                        onClick={() => {
                          const slides = [...media.slides];
                          [slides[slideIndex - 1], slides[slideIndex]] = [
                            slides[slideIndex],
                            slides[slideIndex - 1],
                          ];
                          updateMedia({ slides });
                          setSlideIndex(slideIndex - 1);
                        }}
                      >
                        <ArrowLeft size={14} /> Move left
                      </button>
                      <button
                        disabled={
                          readOnly || slideIndex === media.slides.length - 1
                        }
                        className="s-btn s-small-btn"
                        onClick={() => {
                          const slides = [...media.slides];
                          [slides[slideIndex + 1], slides[slideIndex]] = [
                            slides[slideIndex],
                            slides[slideIndex + 1],
                          ];
                          updateMedia({ slides });
                          setSlideIndex(slideIndex + 1);
                        }}
                      >
                        Move right <ArrowRight size={14} />
                      </button>
                      <button
                        className="s-btn s-small-btn"
                        disabled={readOnly}
                        onClick={() => {
                          updateMedia({
                            slides: media.slides.filter(
                              (_, i) => i !== slideIndex,
                            ),
                          });
                          setSlideIndex(Math.max(0, slideIndex - 1));
                        }}
                      >
                        <Trash2 size={14} /> Remove
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <Empty icon={Layers3} title="Build your story, slide by slide">
                  Add a slide or apply an approved template to begin.
                </Empty>
              )}
              <div className="s-export-bar">
                <button
                  className="s-btn s-small-btn"
                  disabled={!media.slides.length}
                  onClick={() =>
                    void exportSlides(media.slides, "png").catch((e) =>
                      onError(String(e)),
                    )
                  }
                >
                  PNG bundle
                </button>
                <button
                  className="s-btn s-small-btn"
                  disabled={!media.slides.length}
                  onClick={() =>
                    void exportSlides(media.slides, "pdf").catch((e) =>
                      onError(String(e)),
                    )
                  }
                >
                  PDF
                </button>
                <button
                  className="s-btn s-small-btn"
                  disabled={readOnly || !media.slides.length}
                  onClick={() =>
                    form(
                      "Save slide template",
                      [field("title", "Template name", title)],
                      (d) => ({
                        type: "template.save",
                        title: val(d, "title"),
                        channel: c.channel,
                        slides: media.slides,
                      }),
                      "Templates are pending until approved.",
                    )
                  }
                >
                  Save template
                </button>
              </div>
              <small className="s-export-note">
                PNG/PDF preserve slide colors, positions and typography. Images
                must be embedded or from this workspace to export. Project JSON
                retains all editable source.
              </small>
            </div>
          )}
          {tab === "Video & audio" && (
            <div className="s-media-editor">
              <div className="s-info-strip">
                <Video size={17} />
                <span>
                  Edit the complete scene plan and original source references.
                  Video rendering and voice generation need a configured
                  provider.
                </span>
              </div>
              <div className="s-media-tools">
                <label className="s-inline">
                  Aspect ratio{" "}
                  <select
                    disabled={readOnly}
                    value={media.aspect}
                    onChange={(e) =>
                      updateMedia({
                        aspect: e.target.value as MediaProject["aspect"],
                      })
                    }
                  >
                    {["9:16", "16:9", "1:1"].map((a) => (
                      <option key={a}>{a}</option>
                    ))}
                  </select>
                </label>
                <button
                  className="s-btn s-small-btn"
                  disabled={readOnly}
                  onClick={() => {
                    updateMedia({ scenes: [...media.scenes, makeScene()] });
                    setSceneIndex(media.scenes.length);
                  }}
                >
                  <Plus size={14} /> Add scene
                </button>
              </div>
              <div className="s-scene-timeline">
                {media.scenes.map((s, i) => (
                  <button
                    className={i === sceneIndex ? "s-selected" : ""}
                    key={s.id}
                    onClick={() => setSceneIndex(i)}
                  >
                    <Video size={20} />
                    <strong>
                      {i + 1}. {s.title}
                    </strong>
                    <small>
                      {s.duration}s {s.preserveAudio ? "· Original audio" : ""}
                    </small>
                  </button>
                ))}
              </div>
              {scene && (
                <div className="s-scene-fields">
                  <label className="s-field">
                    Scene title
                    <input
                      disabled={readOnly}
                      value={scene.title}
                      onChange={(e) => updateScene({ title: e.target.value })}
                    />
                  </label>
                  <label className="s-field">
                    Scene script
                    <textarea
                      aria-label="Scene script"
                      disabled={readOnly}
                      rows={5}
                      value={scene.script}
                      onChange={(e) => updateScene({ script: e.target.value })}
                    />
                  </label>
                  <div className="s-form-grid">
                    <label className="s-field">
                      Duration (seconds)
                      <input
                        type="number"
                        disabled={readOnly}
                        min="1"
                        value={scene.duration}
                        onChange={(e) =>
                          updateScene({ duration: Number(e.target.value) })
                        }
                      />
                    </label>
                    <label className="s-field">
                      Video / source URL
                      <input
                        type="url"
                        disabled={readOnly}
                        value={scene.sourceUrl || ""}
                        onChange={(e) =>
                          updateScene({
                            sourceUrl: e.target.value || undefined,
                          })
                        }
                      />
                    </label>
                    <label className="s-field">
                      Audio URL
                      <input
                        type="url"
                        disabled={readOnly}
                        value={scene.audioUrl || ""}
                        onChange={(e) =>
                          updateScene({ audioUrl: e.target.value || undefined })
                        }
                      />
                    </label>
                  </div>
                  <div className="s-actions s-upload-actions">
                    <label className="s-file-button">
                      Upload complete source video
                      <input
                        type="file"
                        accept="video/mp4"
                        disabled={readOnly}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void uploadAsset(file, "video");
                          e.target.value = "";
                        }}
                      />
                    </label>
                    <label className="s-file-button">
                      Upload source audio
                      <input
                        type="file"
                        accept="audio/mpeg,audio/wav"
                        disabled={readOnly}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void uploadAsset(file, "audio");
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                  {scene.sourceUrl && (
                    <div className="s-source-preview">
                      <AssetMedia source={scene.sourceUrl} kind="video" />
                    </div>
                  )}
                  {scene.audioUrl && (
                    <div className="s-source-preview">
                      <AssetMedia source={scene.audioUrl} kind="audio" />
                    </div>
                  )}
                  <label className="s-checkbox">
                    <input
                      type="checkbox"
                      disabled={readOnly}
                      checked={scene.preserveAudio}
                      onChange={(e) =>
                        updateScene({ preserveAudio: e.target.checked })
                      }
                    />{" "}
                    Preserve original source audio
                  </label>
                  {scene.sourceUrl &&
                    !scene.sourceUrl.startsWith("/api/studio/assets") && (
                      <a
                        className="s-text-button"
                        href={safeUrl(scene.sourceUrl)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open full original source ↗
                      </a>
                    )}
                  <div className="s-actions">
                    <button
                      className="s-btn s-small-btn"
                      disabled={readOnly || sceneIndex === 0}
                      onClick={() => {
                        const scenes = [...media.scenes];
                        [scenes[sceneIndex - 1], scenes[sceneIndex]] = [
                          scenes[sceneIndex],
                          scenes[sceneIndex - 1],
                        ];
                        updateMedia({ scenes });
                        setSceneIndex(sceneIndex - 1);
                      }}
                    >
                      Move earlier
                    </button>
                    <button
                      className="s-btn s-small-btn"
                      disabled={
                        readOnly || sceneIndex === media.scenes.length - 1
                      }
                      onClick={() => {
                        const scenes = [...media.scenes];
                        [scenes[sceneIndex + 1], scenes[sceneIndex]] = [
                          scenes[sceneIndex],
                          scenes[sceneIndex + 1],
                        ];
                        updateMedia({ scenes });
                        setSceneIndex(sceneIndex + 1);
                      }}
                    >
                      Move later
                    </button>
                    <button
                      className="s-btn s-small-btn"
                      disabled={readOnly}
                      onClick={() => {
                        updateMedia({
                          scenes: media.scenes.filter(
                            (_, i) => i !== sceneIndex,
                          ),
                        });
                        setSceneIndex(Math.max(0, sceneIndex - 1));
                      }}
                    >
                      Remove scene
                    </button>
                  </div>
                </div>
              )}
              <label className="s-field">
                Narration / voiceover
                <textarea
                  aria-label="Narration / voiceover"
                  disabled={readOnly}
                  rows={4}
                  value={media.narration}
                  onChange={(e) => updateMedia({ narration: e.target.value })}
                />
              </label>
              <label className="s-field">
                Captions
                <textarea
                  aria-label="Captions"
                  disabled={readOnly}
                  rows={4}
                  value={media.captions}
                  onChange={(e) => updateMedia({ captions: e.target.value })}
                />
              </label>
              <div className="s-info-strip">
                <Clock3 size={17} />
                <span>
                  {media.scenes.reduce((a, s) => a + s.duration, 0)} seconds
                  planned · Source footage and audio are retained in project
                  exports. No final video has been rendered.
                </span>
              </div>
            </div>
          )}
          {tab === "Google Docs" && (
            <div className="s-docs-panel">
              <span className="s-docs-icon">
                <FileText size={35} />
              </span>
              <h2>Your words, wherever you work</h2>
              <p>
                Link a Google document, then fetch it when you choose. External
                edits never silently overwrite a draft.
              </p>
              <div className="s-info-strip">
                <Link2 size={17} />
                <span>
                  {c.docId
                    ? `Linked document: ${c.docId}`
                    : "No Google document linked."}
                  {c.docsFetchedAt
                    ? ` · Last fetched ${new Date(c.docsFetchedAt).toLocaleString()}`
                    : ""}
                </span>
              </div>
              <div className="s-actions">
                <button
                  className="s-btn"
                  disabled={readOnly || dirty}
                  onClick={() => void connectDocs()}
                >
                  Connect Google Docs
                </button>
                <button
                  className="s-btn"
                  disabled={readOnly || dirty}
                  onClick={() =>
                    form(
                      "Link Google document",
                      [
                        {
                          name: "docId",
                          label: "Google document ID or URL",
                          value: c.docId,
                          required: true,
                        },
                      ],
                      (d) => ({
                        type: "docs.link",
                        contentId: c.id,
                        docId:
                          val(d, "docId").match(
                            /\/document\/d\/([A-Za-z0-9_-]+)/,
                          )?.[1] || val(d, "docId"),
                      }),
                      "Linking requires no publication permissions. A live fetch needs configured Google credentials.",
                    )
                  }
                >
                  Link document
                </button>
                <button
                  className="s-btn s-primary"
                  disabled={readOnly || !c.docId || dirty}
                  onClick={() => void fetchDocs()}
                >
                  Fetch latest text
                </button>
                <button
                  className="s-btn"
                  onClick={() => downloadText(text, `${title}.md`)}
                >
                  Export Markdown
                </button>
              </div>
              {c.docsSyncError && (
                <p role="alert" className="s-red-text">
                  {c.docsSyncError}
                </p>
              )}
              {c.docsIncoming && (
                <section
                  className="s-docs-conflict"
                  aria-label="Google Docs conflict"
                >
                  <h3>Google Docs changes need review</h3>
                  <p>{c.docsIncoming.reason}</p>
                  <details>
                    <summary>Compare Studio and incoming text</summary>
                    <h4>Current Studio text</h4>
                    <pre>{c.text}</pre>
                    <h4>Incoming Google Docs text</h4>
                    <pre>{c.docsIncoming.text}</pre>
                  </details>
                  <button
                    className="s-btn"
                    disabled={readOnly || dirty}
                    onClick={() =>
                      form(
                        "Import saved Google Docs version",
                        [],
                        () => ({
                          type: "docs.import",
                          contentId: c.id,
                          text: c.docsIncoming!.text,
                          expectedIncomingFetchedAt: c.docsIncoming!.fetchedAt,
                          expectedRevision: c.revision,
                        }),
                        "The displaced Studio text stays in history, unchanged media is retained and approved snapshots remain immutable. Required text checks reopen.",
                        "Import incoming text",
                      )
                    }
                  >
                    Import incoming text
                  </button>
                </section>
              )}
              <div className="s-docs-import">
                <h3>Import reviewed document text</h3>
                <p>
                  Paste the text you want to bring into a new saved revision.
                </p>
                <textarea
                  disabled={readOnly}
                  aria-label="Document text to import"
                  rows={7}
                  value={docsText}
                  onChange={(e) => setDocsText(e.target.value)}
                />
                <button
                  disabled={readOnly || dirty || !docsText.trim()}
                  className="s-btn"
                  onClick={() =>
                    void run(
                      {
                        type: "docs.import",
                        contentId: c.id,
                        text: docsText,
                        expectedRevision: c.revision,
                      },
                      "Document text imported as a new revision",
                    )
                  }
                >
                  Import as new revision
                </button>
              </div>
              <div className="s-actions">
                <button
                  className="s-btn"
                  onClick={() =>
                    void exportContentDocument(
                      title,
                      text,
                      c.revision,
                      "docx",
                    ).catch((e) => onError(String(e)))
                  }
                >
                  Export DOCX
                </button>
                <button
                  className="s-btn"
                  onClick={() =>
                    void exportContentDocument(
                      title,
                      text,
                      c.revision,
                      "pdf",
                    ).catch((e) => onError(String(e)))
                  }
                >
                  Export text PDF
                </button>
                <label className="s-file-button">
                  Import DOCX
                  <input
                    type="file"
                    accept=".docx"
                    disabled={readOnly || dirty}
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      try {
                        setDocsText(await importDocx(f));
                      } catch (error) {
                        onError(String(error));
                      }
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
              <small>
                DOCX imports are extracted as plain text for review above.
                Choose Import as new revision to save them.
              </small>
            </div>
          )}
          {tab === "Versions" && (
            <div className="s-versions">
              <div className="s-info-strip">
                <History size={17} />
                <span>
                  Restoring creates a new revision. Approved packages and
                  publication records stay intact.
                </span>
              </div>
              {c.history
                .slice()
                .reverse()
                .map((r, i) => (
                  <details className="s-version" key={r.id}>
                    <summary>
                      <span className="s-doc-icon">
                        <History size={17} />
                      </span>
                      <div>
                        <strong>{r.title}</strong>
                        <p>
                          {new Date(r.createdAt).toLocaleString()} ·{" "}
                          {r.createdBy}
                        </p>
                      </div>
                      <Badge>{r.reason}</Badge>
                      <ChevronDown size={15} />
                    </summary>
                    <pre>{r.text}</pre>
                    <button
                      className="s-btn"
                      disabled={readOnly || dirty}
                      onClick={() =>
                        void run(
                          {
                            type: "content.restore",
                            id: c.id,
                            revisionId: r.id,
                          },
                          "Revision restored as a new draft",
                        )
                      }
                    >
                      Restore this revision
                    </button>
                  </details>
                ))}
              {!c.history.length && (
                <Empty icon={History} title="Your story is just beginning">
                  Saved revisions will appear here.
                </Empty>
              )}
            </div>
          )}
        </section>
        <aside className="s-editor-aside">
          <details className="s-panel s-creative-direction">
            <summary className="s-section-heading">
              <h2>Creative direction</h2>
              <ChevronDown size={17} />
            </summary>
            <div className="s-panel-padding">
              {(() => {
                const w = state.workflows.find((w) => w.id === c.workflowId);
                return w ? (
                  <>
                    <Badge tone="green">Workflow v{w.version}</Badge>
                    <h3>{w.title}</h3>
                    <h4>Audience</h4>
                    <p>{w.audience}</p>
                    <h4>Instructions</h4>
                    <p>{w.instructions}</p>
                    <h4>Review checks</h4>
                    <p>{w.checks}</p>
                  </>
                ) : (
                  <>
                    <Badge tone="amber">Workflow not configured</Badge>
                    <p>
                      Set up a channel workflow to give your team shared
                      creative direction.
                    </p>
                  </>
                );
              })()}
              <h4>Protected brand rules</h4>
              <p>
                {state.settings.protectedRules ||
                  "No protected rules configured."}
              </p>
            </div>
          </details>
          <section className="s-panel">
            <div className="s-section-heading">
              <h2>Details & handoff</h2>
            </div>
            <div className="s-panel-padding">
              <h4>Assigned to</h4>
              <p>{c.assignedTo || "Unassigned"}</p>
              <button
                disabled={readOnly}
                className="s-text-button"
                onClick={() =>
                  form(
                    "Assign this draft",
                    [
                      {
                        name: "email",
                        label: "Team member email",
                        type: "email",
                        value: c.assignedTo,
                        required: true,
                      },
                    ],
                    (d) => ({
                      type: "content.assign",
                      id: c.id,
                      email: val(d, "email"),
                    }),
                  )
                }
              >
                Change assignee <ArrowRight size={13} />
              </button>
              <h4>Export your work</h4>
              <button
                className="s-btn s-full"
                onClick={() => {
                  try {
                    exportProject(media);
                  } catch (e) {
                    onError(String(e));
                  }
                }}
              >
                <ArrowDownToLine size={15} /> Complete project JSON
              </button>
              <button
                className="s-btn s-full"
                onClick={() =>
                  downloadText(
                    `${title}\n\n${text}\n\n${metadata}`,
                    `${title}.txt`,
                    "text/plain",
                  )
                }
              >
                <ArrowDownToLine size={15} /> Plain text
              </button>
              <label className="s-file-button">
                Import media project
                <input
                  type="file"
                  accept=".json,application/json"
                  disabled={readOnly}
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    try {
                      setMedia(importProject(await f.text()));
                      setSlideIndex(0);
                      setSceneIndex(0);
                    } catch (error) {
                      onError(String(error));
                    }
                    e.target.value = "";
                  }}
                />
              </label>
              <button
                className="s-btn s-full"
                disabled={!media.scenes.length}
                onClick={() => {
                  try {
                    exportSubtitles(media);
                  } catch (e) {
                    onError(String(e));
                  }
                }}
              >
                <ArrowDownToLine size={15} /> Captions / SRT
              </button>
              <h4>Image direction</h4>
              <textarea
                aria-label="Image prompt"
                disabled={readOnly}
                rows={4}
                placeholder="Describe your image concept. Image generation needs a configured provider."
                value={media.imagePrompt}
                onChange={(e) => updateMedia({ imagePrompt: e.target.value })}
              />
              <button
                className="s-btn s-full"
                disabled={readOnly || dirty}
                onClick={queue}
              >
                <Sparkles size={15} /> Queue creative request
              </button>
              <button
                className="s-text-button s-red-text"
                disabled={readOnly || dirty}
                onClick={() =>
                  form(
                    "Move draft to trash",
                    [],
                    () => ({ type: "content.trash", id: c.id }),
                    `This content can be restored within ${state.settings.trashDays} days.`,
                    "Move to trash",
                  )
                }
              >
                <Trash2 size={14} /> Move to trash
              </button>
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
