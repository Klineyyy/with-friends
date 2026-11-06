/**
 * Rewrites incoming deep links before Expo Router handles them.
 *
 * After Google sign-in, the browser returns to `withfriends://sso-callback`.
 * Clerk's `useSSO` picks that URL up itself, so the router must not try to
 * open it as a screen (it would show "Unmatched route"). Returning null keeps
 * the app where it is; the auth guards in _layout.tsx then move on to
 * onboarding or Home.
 *
 * The "Accept invitation" button in an approval email (scripts/approve.mjs)
 * lands on `withfriends://accept-invite?__clerk_ticket=…`: just open the
 * sign-in screen, where they continue with Google / Apple.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string | null {
  try {
    if (path.includes("sso-callback")) return null;
    if (path.includes("accept-invite")) return "/sign-in";
    return path;
  } catch {
    return "/";
  }
}
