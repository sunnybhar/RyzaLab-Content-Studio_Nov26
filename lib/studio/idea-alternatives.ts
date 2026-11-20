export const IDEA_TEXT_ALTERNATIVES = {
  story: {
    label: "Story-led",
    instruction: "Open with a relatable scenario, then draw out the takeaway. Do not invent a personal experience.",
  },
  practical: {
    label: "Practical guide",
    instruction: "Open with a useful check the reader can do, then give concrete next steps.",
  },
  perspective: {
    label: "Point of view",
    instruction: "Open with a clear editorial position, explain the trade-off, and leave the reader with a thoughtful question.",
  },
} as const;

export type IdeaTextAlternative = keyof typeof IDEA_TEXT_ALTERNATIVES;
