export function budgetMonth(instant: string, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date(instant));
  return `${parts.find((p) => p.type === "year")!.value}-${parts.find((p) => p.type === "month")!.value}`;
}
function wallParts(instant: number, timezone: string) {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(instant));
  const v = (t: string) => Number(p.find((v) => v.type === t)!.value);
  return Date.UTC(
    v("year"),
    v("month") - 1,
    v("day"),
    v("hour"),
    v("minute"),
    v("second"),
  );
}
export function nextOccurrence(
  instant: string,
  timezone: string,
  days: number,
  now = instant,
) {
  if (![1, 7].includes(days))
    throw new Error("Unsupported recurring interval.");
  let wall = wallParts(Date.parse(instant), timezone) + days * 86400000;
  for (let occurrence = 0; occurrence < 10000; occurrence++) {
    let candidate = wall,
      valid = false;
    for (let i = 0; i < 5; i++) {
      const delta = wall - wallParts(candidate, timezone);
      if (!delta) {
        valid = true;
        break;
      }
      candidate += delta;
    }
    if (!valid)
      throw new Error(
        "The next local schedule time is invalid across daylight saving. Reschedule explicitly.",
      );
    if (candidate > Date.parse(now)) return new Date(candidate).toISOString();
    wall += days * 86400000;
  }
  throw new Error(
    "The recurring schedule is too old. Reschedule it explicitly.",
  );
}
