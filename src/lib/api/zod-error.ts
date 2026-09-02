import { ZodError } from "zod";

const FIELD_LABELS: Record<string, string> = {
  levels: "Membership tiers",
  levelNumber: "Tier number",
  name: "Tier name",
  minLifetimePoints: "Minimum lifetime points",
  pointsMultiplier: "Points multiplier",
  discountPercent: "Discount",
};

function labelForPath(path: (string | number)[]): string {
  const key = path[path.length - 1];
  if (typeof key === "string" && FIELD_LABELS[key]) return FIELD_LABELS[key];
  if (path[0] === "levels" && typeof path[1] === "number") {
    return `Tier ${path[1] + 1}`;
  }
  return path.join(".");
}

export function formatZodError(error: ZodError): string {
  return error.issues
    .map((issue) => {
      const label = labelForPath(issue.path);
      if (issue.code === "too_small" && issue.type === "array" && issue.path[0] === "levels") {
        return "Membership needs exactly 5 tiers (Starter through Platinum).";
      }
      return `${label}: ${issue.message}`;
    })
    .join(" ");
}
