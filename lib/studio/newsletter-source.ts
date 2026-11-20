import type { Actor, Content, StudioState } from "./types";
import { excludedResearchUrl, isRyzaLabSource } from "./source-policy";
import { can } from "./permissions";

/** Linked source is an intentional snapshot; generation still requires current source access. */
export function canReadNewsletterSource(
  state: StudioState,
  actor: Actor,
  content: Content,
) {
  for (const source of content.newsletterSources || []) {
    if (source.kind === "content") {
      const original = state.contents.find(
        (c) => c.id === source.id && !c.deletedAt,
      );
      if (
        !original ||
        !can(state, actor, "read", {
          channel: original.channel,
          account: original.account,
          contentId: original.id,
          assignedTo: original.assignedTo,
        })
      )
        return false;
    }
    if (source.kind === "idea") {
      const original = state.ideas.find((i) => i.id === source.id);
      if (
        !original ||
        !can(state, actor, "read", { channel: original.channel })
      )
        return false;
    }
    if (source.kind === "pipeline") {
      const original = state.pipelineBriefs?.find((p) => p.id === source.id);
      if (
        !original ||
        !can(state, actor, "read", {
          channel: original.channel,
          account: original.account,
        })
      )
        return false;
    }
  }
  const source = content.newsletterSource;
  if (!source) return true;
  if (source.kind === "idea") {
    const idea = state.ideas.find((i) => i.id === source.id);
    return Boolean(
      idea && can(state, actor, "read", { channel: idea.channel }),
    );
  }
  const original = state.contents.find(
    (c) => c.id === source.id && !c.deletedAt,
  );
  return Boolean(
    original &&
    can(state, actor, "read", {
      channel: original.channel,
      account: original.account,
      contentId: original.id,
      assignedTo: original.assignedTo,
    }),
  );
}

export function newsletterSourceProvenance(state: StudioState, content: Content) {
  const researchIds: string[] = [];
  const references: string[] = [];
  for (const source of [content.newsletterSource, ...(content.newsletterSources || [])]) {
    if (!source) continue;
    references.push(source.text, source.metadata);
    const original = source.kind === "content" ? state.contents.find((draft) =>
      draft.id === source.id && draft.revision === source.revision && !draft.deletedAt,
    ) : undefined;
    const idea = state.ideas.find((entry) => entry.id === (source.kind === "idea" ? source.id : original?.ideaId));
    researchIds.push(...(source.researchJobIds ?? original?.researchJobIds ?? idea?.researchJobIds ?? []));
    references.push(...(source.sourceReferences ?? (source.kind === "content" ? idea?.sources : undefined) ?? []));
  }
  return { researchIds, references };
}

export function newsletterLinks(values: string[]) {
  const urls = values.flatMap((value) =>
    (value.match(/https?:\/\/[^\s<>"\[\]]+/gi) || []).map((url) =>
      url.replace(/[.,;:!?]+$/, "").replace(/\)+$/, ""),
    ),
  );
  return [...new Set(urls.filter((url) => {
    try {
      const parsed = new URL(url);
      return /^https?:$/.test(parsed.protocol) && !parsed.username && !parsed.password && !excludedResearchUrl(url);
    } catch {
      return false;
    }
  }))];
}

export function citesRyzaLab(value: string) {
  return newsletterLinks([value]).some(isRyzaLabSource) || /^\s*(?:[-*]\s+)?RyzaLab\s*[,.:]/i.test(value);
}

export function retainNewsletterLinks(body: string, links: string[]) {
  const lines = body.split("\n");
  const start = lines.findIndex((line) => /^\s*(?:#{1,6}\s+)?(?:Sources|References)\s*:?\s*$/i.test(line));
  const nextHeading = start < 0 ? -1 : lines.findIndex((line, index) => index > start && /^\s*#{1,6}\s+/.test(line));
  const end = nextHeading < 0 ? lines.length : nextHeading;
  const citations = start < 0 ? [] : lines.slice(start + 1, end).filter((line) => !citesRyzaLab(line));
  const existing = new Set(newsletterLinks(citations));
  const bullets = newsletterLinks(links).filter((url) => !isRyzaLabSource(url) && !existing.has(url)).map((url) => `- ${url}`);
  if (start < 0) return bullets.length ? [body.trimEnd(), "## Sources", bullets.join("\n")].join("\n\n") : body;
  lines.splice(start + 1, end - start - 1, ...(bullets.length ? ["", ...bullets] : []), ...citations);
  return lines.join("\n");
}
