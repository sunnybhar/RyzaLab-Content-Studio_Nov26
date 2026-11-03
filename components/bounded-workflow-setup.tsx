"use client";
import { resolvedConnection } from "@/lib/studio/solo-quality";
import { useState } from "react";
import type { StudioState } from "@/lib/studio/types";
export function BoundedWorkflowSetup({
  state,
  request,
  disabled,
  demo,
}: {
  state: StudioState;
  request: (body: unknown) => Promise<unknown>;
  disabled: boolean;
  demo: boolean;
}) {
  const choices = state.connections.filter(
    (c) =>
      c.provider === "anthropic" &&
      c.function === "text" &&
      c.model === "claude-sonnet-5-5" &&
      c.hasKey &&
      c.status !== "disconnected",
  );
  const [selected, setSelected] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [channelChoice, setChannelChoice] = useState<{
    connectionId: string;
    baseline: string;
    value: boolean;
  } | null>(null);
  const defaultId = state.settings.defaultConnections?.text;
  const id = choices.some((c) => c.id === selected)
    ? selected
    : choices.find((c) => c.id === defaultId)?.id || choices[0]?.id || "";
  const channelBindings = ["LinkedIn", "Newsletter"].map((channel) => ({
    active: state.workflows.some(
      (w) => w.channel === channel && w.status === "active",
    ),
    ids: ["ideas", "text", "review"].map((kind) =>
      resolvedConnection(state, channel, kind),
    ),
  }));
  const savedChannels =
    Boolean(id) &&
    channelBindings.every(
      (channel) => channel.active && channel.ids.every((value) => value === id),
    );
  const baseline = JSON.stringify(channelBindings);
  const useChannels =
    channelChoice?.connectionId === id && channelChoice.baseline === baseline
      ? channelChoice.value
      : state.boundedChannelSelection?.connectionId===id?state.boundedChannelSelection.value:savedChannels;
  const unsaved = channelChoice!==null;

  return (
    <section className="s-panel s-panel-padding">
      <h3>Bounded research and writing</h3>
      <p>
        Find public references inside Ideas or Create without a Research key.
        Reuse a stored Claude writing connection for ideas, writing and a second
        review pass. The review uses the same provider; independent-review
        requirements still apply.
      </p>
      <p>
        Setup uses your supplied Sonnet 5.5 prices: $2/M input and $10/M output
        tokens. Each tool-free call is limited to 65,536 input bytes including
        allowance. Writing allows 4,096 output tokens for long newsletters; ideas/review allow 2,048 (at most $0.18 per call rounded up). Your
        monthly, request and total package caps still apply. Explicit channel
        mappings remain in place.
      </p>
      <label className="s-field">
        Writing connection
        <select
          aria-label="Writing connection"
          value={id}
          onChange={(e) => {
            setSelected(e.target.value);
            setChannelChoice(null);
            setMessage("");
          }}
          disabled={busy || disabled}
        >
          {!choices.length && (
            <option value="">
              Add a Claude Sonnet 5.5 Text connection first
            </option>
          )}
          {choices.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </label>
      <label>
        <input
          type="checkbox"
          checked={useChannels}
          disabled={busy || disabled}
          onChange={(e) => {
            setChannelChoice({
              connectionId: id,
              baseline,
              value: e.target.checked,
            });
            setMessage("");
          }}
        />{" "}
        Use this connection for LinkedIn and Newsletter ideas, writing and
        review (replace their existing mappings).
      </label>
      {savedChannels && useChannels && (
        <p role="status">
          Saved for LinkedIn and Newsletter ideas, writing and review.
        </p>
      )}
      {!useChannels && <p>Saving unchecked keeps existing channel mappings. Change individual model mappings in Workflow Settings.</p>}
      {unsaved && (
        <p role="status">
          This selection has not been saved. Click “Check model and enable
          bounded workflow” before leaving this page.
        </p>
      )}
      <button
        className="s-btn"
        disabled={busy || disabled || demo || !id}
        onClick={async () => {
          setBusy(true);
          setMessage("");
          try {
            await request({
              connectionId: id,
              expectedVersion: state.version,
              applyChannels: useChannels,
              channels:
                useChannels && !savedChannels ? ["LinkedIn", "Newsletter"] : [],
            });
            setChannelChoice(null);
            setMessage(
              "Model access checked. Tool-free pricing and guarded limits saved. Capacity uses provider metadata or the supplied dated Sonnet 5.5 documentation. No paid generation was run.",
            );
          } catch (e) {
            setMessage(e instanceof Error ? e.message : "Setup failed.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Checking…" : "Check model and enable bounded workflow"}
      </button>
      {message && <p role="status">{message}</p>}
    </section>
  );
}
