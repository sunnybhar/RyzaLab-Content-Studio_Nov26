"use client";
import { useState } from "react";
import "./ideas-layout-options.css";
const requests = [
  {
    id: "IDEA-A32F810C",
    date: "Nov 3, 2026 · 10:30 AM",
    brief: "What still works in a smart home when the internet goes down?",
    channel: "LinkedIn",
    ideas: [
      "Your home has two different outage risks",
      "Five questions before connecting a new device",
      "A practical checklist for an offline evening",
    ],
  },
  {
    id: "IDEA-B58D204E",
    date: "Nov 2, 2026 · 4:15 PM",
    brief: "Help families understand privacy and connected nursery devices.",
    channel: "Newsletter",
    ideas: [
      "Privacy starts with a data map of your home",
      "The connected nursery: useful signals and real limits",
    ],
  },
];
const options = [
  {
    name: "1. Group by request",
    subtitle: "Recommended",
    description:
      "Keep each topic, date and request number together. Expand a request to choose from its ideas.",
  },
  {
    name: "2. Compact table",
    subtitle: "Fast scanning",
    description:
      "Compare ideas across requests in one list. Open a row to inspect its angle and sources.",
  },
  {
    name: "3. Inbox and detail",
    subtitle: "Less navigation",
    description:
      "Choose a request on the left. Read its ideas on the right without opening another window.",
  },
  {
    name: "4. Idea board",
    subtitle: "Track decisions",
    description:
      "Move ideas through New ideas, Shortlisted and Ready to write. Each card keeps its original topic and request.",
  },
];
export function IdeasLayoutOptions() {
  const [layout, setLayout] = useState(0),
    [selected, setSelected] = useState(0),
    [expanded, setExpanded] = useState(0),
    [detail, setDetail] = useState(""),
    [shortlisted, setShortlisted] = useState<string[]>([]),
    [ready, setReady] = useState<string[]>([]);
  const all = requests.flatMap((request) =>
    request.ideas.map((title) => ({ request, title })),
  );
  function cards(index: number) {
    const request = requests[index];
    return (
      <div className="il-cards">
        {request.ideas.map((title) => (
          <article key={title}>
            <span className="il-tag">{request.channel}</span>
            <h3>{title}</h3>
            <p>
              A practical angle grounded in sources, with room for your own
              experience.
            </p>
            <p className="il-source">
              2 sources · Review evidence before writing
            </p>
            <button onClick={() => setDetail(title)}>View idea →</button>
          </article>
        ))}
      </div>
    );
  }
  return (
    <main className="il-page">
      <header>
        <a href="/studio">← Back to Studio</a>
        <strong>RyzaLab Content Studio</strong>
        <span>Layout previews · sample data</span>
      </header>
      <section className="il-heading">
        <p className="il-eyebrow">CHOOSE YOUR IDEAS WORKSPACE</p>
        <h1>Four ways to find your next story.</h1>
        <p>
          Interactive previews with sample data. No AI calls, charges or changes
          to saved ideas.
        </p>
      </section>
      <nav className="il-options" aria-label="Layout options">
        {options.map((option, i) => (
          <button
            key={option.name}
            aria-pressed={layout === i}
            onClick={() => {
              setLayout(i);
              setDetail("");
            }}
          >
            <strong>{option.name}</strong>
            <span>{option.subtitle}</span>
          </button>
        ))}
      </nav>
      <p className="il-description">{options[layout].description}</p>
      <section className="il-workspace" aria-label={options[layout].name}>
        <div className="il-toolbar">
          <div>
            <h2>Ideas</h2>
            <p>Research-backed angles, ready for your decision.</p>
          </div>
          <div>
            <button
              onClick={() =>
                setDetail(
                  "Preview: a short request form opens here with topic, channel, audience and quantity.",
                )
              }
            >
              Generate ideas
            </button>
            <button
              onClick={() =>
                setDetail(
                  "Preview: add your own idea and research it in the same form.",
                )
              }
            >
              Add manually
            </button>
          </div>
        </div>
        <div className="il-filters">
          {[
            "All channels",
            "LinkedIn",
            "Instagram",
            "YouTube",
            "Reddit",
            "Newsletter",
          ].map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
        {layout === 0 && (
          <div className="il-groups">
            {requests.map((request, i) => (
              <section key={request.id}>
                <button
                  className="il-request"
                  aria-expanded={expanded === i}
                  onClick={() => setExpanded(expanded === i ? -1 : i)}
                >
                  <span>
                    <small>
                      {request.id} · {request.date} · {request.channel}
                    </small>
                    <strong>{request.brief}</strong>
                  </span>
                  <b>
                    {request.ideas.length} ideas {expanded === i ? "−" : "+"}
                  </b>
                </button>
                {expanded === i && cards(i)}
              </section>
            ))}
          </div>
        )}
        {layout === 1 && (
          <div className="il-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Idea</th>
                  <th>Original topic / brief</th>
                  <th>Request</th>
                  <th>Generated</th>
                  <th>Next</th>
                </tr>
              </thead>
              <tbody>
                {all.map(({ request, title }) => (
                  <tr key={title}>
                    <td>
                      <button onClick={() => setDetail(title)}>{title}</button>
                      <small>{request.channel}</small>
                    </td>
                    <td>{request.brief}</td>
                    <td>{request.id}</td>
                    <td>{request.date}</td>
                    <td>
                      <button onClick={() => setDetail(title)}>View →</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {layout === 2 && (
          <div className="il-inbox">
            <aside>
              {requests.map((request, i) => (
                <button
                  key={request.id}
                  aria-pressed={selected === i}
                  onClick={() => setSelected(i)}
                >
                  <small>{request.date}</small>
                  <strong>{request.brief}</strong>
                  <span>
                    {request.id} · {request.ideas.length} ideas
                  </span>
                </button>
              ))}
            </aside>
            <section>
              <small>
                {requests[selected].id} · {requests[selected].date}
              </small>
              <h3>{requests[selected].brief}</h3>
              {cards(selected)}
            </section>
          </div>
        )}
        {layout === 3 && (
          <div className="il-board">
            {["New ideas", "Shortlisted", "Ready to write"].map((column, i) => (
              <section key={column}>
                <h3>{column}</h3>
                {all
                  .filter(({ title }) =>
                    i === 2
                      ? ready.includes(title)
                      : i === 1
                        ? shortlisted.includes(title) && !ready.includes(title)
                        : !shortlisted.includes(title) &&
                          !ready.includes(title),
                  )
                  .map(({ title, request }) => (
                    <article key={title}>
                      <small>
                        {request.id} · {request.date}
                      </small>
                      <span className="il-tag">{request.channel}</span>
                      <h4>{title}</h4>
                      <p>Topic: {request.brief}</p>
                      <button
                        onClick={() =>
                          i === 0
                            ? setShortlisted([...shortlisted, title])
                            : i === 1
                              ? setReady([...ready, title])
                              : setDetail(title)
                        }
                      >
                        {i === 0
                          ? "Shortlist →"
                          : i === 1
                            ? "Ready to write →"
                            : "View idea →"}
                      </button>
                    </article>
                  ))}
              </section>
            ))}
          </div>
        )}
        {detail && (
          <section className="il-detail" aria-live="polite">
            <button className="il-close" onClick={() => setDetail("")}>
              Close
            </button>
            <h3>{detail}</h3>
            {all.some((idea) => idea.title === detail) && (
              <>
                <p>
                  <strong>Angle:</strong> Explain the practical question, what
                  the evidence supports, and what readers can check themselves.
                </p>
                <p>
                  <strong>Sources:</strong> Links and excerpts appear here
                  alongside the idea, before starting a draft.
                </p>
                <button
                  onClick={() =>
                    setDetail(
                      "Preview only: opens Create with the idea, sources and channel-specific Agent Rules. No generation or charge occurs in this preview.",
                    )
                  }
                >
                  Use idea → Create draft
                </button>
              </>
            )}
          </section>
        )}
      </section>
      <footer>
        Tell me your choice: 1, 2, 3 or 4. The final Ideas layout will be
        implemented after you choose.
      </footer>
    </main>
  );
}
