/** Username rules from project-scope.md §5: lowercase, [a-z0-9_.], 3–30 chars. */
export const USERNAME_MIN = 3;
export const USERNAME_MAX = 30;

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Returns an error message, or null when the format is valid. */
export function usernameFormatError(username: string): string | null {
  if (username.length < USERNAME_MIN) return `Use at least ${USERNAME_MIN} characters.`;
  if (username.length > USERNAME_MAX) return `Use ${USERNAME_MAX} characters or fewer.`;
  if (!/^[a-z0-9_.]+$/.test(username)) return "Use letters, numbers, periods, and underscores.";
  return null;
}

// TEMPORARY: replaced by a Convex query on the unique `username` index.
const TAKEN = new Set(["maya", "tom", "lola.ines", "bencruz", "ana", "jules", "priya"]);

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  await new Promise((r) => setTimeout(r, 300));
  return !TAKEN.has(username);
}
