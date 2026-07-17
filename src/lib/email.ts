const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Simple format check shared by the client form and the server action so
 * both agree on what counts as "valid" without duplicating the pattern. */
export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value);
}
