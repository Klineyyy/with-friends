/** Reporting (board 19). The sheet is `ReportSheet`; open it with `useReport()` from `safety.tsx`. */

/** What can be reported (scope §5 `reports.targetType`). `userId` = whose content it is. */
export type ReportTarget = { type: "post" | "comment" | "user"; id: string; userId: string };

/** Board 19 reasons, in board order. */
export const REPORT_REASONS = [
  { value: "spam", label: "It's spam" },
  { value: "harassment", label: "Bullying or harassment" },
  { value: "nudity", label: "Nudity or sexual content" },
  { value: "violence", label: "Violence or dangerous acts" },
  { value: "false_information", label: "False information" },
  { value: "other", label: "Something else" },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["value"];

export type Report = ReportTarget & { reason: ReportReason; createdAt: number };
