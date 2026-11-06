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
  /** Has set a password (Settings → Password), so can sign in with username + password. */
  hasPassword: boolean;
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
  // Clerk's Convex token has no name or photo, so pass them from the Clerk
  // user; Convex keeps the Google / Apple photo as the default avatar.
  const clerkName = user?.fullName ?? undefined;
  const clerkImageUrl = user?.hasImage ? user.imageUrl : undefined;
  const ensuring = useRef(false);
  useEffect(() => {
    if (me !== null || ensuring.current || !user) return;
    ensuring.current = true;
    ensure({ name: clerkName, imageUrl: clerkImageUrl })
      .catch((error) => console.warn("users.ensure failed", error))
      .finally(() => (ensuring.current = false));
  }, [me, ensure, user, clerkName, clerkImageUrl]);

  // Existing rows: refresh the Clerk name / photo once per value (fills in
  // accounts made before this was passed). No-op on the server when unchanged.
  const refreshed = useRef<string | null>(null);
  useEffect(() => {
    if (!me || !user) return;
    const key = `${user.id}|${clerkName ?? ""}|${clerkImageUrl ?? ""}`;
    if (refreshed.current === key) return;
    refreshed.current = key;
    ensure({ name: clerkName, imageUrl: clerkImageUrl }).catch((error) =>
      console.warn("users.ensure refresh failed", error),
    );
  }, [me, user, ensure, clerkName, clerkImageUrl]);

  // Username sign-in: Clerk needs the username too. Convex owns it (picked at
  // onboarding), so mirror it onto the Clerk user. Clerk compares usernames
  // without case, so only push a real change, once per value.
  const syncedUsername = useRef<string | null>(null);
  useEffect(() => {
    const username = me?.username;
    if (!user || !username || syncedUsername.current === username) return;
    syncedUsername.current = username;
    if (user.username?.toLowerCase() === username.toLowerCase()) return;
    user.update({ username }).catch((error) => console.warn("Clerk username sync failed", error));
  }, [user, me?.username]);

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
        hasPassword: user.passwordEnabled,
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
