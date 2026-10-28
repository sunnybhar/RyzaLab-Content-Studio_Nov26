"use client";
import { useState } from "react";
import type { StudioState, Channel } from "@/lib/studio/types";
import { studioAnalytics } from "@/lib/studio/analytics";
const currency = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    v / 100,
  );
export function StudioAnalytics({
  state,
  channel,
}: {
  state: StudioState;
  channel: Channel | "All channels";
}) {
  const [days, setDays] = useState(30);
  const data = studioAnalytics(state, channel, days);
  const peak = Math.max(
    1,
    ...data.activity.map((d) => d.publications + d.approvals),
  );
  return (
    <div className="s-analytics">
      <p className="s-info-strip">
        Metrics use records visible to your profile. Published means a human
        recorded a live URL; Studio has not independently verified reach or
        engagement.
      </p>
      <div className="s-metrics-grid">
        {[
          ["Content items", data.contents],
          ["In human review", data.inReview],
          ["Approved content", data.approvedContents],
          ["Published content", data.published],
          ["Planned publications", data.planned],
          ["Open planning tasks", data.taskCount],
        ].map(([label, value]) => (
          <article className="s-panel s-analytics-metric" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
      <section className="s-panel s-analytics-section">
        <div className="s-section-heading">
          <h2>Activity</h2>
          <label>
            Activity period
            <select
              aria-label="Activity period"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </label>
        </div>
        <p>
          {data.updated} items updated · {data.periodApprovals} approval
          snapshots · {data.periodPublications} human publication confirmations
          in this period. Current inventory totals above include all time.
        </p>
        <div
          className="s-activity-chart"
          role="img"
          aria-label={`${data.periodApprovals} approvals and ${data.periodPublications} publications during the last ${days} days. Daily totals in the table below.`}
        >
          {data.activity.map((day) => (
            <div
              key={day.date}
              title={`${day.date}: ${day.approvals} approvals, ${day.publications} publications`}
            >
              <span style={{ height: `${(100 * day.approvals) / peak}%` }} />
              <i style={{ height: `${(100 * day.publications) / peak}%` }} />
            </div>
          ))}
        </div>
        <p className="s-chart-legend">
          Teal: approval snapshots · Blue: publication confirmations · Daily
          dates in UTC
        </p>
        <details>
          <summary>View daily activity data</summary>
          <div className="s-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Date (UTC)</th>
                  <th>Approval snapshots</th>
                  <th>Publications</th>
                </tr>
              </thead>
              <tbody>
                {data.activity.map((d) => (
                  <tr key={d.date}>
                    <td>{d.date}</td>
                    <td>{d.approvals}</td>
                    <td>{d.publications}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>
      <section className="s-panel s-analytics-section">
        <h2>Content by channel</h2>
        <div className="s-table-scroll">
          <table>
            <thead>
              <tr>
                <th>Channel</th>
                <th>Content</th>
                <th>Approved content</th>
                <th>Published content</th>
              </tr>
            </thead>
            <tbody>
              {data.channels.map((row) => (
                <tr key={row.channel}>
                  <th scope="row">{row.channel}</th>
                  <td>{row.content}</td>
                  <td>{row.approved}</td>
                  <td>{row.published}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <div className="s-analytics-columns">
        <section className="s-panel s-analytics-section">
          <h2>Next required checks</h2>
          {data.bottlenecks.length ? (
            data.bottlenecks.map((row) => (
              <p key={row.stage} className="s-analytics-row">
                <span>{row.stage}</span>
                <strong>{row.count}</strong>
              </p>
            ))
          ) : (
            <p>No pending content checks.</p>
          )}
          <p>
            {data.changes} changes requested · {data.blocked} blocked
            publication tasks
          </p>
        </section>
        <section className="s-panel s-analytics-section">
          <h2>AI usage and cost</h2>
          <p className="s-analytics-row">
            <span>Recorded actual cost</span>
            <strong>{currency(data.actualCost)}</strong>
          </p>
          <p className="s-analytics-row">
            <span>Budget reservations</span>
            <strong>{currency(data.reserved)}</strong>
          </p>
          <p>
            {data.jobs} jobs · {data.failedJobs} failed or uncertain outcomes
          </p>
          <small>
            Reservations are budget holds, not confirmed charges. Actual cost
            appears only when reconciled; zero does not prove a provider charged
            nothing.
          </small>
        </section>
      </div>
      <section className="s-panel s-analytics-section">
        <h2>Social performance</h2>
        <p>
          Views, impressions, clicks, followers and engagement:{" "}
          <strong>Not connected</strong>. No social performance numbers are
          estimated or fabricated.
        </p>
      </section>
    </div>
  );
}
