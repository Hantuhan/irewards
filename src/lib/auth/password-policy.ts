/** Shared password policy — safe for client and server bundles. */

export const PASSWORD_POLICY = {
  minLength: 12,
  requireUpper: true,
  requireLower: true,
  requireDigit: true,
  requireSpecial: true,
} as const;

export type PasswordIssue = string;

export const PASSWORD_REQUIREMENTS = [
  { id: "length", label: `At least ${PASSWORD_POLICY.minLength} characters` },
  { id: "upper", label: "One uppercase letter (A–Z)" },
  { id: "lower", label: "One lowercase letter (a–z)" },
  { id: "digit", label: "One number (0–9)" },
  { id: "special", label: "One special character (!@#$…)" },
  { id: "safe", label: "No obvious words (password, qwerty, demo123)" },
] as const;

const FORBIDDEN_WORDS = ["password", "irewards", "demo123", "qwerty", "123456"] as const;

function hasForbiddenWord(password: string): boolean {
  const lower = password.toLowerCase();
  return FORBIDDEN_WORDS.some((bad) => lower.includes(bad));
}

export function passwordRequirementStatus(password: string): Record<
  (typeof PASSWORD_REQUIREMENTS)[number]["id"],
  boolean
> {
  return {
    length: password.length >= PASSWORD_POLICY.minLength,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    digit: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
    safe: password.length === 0 || !hasForbiddenWord(password),
  };
}

export function validatePasswordStrength(password: string): PasswordIssue[] {
  const issues: PasswordIssue[] = [];
  if (password.length < PASSWORD_POLICY.minLength) {
    issues.push(`At least ${PASSWORD_POLICY.minLength} characters`);
  }
  if (PASSWORD_POLICY.requireUpper && !/[A-Z]/.test(password)) {
    issues.push("Include an uppercase letter");
  }
  if (PASSWORD_POLICY.requireLower && !/[a-z]/.test(password)) {
    issues.push("Include a lowercase letter");
  }
  if (PASSWORD_POLICY.requireDigit && !/[0-9]/.test(password)) {
    issues.push("Include a number");
  }
  if (PASSWORD_POLICY.requireSpecial && !/[^A-Za-z0-9]/.test(password)) {
    issues.push("Include a special character (!@#$%^&* etc.)");
  }
  if (/(.)\1{3,}/.test(password)) {
    issues.push("Avoid long repeated characters");
  }
  if (hasForbiddenWord(password)) {
    issues.push("Avoid common or product-related words");
  }
  return issues;
}

export function assertPasswordStrength(password: string): void {
  const issues = validatePasswordStrength(password);
  if (issues.length > 0) {
    throw new Error(`Password too weak: ${issues.join("; ")}`);
  }
}
