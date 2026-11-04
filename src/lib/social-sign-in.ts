import { useSSO } from "@clerk/expo";
import { useState } from "react";

export type Provider = "google" | "apple";

export type SignInOutcome =
  | { kind: "signedIn" }
  | { kind: "cancelled" }
  | { kind: "error" };

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
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: provider === "google" ? "oauth_google" : "oauth_apple",
        // Always show Google's account chooser, so people can pick which account.
        ...(provider === "google" ? { oidcPrompt: "select_account" } : {}),
      });
      if (!createdSessionId || !setActive) return { kind: "cancelled" };
      await setActive({ session: createdSessionId });
      return { kind: "signedIn" };
    } catch (err) {
      console.warn("Sign-in failed", err);
      return { kind: "error" };
    } finally {
      setPending(null);
    }
  }

  return { signInWith, pending };
}
