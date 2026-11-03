/** Bounded local section selection. Original documents remain editable in full. */
export function contextExcerpt(text: string, query: string, limit = 12000) {
  if (text.length <= limit) return { text, selection: "Full context" };
  let task = query;
  try {
    const parsed = JSON.parse(query);
    task = [
      parsed.topic,
      parsed.title,
      parsed.audience,
      parsed.idea?.title,
      parsed.idea?.brief,
    ]
      .filter(Boolean)
      .join(" ");
  } catch {}
  const terms = [
    ...new Set(task.toLowerCase().match(/[a-z]{4,}/g) || []),
  ].filter(
    (w) =>
      ![
        "with",
        "this",
        "that",
        "from",
        "content",
        "post",
        "newsletter",
        "ideas",
        "write",
      ].includes(w),
  );
  let source = "Context";
  const chunks = text.split(/(?=^#{1,6}\s)/m).map((section, index) => {
    const match = /^# Source file:\s*(.+)/.exec(section);
    if (match) source = match[1];
    const candidate = `[${source}]\n${section}`;
    return {
      candidate,
      index,
      score:
        terms.reduce(
          (score, word) =>
            score + (candidate.toLowerCase().includes(word) ? 3 : 0),
          0,
        ) +
        (/decisions|guardrails|positioning|about ryzalab|brand.brain|playbook/i.test(
          section.split("\n")[0],
        )
          ? 4
          : 0),
    };
  });
  let remaining = limit;
  const selected = chunks
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .filter((chunk) => {
      if (remaining < 250) return false;
      chunk.candidate = chunk.candidate.slice(0, Math.min(remaining, 3000));
      remaining -= chunk.candidate.length + 2;
      return true;
    })
    .sort((a, b) => a.index - b.index);
  return {
    text: selected.map((c) => c.candidate).join("\n\n"),
    selection: `Locally selected source-labelled sections: ${text.length} original characters; maximum ${limit} selected characters. Omitted sections are not evidence for this request.`,
  };
}
