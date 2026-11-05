/**
 * Username rules from project-scope.md §5: [A-Za-z0-9_.], 3–30 chars. Kept as typed
 * ("Kline"); unique ignoring case. Mirrored in `convex/users.ts`.
 */
export const USERNAME_MIN = 3;
export const USERNAME_MAX = 30;

export function normalizeUsername(raw: string): string {
  return raw.trim();
}

/** Returns an error message, or null when the format is valid. */
export function usernameFormatError(username: string): string | null {
  if (username.length < USERNAME_MIN) return `Use at least ${USERNAME_MIN} characters.`;
  if (username.length > USERNAME_MAX) return `Use ${USERNAME_MAX} characters or fewer.`;
  if (!/^[A-Za-z0-9_.]+$/.test(username)) return "Use letters, numbers, periods, and underscores.";
  return null;
}
