"use client";
import { useMemo, useRef, useState } from "react";
import type { Actor, Command, StudioState } from "@/lib/studio/types";
import { ACTIVE_CHANNELS } from "@/lib/studio/active-channels";
import { can } from "@/lib/studio/permissions";
import { pipelineIdentity } from "@/lib/studio/pipeline";
import {
  CALENDAR_FIELDS,
  calendarTemplate,
  previewCalendar,
  readCalendarWorkbook,
  suggestMapping,
  type CalendarField,
  type CalendarWorkbook,
  type ColumnMapping,
} from "@/lib/studio/calendar-workbook";
import "./pipeline.css";
const emptyMapping = () =>
  Object.fromEntries(
    Object.keys(CALENDAR_FIELDS).map((k) => [k, -1]),
  ) as ColumnMapping;
function download(bytes: Uint8Array, name: string) {
  const url = URL.createObjectURL(
    new Blob([new Uint8Array(bytes)], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function CalendarImport({
  state,
  actor,
  send,
  onImported,
}: {
  state: StudioState;
  actor: Actor;
  send: (c: Command) => Promise<unknown>;
  onImported: (date?: string) => void;
}) {
  const [book, setBook] = useState<CalendarWorkbook>(),
    [fileName, setFileName] = useState(""),
    [sheetIndex, setSheetIndex] = useState(0),
    [headerRow, setHeaderRow] = useState(1),
    [mapping, setMapping] = useState<ColumnMapping>(emptyMapping),
    [step, setStep] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [timezone, setTimezone] = useState(
      state.settings.timezone || "America/New_York",
    ),
    [defaultChannel, setDefaultChannel] =
      useState<(typeof ACTIVE_CHANNELS)[number]>("LinkedIn"),
    [override, setOverride] = useState(""),
    [selected, setSelected] = useState<Record<string, boolean>>({}),
    [updates, setUpdates] = useState<Record<string, boolean>>({});
  const key = useRef(crypto.randomUUID());
  const sheet = book?.sheets[sheetIndex],
    headers = sheet?.rows.find((r) => r.number === headerRow)?.values || [];
  const rows = useMemo(
    () =>
      sheet
        ? previewCalendar(sheet, mapping, {
            date1904: book!.date1904,
            timezone,
            defaultChannel,
            headerRow,
            channelOverride: override
              ? (override as typeof defaultChannel)
              : undefined,
          })
        : [],
    [sheet, mapping, book, timezone, defaultChannel, headerRow, override],
  );
  const permitted = (channel: string, account: string) =>
    can(state, actor, "idea.edit", {
      channel: channel as typeof defaultChannel,
      account,
    }) &&
    can(state, actor, "schedule.manage", {
      channel: channel as typeof defaultChannel,
      account,
    });
  const existing = (row: NonNullable<(typeof rows)[number]["data"]>) =>
    state.pipelineBriefs?.find(
      (b) => b.identity === pipelineIdentity(fileName, row),
    );
  function useSheet(book: CalendarWorkbook, index: number) {
    const s = book.sheets[index];
    const header =
      s.rows.slice(0, 10).find((r) => suggestMapping(r.values).title >= 0) ||
      s.rows[0];
    setSheetIndex(index);
    setHeaderRow(header?.number || 1);
    setMapping(header ? suggestMapping(header.values) : emptyMapping());
    setStep(1);
    setSelected({});
    setUpdates({});
    setOverride("");
    setError("");
  }
  async function file(file?: File) {
    if (!file) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (!/\.xlsx$/i.test(file.name))
        throw Error(
          "Choose an .xlsx workbook. Save older .xls files as XLSX first.",
        );
      const b = await readCalendarWorkbook(await file.arrayBuffer());
      setBook(b);
      setFileName(file.name);
      key.current = crypto.randomUUID();
      useSheet(b, 0);
    } catch (e) {
      setBook(undefined);
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function template() {
    try {
      download(
        await calendarTemplate(),
        "RyzaLab-Content-Calendar-Template.xlsx",
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function preview() {
    setError("");
    if (mapping.title < 0) {
      setError("Map Working title before previewing.");
      return;
    }
    if (rows.length > 500) {
      setError(
        "Import at most 500 titled rows at a time. Split this sheet first.",
      );
      return;
    }
    key.current = crypto.randomUUID();
    setSelected(
      Object.fromEntries(
        rows.map((r) => [
          r.key,
          Boolean(
            r.data &&
            !r.error &&
            !r.warning?.startsWith("LinkedIn only") &&
            permitted(r.data.channel, r.data.account),
          ),
        ]),
      ),
    );
    setUpdates({});
    setStep(2);
  }
  async function confirm() {
    setBusy(true);
    setError("");
    try {
      const chosen = rows.filter((r) => r.data && selected[r.key]);
      if (!chosen.length) throw Error("Select at least one valid row.");
      const response = await send({
        type: "pipeline.import",
        fileName,
        requestKey: key.current,
        rows: chosen.map((r) => ({
          data: r.data!,
          update: Boolean(updates[r.key]),
          expectedVersion: existing(r.data!)?.version,
        })),
      });
      const receipt = (
        response as { state: StudioState }
      ).state.pipelineImports?.find((i) => i.requestKey === key.current);
      setMessage(
        `Imported ${receipt?.created || 0} new briefs; updated ${receipt?.updated || 0}; ${receipt?.skipped || 0} existing duplicates skipped. No content generated or published.`,
      );
      onImported(chosen.find((r) => r.data?.plannedDate)?.data?.plannedDate);
      setStep(0);
      setBook(undefined);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="s-panel pipeline-import"
      aria-label="Import content calendar"
    >
      <div className="s-section-heading">
        <div>
          <h2>Import your content calendar</h2>
          <p>
            Excel → dated calendar briefs + Existing Pipeline in Ideas and
            Create.
          </p>
        </div>
        <button className="s-btn" onClick={() => void template()}>
          Download XLSX template
        </button>
      </div>
      <p className="s-muted">
        Import plans and historical notes only. Nothing is approved, generated
        or published by an upload. Import each worksheet separately.
      </p>
      {message && (
        <p role="status" className="pipeline-notice">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="s-error">
          {error}
        </p>
      )}
      <label className="pipeline-file">
        Upload Excel calendar (.xlsx · up to 5 MB)
        <input
          type="file"
          accept=".xlsx"
          disabled={busy}
          onChange={(e) => {
            void file(e.target.files?.[0]);
            e.currentTarget.value = "";
          }}
        />
      </label>
      {busy && (
        <p role="status">
          {step === 2 ? "Saving the selected briefs…" : "Reading workbook…"}
        </p>
      )}
      {book && (
        <>
          <p className="pipeline-steps">
            1. Upload →{" "}
            <strong>
              {step === 1 ? "2. Map columns" : "3. Review & import"}
            </strong>
          </p>
          {step === 1 ? (
            <>
              <div className="pipeline-fields">
                <label>
                  Worksheet
                  <select
                    value={sheetIndex}
                    onChange={(e) => useSheet(book, Number(e.target.value))}
                  >
                    {book.sheets.map((s, i) => (
                      <option key={i} value={i}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Header row
                  <input
                    type="number"
                    min="1"
                    value={headerRow}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      setHeaderRow(n);
                      setMapping(
                        suggestMapping(
                          sheet?.rows.find((r) => r.number === n)?.values || [],
                        ),
                      );
                    }}
                  />
                </label>
                <label>
                  Default timezone
                  <input
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                  />
                </label>
                <label>
                  Channel for empty destinations
                  <select
                    value={defaultChannel}
                    onChange={(e) =>
                      setDefaultChannel(e.target.value as typeof defaultChannel)
                    }
                  >
                    {ACTIVE_CHANNELS.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Explicit destination remapping
                  <select
                    value={override}
                    onChange={(e) => setOverride(e.target.value)}
                  >
                    <option value="">Keep each row’s supported channel</option>
                    {ACTIVE_CHANNELS.map((c) => (
                      <option key={c} value={c}>
                        Map ALL rows to {c}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="pipeline-fields">
                {Object.entries(CALENDAR_FIELDS).map(([field, label]) => (
                  <label key={field}>
                    {label}
                    {field === "title" ? " *" : ""}
                    <select
                      value={mapping[field as CalendarField]}
                      onChange={(e) =>
                        setMapping({
                          ...mapping,
                          [field]: Number(e.target.value),
                        })
                      }
                    >
                      <option value={-1}>Not mapped</option>
                      {headers.map((h, i) => (
                        <option key={i} value={i}>
                          {h || `Column ${i + 1}`}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              <p className="s-muted">
                {rows.length} titled rows found. Empty/formatted rows and
                formulas are ignored. Unknown destinations must be mapped or
                skipped.
              </p>
              <button
                className="s-btn s-primary"
                disabled={busy}
                onClick={preview}
              >
                Preview import
              </button>
            </>
          ) : (
            <>
              <div className="pipeline-table">
                <table>
                  <thead>
                    <tr>
                      <th>Include</th>
                      <th>Source row / brief</th>
                      <th>Destination</th>
                      <th>Date / time / timezone</th>
                      <th>Validation / duplicates</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const prior = r.data ? existing(r.data) : undefined,
                        linked =
                          prior &&
                          state.contents.some(
                            (c) =>
                              c.pipelineBriefId === prior.id && !c.deletedAt,
                          ),
                        allowed =
                          r.data && permitted(r.data.channel, r.data.account);
                      return (
                        <tr key={r.key}>
                          <td>
                            <input
                              type="checkbox"
                              aria-label={`Include row ${r.row}`}
                              checked={Boolean(selected[r.key])}
                              disabled={!r.data || !allowed || busy}
                              onChange={(e) =>
                                setSelected({
                                  ...selected,
                                  [r.key]: e.target.checked,
                                })
                              }
                            />
                          </td>
                          <td>
                            <small>
                              {sheet?.name} · Row {r.row}
                            </small>
                            <strong>{r.data?.title || "Invalid row"}</strong>
                            <p>{r.data?.angle}</p>
                          </td>
                          <td>
                            {r.data?.channel}
                            <br />
                            {r.data?.account}
                          </td>
                          <td>
                            {r.data?.plannedDate || "Unscheduled"}
                            <br />
                            {r.data?.plannedTime || "No time"}
                            <br />
                            {r.data?.timezone}
                          </td>
                          <td>
                            {r.error && <p className="s-error">{r.error}</p>}
                            {r.warning && <p>{r.warning}</p>}
                            {r.data && !allowed && (
                              <p>
                                No permission to import into this destination.
                              </p>
                            )}
                            {prior && (
                              <>
                                <p>
                                  Existing brief · v{prior.version} · skipped by
                                  default.
                                </p>
                                <label>
                                  <input
                                    type="checkbox"
                                    checked={Boolean(updates[r.key])}
                                    disabled={Boolean(linked) || busy}
                                    onChange={(e) =>
                                      setUpdates({
                                        ...updates,
                                        [r.key]: e.target.checked,
                                      })
                                    }
                                  />{" "}
                                  Update brief only
                                </label>
                                {linked && (
                                  <p>
                                    Linked draft exists — update protected.
                                    Existing writing stays intact.
                                  </p>
                                )}
                              </>
                            )}
                            {!prior && r.data && (
                              <p>
                                New pipeline brief
                                {r.data.historical ? " · historical" : ""}
                              </p>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {!rows.length && (
                <p>
                  No titled rows. Check the worksheet, header row and title
                  mapping.
                </p>
              )}
              <div className="s-actions">
                <button
                  className="s-btn"
                  disabled={busy}
                  onClick={() => setStep(1)}
                >
                  Back to mapping
                </button>
                <button
                  className="s-btn s-primary"
                  disabled={
                    busy || !rows.some((r) => r.data && selected[r.key])
                  }
                  onClick={() => void confirm()}
                >
                  Confirm import ·{" "}
                  {rows.filter((r) => r.data && selected[r.key]).length}{" "}
                  selected
                </button>
              </div>
              <p className="s-muted">
                Combined Website + LinkedIn rows require inclusion explicitly;
                only LinkedIn is imported. Original destination/status remain
                unverified notes. Historical published records are never queued
                for publishing.
              </p>
            </>
          )}
        </>
      )}
      {!!state.pipelineImports?.length && (
        <details>
          <summary>Import history ({state.pipelineImports.length})</summary>
          {state.pipelineImports.slice(0, 10).map((i) => (
            <p key={i.id}>
              <strong>{i.fileName}</strong> · {new Date(i.at).toLocaleString()}{" "}
              · {i.created} new / {i.updated} updated / {i.skipped} skipped
            </p>
          ))}
        </details>
      )}
    </section>
  );
}
