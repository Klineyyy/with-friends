import { isClerkAPIResponseError } from "@clerk/expo";

/**
 * A readable message from a Clerk error: the API's `longMessage` (e.g.
 * "Password has been found in an online data breach…"), else `fallback`.
 * Works for both thrown errors (`user.updatePassword`) and the `{ error }`
 * results of the sign-in methods (`signIn.password`).
 */
export function clerkMessage(error: unknown, fallback: string): string {
  if (isClerkAPIResponseError(error)) {
    const first = error.errors[0];
    return first?.longMessage || first?.message || fallback;
  }
  if (error && typeof error === "object" && "longMessage" in error && typeof error.longMessage === "string") {
    return error.longMessage;
  }
  return fallback;
}

/** The API error code (e.g. "form_password_incorrect"), if there is one. */
export function clerkCode(error: unknown): string | null {
  if (isClerkAPIResponseError(error)) return error.errors[0]?.code ?? null;
  if (error && typeof error === "object" && "code" in error && typeof error.code === "string") return error.code;
  return null;
}
