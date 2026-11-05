import { router, type Href } from "expo-router";

/**
 * ← / ✕ / Cancel. Goes back when there's a screen to go back to; otherwise
 * (opened from a link, or reopened on its own after a reload) goes to `fallback`.
 * Use instead of bare `router.back()`, which logs "GO_BACK was not handled".
 */
export function goBack(fallback: Href = "/") {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
