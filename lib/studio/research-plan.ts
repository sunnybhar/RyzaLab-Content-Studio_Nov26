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

const headlineWords = new Set(
  "about adding again along also another anything asks asked before best buy buying can cant check comes could discounted does doing find goes going have here just looking might much need offer once really said says should take than that their them then there these they thing this those want what when where which while will with would your".split(" "),
);

export function comprehensiveSearchAngles(question: string) {
  const keywords = [...new Set((question.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || [])
    .filter((word) => !headlineWords.has(word)))].slice(0, 7).join(" ");
  const topic = keywords.length >= 5 ? keywords : question;
  // Consumer privacy coverage often uses product-category terms rather than editorial headline wording.
  if (/\b(?:nursery|baby|infant)\b/i.test(question) && /\b(?:camera|monitor|footage|video)\b/i.test(question)) {
    return {
      relevance: ["baby monitor privacy security video storage", "nursery camera footage", "connected baby camera privacy"],
      initial: [
        { purpose: "consumer privacy", query: "baby monitor privacy video storage" },
        { purpose: "manufacturer documentation", query: "baby monitor local storage cloud recording support" },
        { purpose: "regulation and security", query: "connected baby monitor privacy security regulator" },
        { purpose: "expert and video coverage", query: "baby monitor local storage cloud independent review video" },
        { purpose: "datasets and comparisons", query: "internet connected baby monitor security privacy study" },
        { purpose: "news reporting", query: "baby monitor camera privacy footage security news" },
      ],
      followup: [
        { purpose: "offline and account access", query: "Wi-Fi baby monitor cloud account remote access privacy" },
        { purpose: "consumer tests", query: "baby monitor non WiFi local recording review data security" },
        { purpose: "retention and deletion", query: "nursery camera baby monitor video retention delete privacy policy" },
      ],
      scholarlyQuery: "internet connected baby monitors privacy security cameras",
    };
  }
  return {
    relevance: [topic],
    initial: [
      { purpose: "topic overview", query: topic },
      { purpose: "original evidence", query: `${topic} official documentation` },
      { purpose: "limitations", query: `${topic} limitations independent tests` },
      { purpose: "expert and video coverage", query: `${topic} video YouTube expert review` },
      { purpose: "datasets and comparisons", query: `${topic} data study` },
      { purpose: "news reporting", query: `${topic} news reporting` },
    ],
    followup: [
      { purpose: "primary sources", query: `${topic} standards regulator` },
      { purpose: "alternative coverage", query: `${topic} trade magazine analysis` },
      { purpose: "practical evidence", query: `${topic} testing case study` },
    ],
    scholarlyQuery: topic,
  };
}
