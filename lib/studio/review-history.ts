import type { Package, Schedule, StudioState } from "./types";
export interface HistoryRecord {
  id: string;
  package?: Package;
  schedule?: Schedule;
  at: string;
  status: "published" | "approved";
}
export function historyRecords(
  state: Pick<StudioState, "packages" | "schedules">,
  status: "published" | "approved",
) {
  const published = state.schedules.filter(
    (s) => s.state === "published" && s.confirmedAt && s.publicationUrl,
  );
  const records: HistoryRecord[] =
    status === "published"
      ? published.map((s) => ({
          id: s.id,
          package: state.packages.find((p) => p.id === s.packageId),
          schedule: s,
          at: s.confirmedAt!,
          status: "published",
        }))
      : state.packages
          .filter((p) => !published.some((s) => s.packageId === p.id))
          .map((p) => ({
            id: p.id,
            package: p,
            at: p.approvedAt,
            status: "approved",
          }));
  return records.sort(
    (a, b) => Date.parse(b.at) - Date.parse(a.at) || a.id.localeCompare(b.id),
  );
}
/** Calendar-month lookback, clamping end-of-month dates in the workspace timezone. */
export function historyDateCutoff(
  now: string,
  months: number,
  timezone: string,
) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(now));
  const part = (key: string) =>
    Number(parts.find((p) => p.type === key)!.value);
  const month = part("month") - 1 - months;
  const base = new Date(Date.UTC(part("year"), month, 1));
  const day = Math.min(
    part("day"),
    new Date(
      Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0),
    ).getUTCDate(),
  );
  return `${base.getUTCFullYear()}-${String(base.getUTCMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
export function filterHistory(
  records: HistoryRecord[],
  period: string,
  timezone: string,
  now = new Date().toISOString(),
) {
  if (period === "latest") return records.slice(0, 10);
  const months = Number(period);
  if (![1, 2, 3, 6, 12].includes(months)) return [];
  const cutoff = historyDateCutoff(now, months, timezone),
    localDate = (at: string) => {
      const p = new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(new Date(at));
      return ["year", "month", "day"]
        .map((k) => p.find((x) => x.type === k)!.value)
        .join("-");
    };
  return records.filter(
    (r) => localDate(r.at) >= cutoff && Date.parse(r.at) <= Date.parse(now),
  );
}
