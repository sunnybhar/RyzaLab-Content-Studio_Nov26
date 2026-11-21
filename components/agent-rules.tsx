"use client";
import { WritingResources, writingResources } from "./writing-resources";
import { BudgetPagination } from "./budget-section";
import type { AgentFileSlot } from "@/lib/studio/agent-rule-files";
import "./agent-rules.css";
import {ACTIVE_CHANNELS as CHANNELS} from "@/lib/studio/active-channels";
import { readAgentPackage } from "@/lib/studio/agent-package";
import { AgentVoiceLibrary } from "./agent-voice-library";
import { useRef, useState } from "react";
import {
  type Actor,
  type Channel,
  type Command,
  type StudioState,
} from "@/lib/studio/types";
import { can } from "@/lib/studio/permissions";
const categories = ["Instructions", "Knowledge", "Voice examples", "Research", "Templates", "ZIP history"] as const;
type Category = (typeof categories)[number];
type RuleResource = {
  id: string;
  title: string;
  scope: string;
  note: string;
  text?: string;
  file?: { fileName: string; base64: string };
  date?: string;
  slot?: AgentFileSlot;
};

type PackageDraft = {
  instructions: string;
  context: string;
  files: string[];
  ignored: string[];
  archives?: import("@/lib/studio/agent-archives").AgentArchiveInput[];
  expectedInstructionsId?: string;
  expectedContextId?: string;
};

export function AgentRules({
  state,
  actor,
  send,
  local = false,
}: {
  state: StudioState;
  actor: Actor;
  local?: boolean;
  send: (command: Command) => Promise<unknown>;
}) {
  const [channel, setChannel] = useState<Channel>("LinkedIn"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [packageDraft, setPackageDraft] = useState<PackageDraft | null>(null);
  const allowed = can(state, actor, "workflow.edit", { channel });
  const dialog = useRef<HTMLDialogElement>(null);
  const [category, setCategory] = useState<Category>("Instructions");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string>();
  const [editor, setEditor] = useState<{ kind: "package" | "voice" | "file"; resource?: RuleResource }>();
  const files = (state.agentRuleFiles ?? []).filter(file => file.channel === channel);
  const slotRow = (slot: AgentFileSlot, label: string): RuleResource => {
    const file = files.find(entry => entry.slot === slot);
    return {
      id: slot, title: file?.fileName ?? label, scope: channel,
      note: file ? label : "Ready to set up",
      date: file?.uploadedAt, text: file?.extractedText, file, slot,
    };
  };
  const rows: Record<Category, RuleResource[]> = {
    Instructions: [slotRow("instructions", "Instructions"), slotRow("humanizer", "Ryan’s Humanizer")],
    Knowledge: [slotRow("context", "Context")],
    "Voice examples": (state.agentVoiceExamples ?? []).filter(entry =>
      entry.channel === "Shared" || entry.channel === channel,
    ).map(entry => ({
      id: entry.id, title: entry.title, scope: entry.channel === "Shared" ? "Brand-wide" : channel,
      note: entry.contentType, text: entry.text ?? entry.extractedText, file: entry.file, date: entry.createdAt,
    })),
    Research: writingResources.filter(item => item.slot === "research_instructions" || item.slot === "source_preferences")
      .map(item => slotRow(item.slot, item.title)),
    Templates: writingResources.filter(item => item.slot === "newsletter_structure" || item.slot === "newsletter_layout")
      .map(item => slotRow(item.slot, item.title)),
    "ZIP history": (state.agentPackageArchives ?? []).filter(entry => entry.channel === channel).map(entry => ({
      id: entry.id, title: entry.fileName, scope: channel, note: entry.kind === "skill" ? "Skill ZIP" : "Channel ZIP",
      file: entry, date: entry.uploadedAt,
    })),
  };
  const visible = rows[category].filter(row =>
    [row.title, row.note, row.scope].some(value => value.toLowerCase().includes(query.trim().toLowerCase())),
  );
  const pages = Math.max(1, Math.ceil(visible.length / 6));
  const activePage = Math.min(page, pages - 1);
  const preview = visible.find(row => row.id === selected);
  const voiceAllowed = can(state, actor, "workflow.edit") || allowed;
  function openEditor(next: NonNullable<typeof editor>) {
    setEditor(next);
    setError("");
    setMessage("");
    dialog.current?.showModal();
  }

  async function upload(slot: "instructions" | "context", file: File) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (
        !/\.(docx|pdf|md|txt)$/i.test(file.name) ||
        file.size < 1 ||
        file.size > 262144
      )
        throw new Error(
          "Choose a nonempty DOCX, PDF, TXT or Markdown file up to 256 KB.",
        );
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      for (const byte of bytes) binary += String.fromCharCode(byte);
      const previous = state.agentRuleFiles?.find(
        (f) => f.channel === channel && f.slot === slot,
      );
      await send({
        type: "agentRules.save",
        channel,
        slot,
        fileName: file.name,
        byteSize: file.size,
        base64: btoa(binary),
        expectedId: previous?.id,
      });
      setMessage(
        `${slot === "instructions" ? "Instructions" : channel === "LinkedIn" ? "Markdown context (.md)" : "Context"} saved for ${channel}. Connected to new idea and writing requests.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the file.");
    } finally {
      setBusy(false);
    }
  }
  async function originalArchive(file:File,kind:"channel"|"skill"){
    const bytes=new Uint8Array(await file.arrayBuffer());let binary="";for(const byte of bytes)binary+=String.fromCharCode(byte);return {fileName:file.name,base64:btoa(binary),byteSize:bytes.length,kind};
  }
  function download(file: {fileName:string;base64:string}) {
    const bytes = Uint8Array.from(atob(file.base64), (char) =>
        char.charCodeAt(0),
      ),
      url = URL.createObjectURL(
        new Blob([bytes], { type: "application/octet-stream" }),
      ),
      a = document.createElement("a");
    a.href = url;
    a.download = file.fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section className="s-panel s-panel-padding" aria-label="Agent Rules files">
      <div className="s-rule-toolbar">
        <h2>Rule workspace</h2>
        <div className="s-actions">
          <label>Channel <select aria-label="Agent Rules channel" value={channel} disabled={busy}
            onChange={event => {
              setChannel(event.target.value as Channel);
              setSelected(undefined); setPage(0); setQuery(""); setMessage(""); setError("");
            }}>
            {CHANNELS.map(value => <option key={value}>{value}</option>)}
          </select></label>
          <button type="button" className="s-btn" onClick={() => openEditor({ kind: "package" })}>Channel package</button>
        </div>
      </div>
      {!editor && error && <p role="alert">{error}</p>}
      {!editor && message && <p role="status">{message}</p>}
      <div className="s-rule-workspace">
        <nav className="s-rule-categories" aria-label="Rule categories">
          {categories.map(item => <button type="button" key={item} className="s-btn" aria-pressed={item === category}
            onClick={() => { setCategory(item); setPage(0); setQuery(""); setSelected(undefined); }}>{item}</button>)}
        </nav>
        <section className="s-rule-list" aria-label={category}>
          <div className="s-rule-toolbar">
            <h3>{category}</h3>
            {category === "Voice examples" && <button type="button" className="s-btn s-primary"
              disabled={!voiceAllowed} onClick={() => openEditor({ kind: "voice" })}>Add voice example</button>}
          </div>
          <label className="s-field">Search resources
            <input type="search" value={query} onChange={event => { setQuery(event.target.value); setPage(0); }} />
          </label>
          {visible.slice(activePage * 6, activePage * 6 + 6).map(row => (
            <button type="button" className="s-rule-row" key={row.id} aria-pressed={selected === row.id}
              onClick={() => setSelected(row.id)}>
              <strong>{row.title}</strong><small>{row.scope} · {row.note}</small>
            </button>
          ))}
          {!visible.length && <p className="s-muted">{query.trim() ? "No matching resources." :
            category === "ZIP history" ? "No original ZIPs saved for this channel." : "No voice examples saved for this channel."}</p>}
          <BudgetPagination page={activePage} pages={pages} onPage={setPage} />
        </section>
        <aside className="s-rule-preview" aria-label="Resource preview">
          <h3>Resource preview</h3>
          {preview ? <>
            <strong>{preview.title}</strong>
            <p className="s-muted">{preview.scope} · {preview.note}</p>
            {preview.date && <p className="s-muted">{new Date(preview.date).toLocaleString()}</p>}
            {preview.text && <div className="s-rule-excerpt" tabIndex={0} aria-label="Saved text">{preview.text}</div>}
            {!preview.text && preview.slot && <p className="s-muted">{preview.file ? "Extracted text is unavailable for this file." : "Choose Manage resource to add guidance."}</p>}
            <div className="s-actions">
              {preview.file && <button type="button" className="s-btn" onClick={() => download(preview.file!)}>Download original</button>}
              {category !== "ZIP history" && <button type="button" className="s-btn"
                onClick={() => openEditor({ kind: preview.slot ? "file" : "voice", resource: preview })}>Manage resource</button>}
            </div>
          </> : <p className="s-muted">Select a resource to preview it.</p>}
        </aside>
      </div>
      <dialog ref={dialog} className="s-review-dialog s-rule-dialog"
        aria-label={editor?.kind === "package" ? "Channel package" : editor?.resource ? "Manage resource" : "Add voice example"}
        onCancel={event => { if (busy) event.preventDefault(); }}
        onClose={() => { setEditor(undefined); setPackageDraft(null); }}>
        <div className="s-review-dialog-heading">
          <h2>{editor?.kind === "package" ? "Channel package" : editor?.resource?.title ?? "Add voice example"}</h2>
          <button type="button" className="s-btn" disabled={busy} onClick={() => dialog.current?.close()}>Close</button>
        </div>
        <div className="s-review-dialog-body">
          {error && <p role="alert">{error}</p>}
          {message && <p role="status">{message}</p>}
          {(editor?.kind === "package" || packageDraft) && (
      <section
        className="s-panel s-panel-padding"
        aria-label="Upload agent ZIP package"
      >
        <h3>Upload or edit a channel package</h3>
        <p>
          Upload your ZIP whenever required. Preview and edit Instructions and
          context before saving to {channel}. INSTRUCTIONS.md (or 00-START-HERE-agent-instructions.md) and knowledge/*.md are imported; macOS metadata is excluded.
          setup guides, nested ZIPs and scripts are skipped. Add skill ZIPs separately below Instructions. Large knowledge context is selected into source-labelled excerpts of up to 12,000 characters per request; the complete saved text remains editable.
        </p>
        <input
          aria-label="Agent Rules ZIP package"
          type="file"
          accept=".zip"
          disabled={busy || !allowed}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            setBusy(true);
            setError("");
            try {
              if (file.size > 1048576) throw Error("Choose a ZIP up to 1 MB.");
              setPackageDraft({
                ...(await readAgentPackage(await file.arrayBuffer())),
                archives:[await originalArchive(file,"channel")],
                expectedInstructionsId: state.agentRuleFiles?.find(
                  (f) => f.channel === channel && f.slot === "instructions",
                )?.id,
                expectedContextId: state.agentRuleFiles?.find(
                  (f) => f.channel === channel && f.slot === "context",
                )?.id,
              });
            } catch (error) {
              setError(String(error));
            } finally {
              setBusy(false);
            }
          }}
        />
        <button
          className="s-btn"
          disabled={busy || !allowed}
          onClick={() =>
            setPackageDraft({
              instructions:
                state.agentRuleFiles?.find(
                  (f) => f.channel === channel && f.slot === "instructions",
                )?.extractedText || "",
              context:
                state.agentRuleFiles?.find(
                  (f) => f.channel === channel && f.slot === "context",
                )?.extractedText || "",
              files: [],
              ignored: [],
              expectedInstructionsId: state.agentRuleFiles?.find(
                (f) => f.channel === channel && f.slot === "instructions",
              )?.id,
              expectedContextId: state.agentRuleFiles?.find(
                (f) => f.channel === channel && f.slot === "context",
              )?.id,
            })
          }
        >
          Edit saved Instructions and context
        </button>
        <button className="s-btn" disabled={busy||!state.agentRuleFiles?.find(f=>f.channel===channel&&f.slot==="instructions")?.extractedText||!state.agentRuleFiles?.find(f=>f.channel===channel&&f.slot==="context")?.extractedText} onClick={async()=>{try{const {default:JSZip}=await import("jszip");const zip=new JSZip();zip.file(`${channel}/INSTRUCTIONS.md`,state.agentRuleFiles!.find(f=>f.channel===channel&&f.slot==="instructions")!.extractedText!);zip.file(`${channel}/knowledge/context.md`,state.agentRuleFiles!.find(f=>f.channel===channel&&f.slot==="context")!.extractedText!);const url=URL.createObjectURL(await zip.generateAsync({type:"blob"}));const a=document.createElement("a");a.href=url;a.download=`${channel.toLowerCase()}-agent-package.zip`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(error){setError(String(error));}}}>Download saved package ZIP</button>
        {packageDraft?.archives?.map(archive=><button key={archive.kind} className="s-btn" onClick={()=>download(archive)}>Download selected original ZIP · {archive.fileName}</button>)}
        {packageDraft && (
          <>
            <label className="s-field">
              Instructions to save
              <textarea
                aria-label="Package Instructions"
                rows={10}
                maxLength={60000}
                value={packageDraft.instructions}
                onChange={(e) =>
                  setPackageDraft({
                    ...packageDraft,
                    instructions: e.target.value,
                  })
                }
              />
            </label>
            <label className="s-field">
              Context to save
              <textarea
                aria-label="Package context"
                rows={14}
                maxLength={60000}
                value={packageDraft.context}
                onChange={(e) =>
                  setPackageDraft({ ...packageDraft, context: e.target.value })
                }
              />
            </label>
            <p>
              Context files:{" "}
              {packageDraft.files.join(", ") || "Edited saved text"}. Skipped:{" "}
              {packageDraft.ignored.join(", ") || "None"}.
            </p>
            <button
              className="s-btn s-primary"
              disabled={
                busy ||
                !allowed ||
                !packageDraft.instructions.trim() ||
                !packageDraft.context.trim()
              }
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  const file = (slot: string, text: string) => {
                    const bytes = new TextEncoder().encode(text);
                    let binary = "";
                    for (const byte of bytes)
                      binary += String.fromCharCode(byte);
                    return {
                      fileName: `${channel.toLowerCase()}-${slot}.md`,
                      byteSize: bytes.length,
                      base64: btoa(binary),
                    };
                  };
                  await send({
                    type: "agentRules.importPackage",
                    archives:packageDraft.archives,
                    channel,
                    instructions: file(
                      "instructions",
                      packageDraft.instructions,
                    ),
                    context: file("context", packageDraft.context),
                    expectedInstructionsId: packageDraft.expectedInstructionsId,
                    expectedContextId: packageDraft.expectedContextId,
                  });
                  setPackageDraft(null);
                  setMessage(
                    `Instructions and context saved together for ${channel}. New requests use this version.`,
                  );
                } catch (error) {
                  setError(String(error));
                } finally {
                  setBusy(false);
                }
              }}
            >
              Save package for {channel}
            </button>
            <button
              className="s-btn"
              disabled={busy}
              onClick={() => setPackageDraft(null)}
            >
              Cancel package edits
            </button>
          </>
        )}
      </section>)}
      {editor?.kind === "file" && !packageDraft &&
        (["instructions", "context"] as const).filter(slot => slot === editor.resource?.slot).map((slot) => {
          const label =
              slot === "instructions"
                ? "Instructions"
                : channel === "LinkedIn"
                  ? "Markdown context (.md)"
                  : "Context",
            file = state.agentRuleFiles?.find(
              (f) => f.channel === channel && f.slot === slot,
            );
          return (
            <article className="s-panel s-panel-padding" key={slot}>
              <h3>{label}</h3>
              <button
                className="s-btn"
                onClick={() => {
                  const text =
                    slot === "instructions"
                      ? `# ${channel} agent instructions\n\n## Purpose\nDescribe the content goal.\n\n## Audience\nDescribe the reader.\n\n## Writing rules\nDescribe tone, structure, format and preferred length.\n\n## Missing facts\nAsk for confirmation; never invent experiences or claims.\n`
                      : `# ${channel} Markdown context\n\n## RyzaLab background\nAdd accurate services and organization details.\n\n## Audience and themes\nAdd audience needs and content themes.\n\n## Source material\nAdd original facts and source links.\n`;
                  const url = URL.createObjectURL(
                    new Blob([text], { type: "text/markdown" }),
                  );
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${channel.toLowerCase()}-${slot}.md`;
                  a.click();
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                }}
              >
                Download {label} template
              </button>
              <p>
                {slot === "instructions"
                  ? "Voice, structure, writing rules and expected outputs."
                  : "Brand, audience, background, examples and source material."}
              </p>
              <label className="s-field">
                {slot === "instructions"
                  ? "Add skill guidance files (.md)"
                  : "Add knowledge files (.md)"}
                <input
                  aria-label={
                    slot === "instructions"
                      ? "Skill guidance Markdown files"
                      : "Knowledge Markdown files"
                  }
                  type="file"
                  accept=".md,.txt"
                  multiple
                  disabled={busy || !allowed}
                  onChange={async (event) => {
                    const files = Array.from(event.target.files || []);
                    event.target.value = "";
                    if (!files.length) return;
                    setBusy(true);
                    setError("");
                    try {
                      if (
                        files.length > 20 ||
                        files.some(
                          (f) =>
                            f.size > 262144 || !/\.(md|txt)$/i.test(f.name),
                        )
                      )
                        throw Error(
                          "Choose up to 20 Markdown/text files, at most 256 KB each.",
                        );
                      const added = (
                        await Promise.all(
                          files.map(
                            async (f) =>
                              `\n\n# Source file: ${f.name}\n\n${await f.text()}`,
                          ),
                        )
                      ).join("");
                      const draft = packageDraft || {
                        instructions:
                          state.agentRuleFiles?.find(
                            (f) =>
                              f.channel === channel &&
                              f.slot === "instructions",
                          )?.extractedText || "",
                        context:
                          state.agentRuleFiles?.find(
                            (f) =>
                              f.channel === channel && f.slot === "context",
                          )?.extractedText || "",
                        files: [],
                        ignored: [],
                        expectedInstructionsId: state.agentRuleFiles?.find(
                          (f) =>
                            f.channel === channel && f.slot === "instructions",
                        )?.id,
                        expectedContextId: state.agentRuleFiles?.find(
                          (f) => f.channel === channel && f.slot === "context",
                        )?.id,
                      };
                      const text =
                        draft[
                          slot === "instructions" ? "instructions" : "context"
                        ] + added;
                      if (text.length > 60000)
                        throw Error(
                          "Combined section exceeds 60,000 characters. Edit or remove older material first.",
                        );
                      setPackageDraft({
                        ...draft,
                        [slot === "instructions" ? "instructions" : "context"]:
                          text,
                        files: [...draft.files, ...files.map((f) => f.name)],
                      });
                    } catch (error) {
                      setError(String(error));
                    } finally {
                      setBusy(false);
                    }
                  }}
                />
              </label>
              {slot==="instructions"&&<label className="s-field">Upload skill ZIP (SKILL.md and references)
                <input aria-label="Skill ZIP package" type="file" accept=".zip" disabled={busy||!allowed} onChange={async event=>{const file=event.target.files?.[0];event.target.value="";if(!file)return;setBusy(true);setError("");try{
                  if(file.size>1048576)throw Error("Choose a skill ZIP up to 1 MB.");const skill=await readAgentPackage(await file.arrayBuffer(),"skill");
                  const draft:PackageDraft=packageDraft||{instructions:state.agentRuleFiles?.find(f=>f.channel===channel&&f.slot==="instructions")?.extractedText||"",context:state.agentRuleFiles?.find(f=>f.channel===channel&&f.slot==="context")?.extractedText||"",files:[],ignored:[],expectedInstructionsId:state.agentRuleFiles?.find(f=>f.channel===channel&&f.slot==="instructions")?.id,expectedContextId:state.agentRuleFiles?.find(f=>f.channel===channel&&f.slot==="context")?.id};
                  const instructions=draft.instructions+"\n\n# Skill guidance\n"+skill.instructions,context=draft.context+"\n\n"+skill.context;
                  if(instructions.length>60000||context.length>60000)throw Error("Combined skill and channel material exceeds 60,000 characters per section. Edit older material first.");
                  setPackageDraft({...draft,instructions,context,archives:[...(draft.archives||[]).filter(a=>a.kind!=="skill"),await originalArchive(file,"skill")],files:[...draft.files,...skill.files],ignored:[...draft.ignored,...skill.ignored]});
                }catch(error){setError(String(error));}finally{setBusy(false);}}}/>
              </label>}
              <p>
                <strong>
                  {file?.extractedText
                    ? "Connected to new AI requests"
                    : file
                      ? "Connected — text extracted on next request"
                      : "Upload to connect"}
                </strong>
              </p>
              {file ? (
                <>
                  <p>
                    {file.fileName} · {(file.byteSize / 1024).toFixed(1)} KB
                  </p>
                  <p>Uploaded {new Date(file.uploadedAt).toLocaleString()}</p>
                  <button className="s-btn" onClick={() => download(file)}>
                    Download {label}
                  </button>
                  <button
                    className="s-btn"
                    disabled={busy || !allowed}
                    onClick={async () => {
                      setBusy(true);
                      setError("");
                      try {
                        await send({
                          type: "agentRules.remove",
                          channel,
                          slot,
                          expectedId: file.id,
                        });
                        setMessage(`${label} removed from ${channel}.`);
                      } catch (e) {
                        setError(
                          e instanceof Error
                            ? e.message
                            : "Could not remove file.",
                        );
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Remove {label}
                  </button>
                </>
              ) : (
                <p>
                  No {label.toLowerCase()} file uploaded for {channel}.
                </p>
              )}
              <label className="s-field">
                {file ? "Replace" : "Upload"} {label}
                <input
                  aria-label={`Upload ${label} file`}
                  type="file"
                  accept={
                    slot === "context" && channel === "LinkedIn"
                      ? ".md"
                      : ".docx,.pdf,.txt,.md"
                  }
                  disabled={busy || !allowed}
                  onChange={(event) => {
                    const selected = event.target.files?.[0];
                    event.target.value = "";
                    if (selected) void upload(slot, selected);
                  }}
                />
              </label>
            </article>
          );
        })}
          {editor?.kind === "file" && !packageDraft && editor.resource?.slot &&
            editor.resource.slot !== "instructions" && editor.resource.slot !== "context" && (
              <WritingResources state={state} channel={channel} send={send} allowed={allowed} slot={editor.resource.slot} />
            )}
          {editor?.kind === "voice" && (
            <AgentVoiceLibrary key={channel} state={state} actor={actor} channel={channel}
              local={local} send={send} entryId={editor.resource?.id} />
          )}
        </div>
      </dialog>
    </section>
  );
}
