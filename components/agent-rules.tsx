"use client";
import { readAgentPackage } from "@/lib/studio/agent-package";
import { AgentVoiceLibrary } from "./agent-voice-library";
import { useState } from "react";
import {
  CHANNELS,
  type Actor,
  type Channel,
  type Command,
  type StudioState,
} from "@/lib/studio/types";
import { can } from "@/lib/studio/permissions";
export function AgentRules({
  state,
  actor,
  send,
}: {
  state: StudioState;
  actor: Actor;
  send: (command: Command) => Promise<unknown>;
}) {
  const [channel, setChannel] = useState<Channel>("LinkedIn"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [packageDraft, setPackageDraft] = useState<{
    instructions: string;
    context: string;
    files: string[];
    ignored: string[];
    expectedInstructionsId?: string;
    expectedContextId?: string;
  } | null>(null);
  const allowed = can(state, actor, "workflow.edit", { channel });
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
  function download(file: NonNullable<StudioState["agentRuleFiles"]>[number]) {
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
      <h2>Instructions and Context</h2>
      <p>
        Store two separate files for each channel: how its agent should work,
        and the background it will need. New idea and writing requests use the
        saved channel files. Upload Instructions and Markdown context
        separately.
      </p>
      <label className="s-field">
        Social channel
        <select
          aria-label="Agent Rules channel"
          value={channel}
          disabled={busy}
          onChange={(event) => {
            setChannel(event.target.value as Channel);
            setPackageDraft(null);
            setError("");
            setMessage("");
          }}
        >
          {CHANNELS.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </label>
      <section
        className="s-panel s-panel-padding"
        aria-label="Upload agent ZIP package"
      >
        <h3>Upload or edit a channel package</h3>
        <p>
          Upload your ZIP whenever required. Preview and edit Instructions and
          context before saving to {channel}. Hub packages can be used for
          Newsletter. INSTRUCTIONS.md (or 00-START-HERE-agent-instructions.md) and knowledge/*.md are imported; macOS metadata is excluded.
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
      </section>
      <div className="s-agent-rule-grid">
        {(["instructions", "context"] as const).map((slot) => {
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
                  const draft=packageDraft||{instructions:state.agentRuleFiles?.find(f=>f.channel===channel&&f.slot==="instructions")?.extractedText||"",context:state.agentRuleFiles?.find(f=>f.channel===channel&&f.slot==="context")?.extractedText||"",files:[],ignored:[],expectedInstructionsId:state.agentRuleFiles?.find(f=>f.channel===channel&&f.slot==="instructions")?.id,expectedContextId:state.agentRuleFiles?.find(f=>f.channel===channel&&f.slot==="context")?.id};
                  const instructions=draft.instructions+"\n\n# Skill guidance\n"+skill.instructions,context=draft.context+"\n\n"+skill.context;
                  if(instructions.length>60000||context.length>60000)throw Error("Combined skill and channel material exceeds 60,000 characters per section. Edit older material first.");
                  setPackageDraft({...draft,instructions,context,files:[...draft.files,...skill.files],ignored:[...draft.ignored,...skill.ignored]});
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
      </div>
      <p>
        DOCX, PDF, TXT and Markdown are supported, up to 256 KB per file. The
        original file is preserved for download. New requests use extracted
        text; existing running requests retain their saved context. Scanned PDFs
        need OCR first.
      </p>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      <AgentVoiceLibrary
        key={channel}
        state={state}
        actor={actor}
        channel={channel}
        send={send}
      />
    </section>
  );
}
