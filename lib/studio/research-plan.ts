import { researchQueries, type ResearchProfile } from "./research-profile";
/** Derived only from the explicit public question and public domain preferences. */
export function investigationPlan(question: string, profile: ResearchProfile) {
  const base = researchQueries(question, profile);
  const specialist = { purpose: "specialist evidence", query: base.sector };
  const primary = {
    purpose: "original evidence and methods",
    query: `${question} official documentation standard study original data methodology`,
  };
  const contrary = {
    purpose: "limitations and contrary evidence",
    query: `${question} limitations risks independent tests criticism correction`,
  };
  const current = {
    purpose: "updates and chronology",
    query: `${question} updated support policy release correction latest`,
  };
  const data = {
    purpose: "datasets and comparisons",
    query: `${question} dataset statistics sample baseline comparison study`,
  };
  return {
    version: 1 as const,
    depth: profile.depth,
    question,
    questions: [
      "What does original evidence establish, and for which dates, versions and places?",
      "What independent evidence supports or challenges the premise?",
      "Which numbers have comparable definitions, units, periods and populations?",
      "What practical decision follows, and what remains unknown?",
    ],
    searches:
      profile.depth === "focused"
        ? [specialist, primary]
        : profile.depth === "deep"
          ? [
              specialist,
              primary,
              contrary,
              { purpose: "wider reporting", query: base.wider },
            ]
          : [
              specialist,
              primary,
              contrary,
              current,
              data,
              { purpose: "wider reporting", query: base.wider },
            ],
    notice:
      "A bounded investigation plan, not a promise of coverage. Public queries contain no private instructions or draft text.",
  };
}
