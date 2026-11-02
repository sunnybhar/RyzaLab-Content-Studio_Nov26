export const BUDGET_CATEGORIES = [
  {
    id: "short_text",
    label: "Short text",
    cents: 50,
    description: "Writing and review without fresh web research.",
  },
  {
    id: "researched_text",
    label: "Researched text",
    cents: 100,
    description: "Research, writing and review when calculated requests fit.",
  },
  {
    id: "long_text",
    label: "Newsletter / carousel text",
    cents: 150,
    description:
      "Longer or structured copy with room for revision. Image/video/audio production is separate.",
  },
  {
    id: "custom",
    label: "Custom",
    cents: 200,
    description:
      "Founder-selected allowance from $0.50 to $2.00, including $1.60.",
  },
] as const;
export type BudgetCategory = (typeof BUDGET_CATEGORIES)[number]["id"];
export function inferBudgetCategory(cents: number): BudgetCategory {
  return (
    BUDGET_CATEGORIES.find(
      (category) => category.id !== "custom" && category.cents === cents,
    )?.id || "custom"
  );
}
