const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Short relative time for posts and comments: "now", "5m", "2h", "3d", "Oct 28". */
export function timeAgo(timestamp: number, now = Date.now()): string {
  const diff = Math.max(0, now - timestamp);
  if (diff < MINUTE) return "now";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h`;
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)}d`;
  const date = new Date(timestamp);
  const sameYear = date.getFullYear() === new Date(now).getFullYear();
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

/** Video length as "0:24". */
export function formatDuration(ms: number): string {
  const total = Math.round(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/** Feed media keeps its own shape, clamped from 4:5 (tallest) to 1.91:1 (widest). design.md §1. */
export function clampedAspectRatio(width: number, height: number): number {
  if (!width || !height) return 1;
  return Math.min(1.91, Math.max(0.8, width / height));
}

/** Post limits from project-scope (A10, §4). */
export const POST_LIMITS = {
  captionLength: 2200,
  videoMaxMs: 30_000,
  videoMaxBytes: 50 * 1024 * 1024,
} as const;
