import { ConvexReactClient } from "convex/react";

const url = process.env.EXPO_PUBLIC_CONVEX_URL ?? "";

if (!url) {
  throw new Error("Missing EXPO_PUBLIC_CONVEX_URL. Run `npx convex dev` (it writes .env.local), then restart the dev server.");
}

/** The one Convex client. `unsavedChangesWarning` is a web-only prompt. */
export const convex = new ConvexReactClient(url, { unsavedChangesWarning: false });

/** The message from a `ConvexError` thrown in a function, or a fallback. */
export function errorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "data" in error && typeof error.data === "string") return error.data;
  return fallback;
}

/**
 * Timestamp for optimistic rows. The React Compiler lint flags `Date.now()`
 * inside `withOptimisticUpdate` callbacks as render-time; they run at call time.
 */
export function optimisticNow(): number {
  return Date.now();
}
