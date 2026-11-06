import { useSignIn } from "@clerk/expo";
import { useState } from "react";

import { clerkCode, clerkMessage } from "./clerk-errors";

/**
 * Username (or email) + password sign-in, for the card on screen 1.
 *
 * A password is added in Settings → Password after a first Google / Apple
 * sign-in, so there's no sign-up here. Clerk's Device Trust may ask for an
 * emailed code the first time a password is used on a new phone
 * (`needs_client_trust`): `step` becomes "code".
 *
 * On success the session becomes active and the route guards in
 * src/app/_layout.tsx move on.
 */
export function usePasswordSignIn() {
  const { signIn, fetchStatus } = useSignIn();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"password" | "code">("password");
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const busy = fetchStatus === "fetching";
  const canSubmit =
    !busy && (step === "password" ? identifier.trim().length > 0 && password.length > 0 : code.trim().length >= 6);

  async function finish() {
    const { error } = await signIn.finalize({ navigate: () => {} });
    if (error) setError(clerkMessage(error, "Couldn't sign in. Try again."));
  }

  async function submitPassword() {
    setError(null);
    const { error } = await signIn.password({
      identifier: identifier.trim().replace(/^@/, ""),
      password,
    });
    if (error) {
      const code = clerkCode(error);
      setError(
        code === "form_identifier_not_found"
          ? "No account with that username or email."
          : code === "form_password_incorrect"
            ? "Wrong password. Try again."
            : clerkMessage(error, "Couldn't sign in. Check your connection and try again."),
      );
      return;
    }
    if (signIn.status === "complete") return finish();
    if (signIn.status === "needs_client_trust" || signIn.status === "needs_second_factor") {
      const emailFactor = signIn.supportedSecondFactors?.find((f) => f.strategy === "email_code");
      if (emailFactor) {
        const { error: sendError } = await signIn.mfa.sendEmailCode();
        if (sendError) return setError(clerkMessage(sendError, "Couldn't send the code. Try again."));
        setCodeSentTo("safeIdentifier" in emailFactor ? emailFactor.safeIdentifier : null);
        setStep("code");
        return;
      }
    }
    setError("This account needs a sign-in step the app doesn't support yet. Use Google or Apple.");
  }

  async function submitCode() {
    setError(null);
    const { error } = await signIn.mfa.verifyEmailCode({ code: code.trim() });
    if (error) return setError(clerkMessage(error, "That code didn't work. Try again."));
    if (signIn.status === "complete") return finish();
    setError("Couldn't sign in. Try again.");
  }

  async function backToPassword() {
    await signIn.reset();
    setCode("");
    setError(null);
    setStep("password");
  }

  return {
    identifier,
    setIdentifier,
    password,
    setPassword,
    code,
    setCode,
    step,
    codeSentTo,
    error,
    busy,
    canSubmit,
    submit: () => (step === "password" ? submitPassword() : submitCode()),
    backToPassword,
  };
}
