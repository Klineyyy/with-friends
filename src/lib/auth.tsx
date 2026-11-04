import { createContext, use, useState, type ReactNode } from "react";

/**
 * TEMPORARY mock of the auth/onboarding state so the "Getting in" screens can
 * be built and clicked through before Clerk and Convex exist.
 *
 * Replace in the Clerk phase (see implementation.md): `status` will come from
 * Clerk's session + the Convex `users.onboarded` flag, and the actions will
 * call Clerk / Convex. The route guards in src/app/_layout.tsx stay the same.
 */
export type AuthStatus = "signedOut" | "notInvited" | "onboarding" | "signedIn";

export type Account = {
  email: string;
  displayName: string;
  avatarUri: string | null;
  username: string | null;
};

type AuthState = {
  status: AuthStatus;
  account: Account | null;
  signInWithGoogle: () => void;
  signInWithApple: () => void;
  completeOnboarding: (input: { username: string; avatarUri: string | null }) => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

const mockAccount: Account = {
  email: "jamie@example.com",
  displayName: "Jamie Santos",
  avatarUri: null,
  username: null,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("signedOut");
  const [account, setAccount] = useState<Account | null>(null);

  const value: AuthState = {
    status,
    account,
    // Mock wiring: Google behaves like an invited account, Apple like an
    // uninvited one, so both branches of the flow can be reached.
    signInWithGoogle: () => {
      setAccount(mockAccount);
      setStatus("onboarding");
    },
    signInWithApple: () => {
      setAccount(mockAccount);
      setStatus("notInvited");
    },
    completeOnboarding: ({ username, avatarUri }) => {
      setAccount((a) => (a ? { ...a, username, avatarUri } : a));
      setStatus("signedIn");
    },
    signOut: () => {
      setAccount(null);
      setStatus("signedOut");
    },
  };

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthState {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
