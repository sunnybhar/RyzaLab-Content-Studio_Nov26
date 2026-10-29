"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen, ChevronDown, X } from "lucide-react";
import {
  FUNCTIONS,
  type Actor,
  type Channel,
  type Command,
  type StudioState,
} from "@/lib/studio/types";
import { can } from "@/lib/studio/permissions";

export function WorkflowVersions({
  state,
  actor,
  channel,
  readOnly,
  execute,
  editConnections,
}: {
  state: StudioState;
  actor: Actor;
  channel: Channel;
  readOnly: boolean;
  execute: (command: Command) => unknown;
  editConnections: (id: string) => void;
}) {
  const [reading, setReading] = useState<{
    title: string;
    text: string;
  } | null>(null);
  const reader = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (reading && !reader.current?.open) reader.current?.showModal();
  }, [reading]);
  const versions = state.workflows
    .filter((w) => w.channel === channel)
    .sort((a, b) => b.version - a.version);
  return (
    <div className="s-workflow-versions">
      <p className="s-workflow-order">
        Newest version first · Expand a version to review or activate it.
      </p>
      {versions.map((w) => {
        const bindings = FUNCTIONS.map((kind) => {
          const id =
            w.functionConnections?.[kind] ||
            (kind === "text" ? w.connectionId : "");
          const connection = state.connections.find((c) => c.id === id);
          return { kind, connection };
        });
        const created = new Intl.DateTimeFormat("en-US", {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: state.settings.timezone,
        }).format(new Date(w.createdAt));
        return (
          <details className="s-workflow-version s-workflow-tile" key={w.id}>
            <summary>
              <div className="s-workflow-tile-title">
                <span className="s-workflow-number">Workflow v{w.version}</span>
                <span
                  className={`s-workflow-status s-workflow-status-${w.status}`}
                >
                  {w.status}
                </span>
                <ChevronDown size={18} aria-hidden="true" />
              </div>
              <h3>{w.title}</h3>
              <div className="s-workflow-created">
                {w.channel} · Created{" "}
                <time dateTime={w.createdAt}>{created}</time> (
                {state.settings.timezone})
              </div>
              <div className="s-workflow-models">
                {bindings
                  .filter(
                    (b) => ["text", "ideas"].includes(b.kind) || b.connection,
                  )
                  .map(({ kind, connection }) => (
                    <span key={kind}>
                      <strong>{kind}: </strong>
                      {connection
                        ? `${connection.title}${connection.status === "disconnected" ? " (disconnected)" : ""}`
                        : "Not configured"}
                    </span>
                  ))}
              </div>
              <span className="s-workflow-expand-label">
                View details and actions
              </span>
            </summary>
            <div className="s-workflow-expanded">
              <div className="s-actions">
                <button
                  className="s-btn s-small-btn"
                  disabled={
                    readOnly ||
                    !can(state, actor, "workflow.edit", { channel: w.channel })
                  }
                  onClick={() => editConnections(w.id)}
                >
                  Edit connections
                </button>
                {w.status === "draft" && (
                  <button
                    disabled={readOnly}
                    className="s-btn s-small-btn"
                    onClick={() =>
                      void execute({ type: "workflow.submit", id: w.id })
                    }
                  >
                    Submit for review
                  </button>
                )}
                {w.status === "review" && (
                  <button
                    disabled={
                      readOnly ||
                      !can(state, actor, "workflow.activate", {
                        channel: w.channel,
                      })
                    }
                    className="s-btn s-primary s-small-btn"
                    onClick={() =>
                      void execute({ type: "workflow.activate", id: w.id })
                    }
                  >
                    Approve & activate
                  </button>
                )}
              </div>
              <div className="s-workflow-readers">
                {[
                  ["Audience", w.audience],
                  ["Instructions", w.instructions],
                  ["Guardrails", w.guardrails],
                  ["Output format", w.outputFormat],
                  ["Review checks", w.checks],
                  ["Examples", w.examples],
                ].map(([label, text]) => (
                  <button
                    key={label}
                    className="s-btn"
                    onClick={() =>
                      setReading({
                        title: `Workflow v${w.version} · ${label}`,
                        text: text || "Not configured",
                      })
                    }
                  >
                    <BookOpen size={16} aria-hidden="true" />
                    Read {label.toLowerCase()}
                  </button>
                ))}
              </div>
              <div className="s-binding-list">
                {bindings.map(({ kind, connection }) => (
                  <span key={kind}>
                    <strong>{kind}</strong>
                    {connection
                      ? `${connection.title} · ${connection.model} · ${connection.status}`
                      : "Not configured"}
                  </span>
                ))}
              </div>
              <p className="s-muted">
                {w.references.length} references · Created by {w.createdBy}
              </p>
            </div>
          </details>
        );
      })}
      <dialog
        ref={reader}
        className="s-workflow-reader"
        aria-labelledby="workflow-reader-title"
        onClose={() => setReading(null)}
      >
        <div className="s-workflow-reader-heading">
          <h2 id="workflow-reader-title">{reading?.title}</h2>
          <button
            className="s-icon-button"
            aria-label="Close instruction reader"
            autoFocus
            onClick={() => reader.current?.close()}
          >
            <X size={22} />
          </button>
        </div>
        <div className="s-workflow-reader-copy">{reading?.text}</div>
      </dialog>
    </div>
  );
}
