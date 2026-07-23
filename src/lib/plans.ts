const PLAN_NAME_ALIASES: Record<string, string> = {
  quota_demo: "Starter Demo",
};

export function formatPlanDisplayName(planName?: string | null) {
  if (!planName) return "No plan";

  const normalized = planName.trim();
  if (!normalized) return "No plan";

  const alias = PLAN_NAME_ALIASES[normalized.toLowerCase()];
  if (alias) return alias;

  return normalized
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
