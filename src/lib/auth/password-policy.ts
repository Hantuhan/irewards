/** Shared password policy — safe for client and server bundles. */

export const PASSWORD_POLICY = {
  minLength: 12,
  requireUpper: true,
  requireLower: true,
  requireDigit: true,
  requireSpecial: true,
} as const;

export type PasswordIssue = string;

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
  const lower = password.toLowerCase();
  for (const bad of ["password", "irewards", "demo123", "qwerty", "123456"]) {
    if (lower.includes(bad)) {
      issues.push("Avoid common or product-related words");
      break;
    }
  }
  return issues;
}

export function assertPasswordStrength(password: string): void {
  const issues = validatePasswordStrength(password);
  if (issues.length > 0) {
    throw new Error(`Password too weak: ${issues.join("; ")}`);
  }
}
