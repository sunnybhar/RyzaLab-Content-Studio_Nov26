import {eligibleReferences} from "./source-policy";
import type { Channel, StudioState } from "./types";
import { readRates } from "./pricing";
import { compileSystem } from "./system-context";
import { agentContext } from "./agent-context";
type Evidence = Record<string, any>;
function bytes(value: string) {
  return new TextEncoder().encode(value).length;
}
function passage(text: string, query: string, maximum: number) {
  if (bytes(text) <= maximum)
    return { text, selection: "Full retained extract" };
  const terms = [
    ...new Set(query.toLowerCase().match(/[a-z]{4,}/g) || []),
  ].slice(0, 30);
  const width = Math.max(80, Math.floor(maximum / 4));
  let best = 0,
    score = -1;
  for (
    let at = 0;
    at < text.length;
    at += Math.max(80, Math.floor(width / 2))
  ) {
    const candidate = text.slice(at, at + width).toLowerCase(),
      rank = terms.reduce(
        (n, term) => n + (candidate.includes(term) ? 1 : 0),
        0,
      );
    if (rank > score) {
      score = rank;
      best = at;
    }
  }
  let selected = text.slice(best, best + Math.min(maximum, width * 4));
  while (bytes(selected) > maximum)
    selected = selected.slice(
      0,
      Math.max(1, Math.floor(selected.length * 0.9)),
    );
  return {
    text: selected,
    selection: `Exact bounded passage from retained extract; ${bytes(text)} original bytes, ${bytes(selected)} included bytes. Omitted text is not evidence for this request.`,
  };
}
/** Shrinks reference passages only; task, current human copy, outline, policy and instructions remain intact. */
export function evidencePrompt(
  state: StudioState,
  channel: Channel,
  kind: "ideas" | "text" | "review",
  connectionId: string,
  original: Record<string, any>,
) {
  const hasEvidence =
    original.webEvidence?.length || original.newsletterSources?.length;
  if (!hasEvidence) return JSON.stringify(original);
  const connection = state.connections.find((c) => c.id === connectionId),
    rates =
      state.settings.qualifiedRates ??
      (typeof process === "undefined" ? [] : readRates());
  const maximum =
    rates.find(
      (r) =>
        r.provider === connection?.provider &&
        r.model === connection?.model &&
        r.function === kind,
    )?.maxInputBytes || 24000;
  const workflow = state.workflows.find(
    (w) => w.channel === channel && w.status === "active",
  );
  const query = [
    original.topic,
    original.title,
    original.audience,
    original.idea?.title,
    original.idea?.brief,
  ]
    .filter(Boolean)
    .join(" ");
  const count = (original.webEvidence || []).reduce(
    (n: number, e: Evidence) => n + (e.citations?.length || 0),
    0,
  );
  let failure: unknown;
  for (const tier of [
    { sources: Infinity, bytes: Infinity },
    { sources: 15, bytes: 1800 },
    { sources: 15, bytes: 950 },
    { sources: 15, bytes: 500 },
    { sources: 15, bytes: 250 },
    { sources: 12, bytes: 1200 },
    { sources: 8, bytes: 1400 },
    { sources: 6, bytes: 800 },
    { sources: 3, bytes: 400 },
    { sources: 1, bytes: 250 },
  ]) {
    let remaining = tier.sources,
      used = 0,
      excerpted = 0;
    const webEvidence = (original.webEvidence || [])
      .map((e: Evidence) => {
        const citations = (e.citations || [])
          .slice(0, remaining)
          .map((c: Evidence) => {
            const chosen = passage(c.citedText || "", query, tier.bytes);
            used++;
            if (chosen.selection !== "Full retained extract") excerpted++;
            return {
              ...c,
              citedText: chosen.text,
              passageCoverage: chosen.selection,
            };
          });
        remaining -= citations.length;
        const urls = new Set(citations.map((c: Evidence) => c.url));
        return {
          ...e,
          summary: passage(e.summary || "", query, tier.bytes).text,
          citations,
          claims: (e.claims || [])
            .filter((c: Evidence) =>
              c.sourceUrls?.every((u: string) => urls.has(u)),
            )
            .slice(0, tier.sources === Infinity ? Infinity : 6)
            .map((c: Evidence) => ({
              ...c,
              text: passage(c.text || "", query, tier.bytes).text,
            })),
        };
      })
      .filter((e: Evidence) => e.citations.length);
    const newsletterSources = original.newsletterSources?.map((s: Evidence) => {
      const chosen = passage(s.text || "", query, tier.bytes);
      if (chosen.selection !== "Full retained extract") excerpted++;
      return {
        ...s,
        text: chosen.text,
        metadata: passage(s.metadata || "", query, tier.bytes).text,
        passageCoverage: chosen.selection,
      };
    });
    const candidate = {
      ...original,
      webEvidence,
      ...(newsletterSources ? { newsletterSources } : {}),
      evidenceCoverage: {
        researchSourcesRetained: count,
        researchSourcesIncluded: used,
        researchSourcesOmitted: count - used,
        newsletterSourcesIncluded: newsletterSources?.length || 0,
        passagesExcerpted: excerpted,
        claimsRetained: (original.webEvidence || []).reduce(
          (n: number, e: Evidence) => n + (e.claims?.length || 0),
          0,
        ),
        claimsIncluded: webEvidence.reduce(
          (n: number, e: Evidence) => n + e.claims.length,
          0,
        ),
        scope:
          "Original sources remain saved in Studio. Only included passages can support this request; do not imply that omitted material was read or verified.",
      },
    };
    const prompt = JSON.stringify(candidate);
    try {
      compileSystem(
        {
          kind,
          prompt,
          rulesSnapshot: state.settings.protectedRules,
          workflowSnapshot: workflow,
          referenceSnapshots: eligibleReferences(state.references.filter((r) =>
            workflow?.references.includes(r.id),
          )),
          agentContextSnapshot: agentContext(state, channel, prompt),
          outputContract:
            kind === "text"
              ? "draft_v1"
              : kind === "review"
                ? "review_v1"
                : undefined,
        },
        maximum,
      );
      return prompt;
    } catch (e) {
      failure = e;
    }
  }
  throw failure;
}
