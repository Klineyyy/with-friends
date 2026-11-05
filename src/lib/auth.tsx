import { useAuth as useClerkAuth, useClerk, useUser } from "@clerk/expo";

/**
 * App-level auth state, derived from Clerk.
 *
 * - `loading`    Clerk is restoring the session from the token cache.
 * - `signedOut`  Sign-in screen (sign-in.tsx).
 * - `onboarding` Signed in, but hasn't picked a username / accepted terms yet.
 * - `signedIn`   Fully set up.
 *
 * TEMPORARY: onboarding data lives in Clerk `unsafeMetadata` until Convex
 * exists. In the Convex phase, `onboarded` comes from `users.onboarded` and
 * `completeOnboarding` becomes a Convex mutation (see implementation.md).
 */
export type AuthStatus = "loading" | "signedOut" | "onboarding" | "signedIn";

type OnboardingMetadata = {
  onboarded?: boolean;
  username?: string;
  termsAcceptedAt?: string;
};

export type Account = {
  email: string | null;
  displayName: string | null;
  avatarUri: string | null;
  username: string | null;
  /** "Google" or "Apple": how you signed in (board 17 account row). */
  provider: string | null;
};

export function useAuth() {
  const { isLoaded, isSignedIn } = useClerkAuth();
  const { user } = useUser();
  const { signOut } = useClerk();

  const meta = (user?.unsafeMetadata ?? {}) as OnboardingMetadata;

  const status: AuthStatus = !isLoaded
    ? "loading"
    : !isSignedIn || !user
      ? "signedOut"
      : meta.onboarded
        ? "signedIn"
        : "onboarding";

  const account: Account | null = user
    ? {
        email: user.primaryEmailAddress?.emailAddress ?? null,
        displayName: user.fullName,
        avatarUri: user.hasImage ? user.imageUrl : null,
        username: meta.username ?? null,
        provider: user.externalAccounts[0]?.providerTitle() ?? null,
      }
    : null;

  async function completeOnboarding(input: {
    username: string;
    /** A new photo as a base64 data URL, or null to keep the current one. */
    newAvatarDataUrl: string | null;
  }) {
    if (!user) throw new Error("Not signed in");
    if (input.newAvatarDataUrl) {
      await user.setProfileImage({ file: input.newAvatarDataUrl });
    }
    await user.updateMetadata({
      unsafeMetadata: {
        onboarded: true,
        username: input.username,
        termsAcceptedAt: new Date().toISOString(),
      } satisfies OnboardingMetadata,
    });
    // Refresh so `unsafeMetadata` (and the status above) update.
    await user.reload();
  }

  /**
   * Board 21. Deletes the Clerk user, which also signs you out. Phase 9: Clerk's
   * `user.deleted` webhook runs the Convex cascade (posts, comments, likes,
   * follows); messages stay, shown as "Deleted user" (scope §4).
   */
  async function deleteAccount() {
    if (!user) throw new Error("Not signed in");
    await user.delete();
  }

  return { status, account, completeOnboarding, deleteAccount, signOut: () => signOut() };
}
