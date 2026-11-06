import { useSSO } from "@clerk/expo";
import { useState } from "react";

import { clerkCode } from "./clerk-errors";

export type Provider = "google" | "apple";

export type SignInOutcome =
  | { kind: "signedIn" }
  | { kind: "cancelled" }
  /** Google / Apple finished, but there's no account for it and Clerk (Waitlist mode) didn't create one. */
  | { kind: "noAccount" }
  | { kind: "error" };

/**
 * Clerk refuses new sign-ups in Waitlist (or Restricted) mode. Seen two ways:
 * `startSSOFlow` throws one of these codes, or (what happens on the dev
 * instance) it returns with the browser step done but no session. Approved
 * people and existing accounts get a session.
 */
const SIGN_UP_BLOCKED = new Set(["sign_up_restricted_waitlist", "sign_up_mode_restricted"]);

/**
 * Google / Apple sign-in through Clerk's browser SSO flow (`useSSO`).
 * Works with Clerk's shared development OAuth credentials; for production,
 * each provider needs its own credentials in the Clerk Dashboard.
 *
 * On success the session becomes active and the route guards in
 * src/app/_layout.tsx move on to onboarding or Home.
 */
export function useSocialSignIn() {
  const { startSSOFlow } = useSSO();
  const [pending, setPending] = useState<Provider | null>(null);

  async function signInWith(provider: Provider): Promise<SignInOutcome> {
    setPending(provider);
    try {
      const { createdSessionId, setActive, authSessionResult, signIn, signUp } = await startSSOFlow({
        strategy: provider === "google" ? "oauth_google" : "oauth_apple",
        // Always show Google's account chooser, so people can pick which account.
        ...(provider === "google" ? { oidcPrompt: "select_account" } : {}),
      });
      // Closed the browser / Google sheet without finishing.
      if (authSessionResult?.type !== "success") return { kind: "cancelled" };
      if (!createdSessionId || !setActive) {
        console.warn("Sign-in finished without a session (no account?)", {
          signIn: signIn?.status,
          firstFactor: signIn?.firstFactorVerification?.status,
          firstFactorError: signIn?.firstFactorVerification?.error?.code,
          signUp: signUp?.status,
          missing: signUp?.missingFields,
        });
        return { kind: "noAccount" };
      }
      await setActive({ session: createdSessionId });
      return { kind: "signedIn" };
    } catch (err) {
      const code = clerkCode(err);
      if (code && SIGN_UP_BLOCKED.has(code)) return { kind: "noAccount" };
      console.warn("Sign-in failed", err);
      return { kind: "error" };
    } finally {
      setPending(null);
    }
  }

  return { signInWith, pending };
}
