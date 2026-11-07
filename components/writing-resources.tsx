"use client";
import { useState } from "react";
import type {
  AgentFileSlot,
  AgentRuleFile,
} from "@/lib/studio/agent-rule-files";
import type { Channel, Command, StudioState } from "@/lib/studio/types";
const resources: {
  slot: AgentFileSlot;
  title: string;
  description: string;
  template: string;
}[] = [
  {
    slot: "humanizer",
    title: "Ryan’s Humanizer",
    description:
      "Upload the actual writing guidance. It shapes style without inventing facts or personal experiences.",
    template: "",
  },
  {
    slot: "research_instructions",
    title: "Research Instructions",
    description:
      "Guides evidence analysis for new ideas and writing when sources are selected. Structured Source Preferences drive public discovery; this private file is not sent as a public query.",
    template:
      "# Research instructions\nPrioritize construction, real estate, home automation and IoT sources relevant to the question. Seek original evidence and contrary findings. Exclude Wikipedia completely. Distinguish article text, snippets and transcripts; never invent source access.",
  },
  {
    slot: "source_preferences",
    title: "Source Preferences",
    description:
      "Preferred/excluded domains and research depth. Wikipedia remains excluded regardless of preferences.",
    template: JSON.stringify(
      {
        preferredDomains: [],
        excludedDomains: [],
        sectors: ["construction", "real estate", "home automation", "IoT"],
        depth: "deep",
      },
      null,
      2,
    ),
  },
  {
    slot: "newsletter_structure",
    title: "Blog / newsletter structure",
    description:
      "Section order, headings, background, main stories, practical analysis, source placement and optional image slots.",
    template:
      "# Content structure\nTitle and preview\nIntroduction and background\nMain findings with evidence\nAdditional related stories when supplied\nPractical implications\nLimitations\nSources\nConclusion / approved CTA",
  },
  {
    slot: "newsletter_layout",
    title: "Blog / newsletter export layout",
    description:
      "Editable layout settings for PDF/DOCX. Use the JSON template; uploaded DOCX/PDF examples are reference guidance, not guaranteed exact visual replicas.",
    template: JSON.stringify(
      {
        font: "Arial",
        bodySize: 11,
        marginMm: 20,
        lineSpacing: 1.3,
        header: "RyzaLab",
        footer: "",
        pageSize: "A4",
      },
      null,
      2,
    ),
  },
];
function download(file: Pick<AgentRuleFile, "base64" | "fileName">) {
  const bytes = Uint8Array.from(atob(file.base64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes]));
  const a = document.createElement("a");
  a.href = url;
  a.download = file.fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function WritingResources({
  state,
  channel,
  send,
  allowed,
}: {
  state: StudioState;
  channel: Channel;
  send: (c: Command) => Promise<unknown>;
  allowed: boolean;
}) {
  const [editing, setEditing] = useState<AgentFileSlot>(),
    [text, setText] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function save(slot: AgentFileSlot, file: File) {
    setBusy(true);
    setMessage("");
    try {
      if (
        !/\.(md|txt|pdf|docx)$/i.test(file.name) ||
        file.size < 1 ||
        file.size > 262144
      )
        throw Error("Use a nonempty MD/TXT/PDF/DOCX up to 256 KB.");
      const binary = Array.from(new Uint8Array(await file.arrayBuffer()), (c) =>
        String.fromCharCode(c),
      ).join("");
      const previous = state.agentRuleFiles?.find(
        (f) => f.channel === channel && f.slot === slot,
      );
      const response = await send({
        type: "agentRules.save",
        channel,
        slot,
        fileName: file.name,
        byteSize: file.size,
        base64: btoa(binary),
        extractedText: /\.(md|txt)$/i.test(file.name)
          ? await file.text()
          : undefined,
        expectedId: previous?.id,
      });
      setEditing(undefined);
      const extracted = (
        response as { state?: StudioState }
      )?.state?.agentRuleFiles?.find(
        (f) => f.channel === channel && f.slot === slot,
      )?.extractedText;
      setMessage(
        extracted
          ? "Resource saved. New applicable requests use this version; existing requests keep their snapshots."
          : "Original saved, but text extraction is not available in this preview. Use a live workspace or upload MD/TXT guidance.",
      );
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="s-panel"
      style={{ padding: 20, marginTop: 24 }}
      aria-label="Research and writing resources"
    >
      <h2>Research, Humanizer and long-form templates</h2>
      <p>
        Resources for {channel}. Original downloads and the previous three file
        versions remain available. No AI request starts when you upload.
      </p>
      {message && <p role="status">{message}</p>}
      {resources.map((resource) => {
        const file = state.agentRuleFiles?.find(
          (f) => f.channel === channel && f.slot === resource.slot,
        );
        return (
          <details
            key={resource.slot}
            style={{
              marginTop: 18,
              padding: 14,
              border: "1px solid var(--s-line)",
              borderRadius: 8,
            }}
          >
            <summary>
              {resource.title} · {file ? "Saved" : "Not uploaded"}
            </summary>
            <p>{resource.description}</p>
            {file && (
              <p>
                {file.fileName} · {new Date(file.uploadedAt).toLocaleString()} ·{" "}
                {file.byteSize} bytes
              </p>
            )}
            <div className="s-actions">
              {file && (
                <button className="s-btn" onClick={() => download(file)}>
                  Download original
                </button>
              )}
              <button
                className="s-btn"
                disabled={!allowed || busy}
                onClick={() => {
                  setEditing(resource.slot);
                  setText(file?.extractedText || resource.template);
                }}
              >
                Edit guidance
              </button>
              <label className="s-btn">
                Upload
                <input
                  type="file"
                  accept=".md,.txt,.pdf,.docx"
                  disabled={!allowed || busy}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void save(resource.slot, f);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
            </div>
            {editing === resource.slot && (
              <>
                <label className="s-field">
                  Guidance / structure
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={10}
                  />
                </label>
                <button
                  className="s-btn"
                  disabled={busy || !text.trim()}
                  onClick={() =>
                    void save(
                      resource.slot,
                      new File([text], `${resource.slot}.md`, {
                        type: "text/markdown",
                      }),
                    )
                  }
                >
                  Save guidance
                </button>
              </>
            )}
            {!!file?.history?.length && (
              <details>
                <summary>Previous versions</summary>
                {file.history.map((old) => (
                  <p key={old.id}>
                    {old.fileName} · {new Date(old.uploadedAt).toLocaleString()}{" "}
                    <button className="s-btn" onClick={() => download(old)}>
                      Download version
                    </button>
                  </p>
                ))}
              </details>
            )}
          </details>
        );
      })}
    </section>
  );
}
