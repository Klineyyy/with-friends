import { useAuth as useClerkAuth, useClerk, useUser } from "@clerk/expo";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useEffect, useRef } from "react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

import { uploadFile } from "./upload";

/**
 * App-level auth state: Clerk owns the session, Convex owns the profile.
 *
 * - `loading`    Clerk is restoring the session, Convex is checking the token,
 *                or the user row is being created on first sign-in.
 * - `signedOut`  Sign-in screen (sign-in.tsx).
 * - `onboarding` Signed in, but hasn't picked a username / accepted terms yet (`users.onboarded`).
 * - `signedIn`   Fully set up.
 */
export type AuthStatus = "loading" | "signedOut" | "onboarding" | "signedIn";

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
  const convexAuth = useConvexAuth();
  const me = useQuery(api.users.me, convexAuth.isAuthenticated ? {} : "skip");
  const ensure = useMutation(api.users.ensure);
  const finishOnboarding = useMutation(api.users.completeOnboarding);
  const generateUploadUrl = useMutation(api.posts.generateUploadUrl);
  const deleteMe = useMutation(api.users.deleteMe);

  // First sign-in: create the Convex user row (don't wait for the webhook).
  const ensuring = useRef(false);
  useEffect(() => {
    if (me !== null || ensuring.current) return;
    ensuring.current = true;
    ensure()
      .catch((error) => console.warn("users.ensure failed", error))
      .finally(() => (ensuring.current = false));
  }, [me, ensure]);

  const status: AuthStatus =
    !isLoaded || (isSignedIn && (convexAuth.isLoading || !convexAuth.isAuthenticated || !me))
      ? "loading"
      : !isSignedIn || !user
        ? "signedOut"
        : me?.onboarded
          ? "signedIn"
          : "onboarding";

  const account: Account | null = user
    ? {
        email: user.primaryEmailAddress?.emailAddress ?? null,
        displayName: me?.displayName || user.fullName,
        avatarUri: me?.avatarUri ?? (user.hasImage ? user.imageUrl : null),
        username: me?.username || null,
        provider: user.externalAccounts[0]?.providerTitle() ?? null,
      }
    : null;

  async function completeOnboarding(input: {
    username: string;
    /** A newly picked photo (local URI), or null to keep the Google / Apple one. */
    newAvatarUri: string | null;
  }) {
    let avatarStorageId: Id<"_storage"> | undefined;
    if (input.newAvatarUri) {
      avatarStorageId = (await uploadFile(await generateUploadUrl(), input.newAvatarUri)) as Id<"_storage">;
    }
    await finishOnboarding({ username: input.username, avatarStorageId });
  }

  /**
   * Board 21. Starts the Convex cascade (posts, comments, likes, follows go;
   * messages stay as "Deleted user", scope §4), then deletes the Clerk user,
   * which signs you out. The `user.deleted` webhook is the backstop.
   */
  async function deleteAccount() {
    if (!user) throw new Error("Not signed in");
    await deleteMe();
    await user.delete();
  }

  return { status, account, completeOnboarding, deleteAccount, signOut: () => signOut() };
}
