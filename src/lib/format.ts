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

/** Profile limits: bio from scope A10; display name is our own cap. */
export const PROFILE_LIMITS = { bioLength: 150, displayNameLength: 50 } as const;

/** "1 post", "18 posts". */
export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}

function startOfDay(timestamp: number): number {
  const d = new Date(timestamp);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Calendar days between two times: 0 = same day, 1 = yesterday… */
function daysBetween(timestamp: number, now: number): number {
  return Math.round((startOfDay(now) - startOfDay(timestamp)) / DAY);
}

/** Conversation list time (board 14a): "2m", "3h", then "Mon", then "Oct 28". */
export function messageListTime(timestamp: number, now = Date.now()): string {
  if (now - timestamp < DAY) return timeAgo(timestamp, now);
  if (daysBetween(timestamp, now) < 7) {
    return new Date(timestamp).toLocaleDateString("en-US", { weekday: "short" });
  }
  return timeAgo(timestamp, now);
}

/** Centred time in a thread (board 15): "Today 8:12 AM", "Yesterday …", "Mon …", "Oct 28, …". */
export function threadTimestamp(timestamp: number, now = Date.now()): string {
  const date = new Date(timestamp);
  const time = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const days = daysBetween(timestamp, now);
  if (days === 0) return `Today ${time}`;
  if (days === 1) return `Yesterday ${time}`;
  if (days < 7) return `${date.toLocaleDateString("en-US", { weekday: "short" })} ${time}`;
  const sameYear = date.getFullYear() === new Date(now).getFullYear();
  const day = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
  return `${day}, ${time}`;
}

/** Activity section (board 16a): "Today", "This week", or "Earlier". */
export function activitySection(timestamp: number, now = Date.now()): "Today" | "This week" | "Earlier" {
  const days = daysBetween(timestamp, now);
  if (days === 0) return "Today";
  if (days < 7) return "This week";
  return "Earlier";
}
