"use client";
import { useState } from "react";
import type { Channel, StudioState } from "@/lib/studio/types";
import type { PipelineBrief } from "@/lib/studio/pipeline";
import "./pipeline.css";
export function ExistingPipeline({
  state,
  channel,
  onIdeas,
  onWrite,
  onImport,
  disabled,
  initialId,
}: {
  initialId?: string;
  state: StudioState;
  channel: Channel | "All channels";
  onIdeas: (
    b: PipelineBrief,
    mode: "generate" | "manual",
    channel: Channel,
  ) => void;
  onWrite: (b: PipelineBrief, channel: Channel) => void;
  onImport: () => void;
  disabled: boolean;
}) {
  const [search, setSearch] = useState(""),
    [selected, setSelected] = useState(initialId || ""),
    [target, setTarget] = useState<Channel | "">("");
  const briefs = (state.pipelineBriefs || []).filter(
    (b) =>
      (channel === "All channels" || b.channel === channel) &&
      `${b.title} ${b.angle} ${b.externalId}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const brief = briefs.find((b) => b.id === selected) || briefs[0];
  const actual =
    target === ""
      ? channel === "All channels"
        ? brief?.channel || "LinkedIn"
        : channel
      : target;
  return (
    <section
      className="s-panel existing-pipeline"
      aria-label="Existing Pipeline"
    >
      <div className="s-section-heading">
        <div>
          <h2>Existing Pipeline</h2>
          <p>Select an imported brief, then develop ideas or write directly.</p>
        </div>
        <button className="s-text-button" onClick={onImport}>
          Import calendar
        </button>
      </div>
      {!(state.pipelineBriefs || []).length ? (
        <p>
          Your imported calendar titles and angles will appear here. You can
          also start with AI or add an idea manually.
        </p>
      ) : (
        <>
          <div className="pipeline-fields">
            <label>
              Search titles and angles
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Existing Pipeline"
              />
            </label>
            <label>
              Choose a pipeline brief
              <select
                value={brief?.id || ""}
                onChange={(e) => setSelected(e.target.value)}
              >
                {!briefs.length && <option value="">No matching briefs</option>}
                {briefs.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.externalId || `Row ${b.row}`} · {b.title} · {b.channel} ·{" "}
                    {b.plannedDate || "Unscheduled"}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Create for
              <select
                value={actual}
                onChange={(e) => setTarget(e.target.value as Channel)}
              >
                {[
                  ...new Set([
                    brief?.channel || "LinkedIn",
                    "LinkedIn",
                    "Newsletter",
                  ]),
                ].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
          </div>
          {brief && (
            <>
              <p>{brief.angle || "No angle supplied."}</p>
              <p className="s-muted">
                {brief.plannedDate || "Unscheduled"} {brief.plannedTime} ·{" "}
                {brief.timezone} · {brief.account} · {brief.sourceFile} /{" "}
                {brief.sheet}, row {brief.row}
                {brief.historical ? " · Historical record" : ""}
              </p>
              <div className="s-actions">
                <button
                  className="s-btn"
                  disabled={disabled}
                  onClick={() => onIdeas(brief, "generate", actual)}
                >
                  Generate ideas from brief
                </button>
                <button
                  className="s-btn"
                  disabled={disabled}
                  onClick={() => onIdeas(brief, "manual", actual)}
                >
                  Add idea manually
                </button>
                <button
                  className="s-btn s-primary"
                  disabled={disabled}
                  onClick={() => onWrite(brief, actual)}
                >
                  Write directly
                </button>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
