"use client";
import { useEffect, useRef, useState, type ComponentType } from "react";
import type { Package, StudioState } from "@/lib/studio/types";
import {
  filterHistory,
  historyRecords,
  type HistoryRecord,
} from "@/lib/studio/review-history";
import { SlideLayerPreview } from "./slide-layers";
export function ReviewHistory({
  state,
  AssetMedia,
  onPlan,
  onExport,
}: {
  state: StudioState;
  AssetMedia: ComponentType<{
    source: string;
    kind?: "image" | "video" | "audio";
  }>;
  onPlan: (pkg: Package) => void;
  onExport: (pkg: Package) => void;
}) {
  const [status, setStatus] = useState<"published" | "approved">("published"),
    [period, setPeriod] = useState("latest"),
    [limit, setLimit] = useState(20),
    [selected, setSelected] = useState<HistoryRecord>();
  const records = filterHistory(
      historyRecords(state, status),
      period,
      state.settings.timezone,
    ),
    date = (at: string) =>
      new Intl.DateTimeFormat("en-US", {
        timeZone: state.settings.timezone,
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(at));
  return (
    <section
      className="s-panel s-review-history"
      aria-label="Approved and published history"
    >
      <div className="s-section-heading">
        <div>
          <h2>Approved & Published</h2>
          <p>Across all channels · {state.settings.timezone}</p>
        </div>
      </div>
      <div className="pipeline-fields" style={{ padding: "0 20px" }}>
        <label>
          Status
          <select
            aria-label="Status" value={status}
            onChange={(e) => {
              setStatus(e.target.value as typeof status);
              setLimit(20);
            }}
          >
            <option value="published">Published</option>
            <option value="approved">Approved / awaiting publication</option>
          </select>
        </label>
        <label>
          {status === "published" ? "Published" : "Approved"} in
          <select
            aria-label={status === "published" ? "Published in" : "Approved in"} value={period}
            onChange={(e) => {
              setPeriod(e.target.value);
              setLimit(20);
            }}
          >
            <option value="latest">Latest 10</option>
            {[1, 2, 3, 6, 12].map((n) => (
              <option key={n} value={n}>
                Last {n} {n === 1 ? "month" : "months"}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p style={{ padding: "0 20px" }}>
        {period === "latest" ? "Latest" : "Matching"} {records.length}{" "}
        {status === "published" ? "published items" : "approved packages"}
      </p>
      {!records.length && (
        <p style={{ padding: "20px" }}>
          No {status} content in this range. Approval, scheduling and exports do
          not count as publication.
        </p>
      )}
      {records.slice(0, limit).map((r) => (
        <div className="s-list-row" key={r.id}>
          <div>
            <strong>
              {r.package?.title ||
                "Publication record — saved package unavailable"}
            </strong>
            <p>
              {date(r.at)} · {r.package?.channel || "Unknown channel"} ·{" "}
              {r.package?.format || "Content"} ·{" "}
              {r.status === "published"
                ? "Published (recorded)"
                : "Approved, not published"}
            </p>
          </div>
          <div className="s-actions">
            <button
              className="s-btn"
              disabled={!r.package}
              onClick={() => setSelected(r)}
            >
              Preview
            </button>
            {r.package && r.status === "approved" && (
              <button className="s-btn" onClick={() => onPlan(r.package!)}>
                Plan publication
              </button>
            )}
            {r.package && (
              <button className="s-btn" onClick={() => onExport(r.package!)}>
                Download package
              </button>
            )}
          </div>
        </div>
      ))}
      {records.length > limit && (
        <button
          className="s-btn"
          style={{ margin: 20 }}
          onClick={() => setLimit((n) => n + 20)}
        >
          Load more
        </button>
      )}
      {selected && (
        <HistoryPreview
          record={selected}
          date={date}
          AssetMedia={AssetMedia}
          close={() => setSelected(undefined)}
        />
      )}
    </section>
  );
}
function HistoryPreview({
  record: r,
  date,
  AssetMedia,
  close,
}: {
  record: HistoryRecord;
  date: (s: string) => string;
  AssetMedia: ComponentType<{
    source: string;
    kind?: "image" | "video" | "audio";
  }>;
  close: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
    return () => dialog.current?.close();
  }, []);
  const p = r.package!;
  return (
    <dialog
      ref={dialog}
      className="s-review-dialog"
      aria-label="Saved content preview"
      onClose={close}
    >
      <div className="s-review-dialog-heading">
        <h2>{p.title}</h2>
        <button className="s-btn" onClick={close}>
          Close preview
        </button>
      </div>
      <div className="s-review-dialog-body">
        <p>
          {p.channel} · {p.format || "Content"} · Revision {p.revision} ·{" "}
          {r.status === "published" ? "Published" : "Approved"} {date(r.at)}
        </p>
        <p>This is the saved approved package, not a later editable draft.</p>
        <div style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
          {p.text}
        </div>
        {p.media.imageUrl && <AssetMedia source={p.media.imageUrl} />}{" "}
        {p.media.slides.map((s) => (
          <section key={s.id}>
            <h3>{s.title}</h3>
            <p>{s.body}</p>
            {s.image && <AssetMedia source={s.image} />}
            <div className="s-slide-preview">
              {s.layers?.map((layer) => (
                <SlideLayerPreview
                  key={layer.id}
                  layer={layer}
                  selected={false}
                  onSelect={() => {}}
                  onMove={() => {}}
                  readOnly
                />
              ))}
            </div>
          </section>
        ))}
        {p.media.scenes.map((s) => (
          <section key={s.id}>
            <h3>{s.title}</h3>
            <p>{s.script}</p>
            {s.sourceUrl && <AssetMedia source={s.sourceUrl} kind="video" />}
            {s.audioUrl && <AssetMedia source={s.audioUrl} kind="audio" />}
          </section>
        ))}
        {r.schedule?.publicationUrl && (
          <a
            href={r.schedule.publicationUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open published content
          </a>
        )}
      </div>
    </dialog>
  );
}
