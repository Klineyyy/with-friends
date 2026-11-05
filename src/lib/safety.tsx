import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { ReportSheet } from "@/components/ReportSheet";

import type { Report, ReportTarget } from "./report";

/**
 * Reports and notification settings (board 18, 19).
 *
 * TEMPORARY: reports and notification settings are kept in memory and reset on
 * reload. Phase 9 sends reports to the Convex `reports` table (reviewed in the
 * Convex dashboard, scope A5); Phase 10 stores the notification settings with
 * the user so push respects them.
 */

/** Board 18: which pushes your phone gets. Activity always shows everything. */
export type NotificationPrefs = { likes: boolean; comments: boolean; follows: boolean; messages: boolean };

const DEFAULT_PREFS: NotificationPrefs = { likes: true, comments: true, follows: true, messages: true };

type Store = {
  /** Opens the report sheet (board 19). */
  report: (target: ReportTarget) => void;
  notificationPrefs: NotificationPrefs;
  setNotificationPref: (key: keyof NotificationPrefs, on: boolean) => void;
};

const SafetyContext = createContext<Store | null>(null);

/** Goes inside `PostsProvider` (it reads people and blocks). Renders the one report sheet. */
export function SafetyProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<ReportTarget | null>(null);
  // Bumped on every open so the sheet starts fresh (no reason picked, not sent).
  const [openCount, setOpenCount] = useState(0);
  const [, setReports] = useState<Report[]>([]);
  const [notificationPrefs, setPrefs] = useState(DEFAULT_PREFS);

  const report = useCallback((t: ReportTarget) => {
    setTarget(t);
    setOpenCount((n) => n + 1);
  }, []);

  const setNotificationPref = useCallback(
    (key: keyof NotificationPrefs, on: boolean) => setPrefs((p) => ({ ...p, [key]: on })),
    [],
  );

  const store = useMemo(
    () => ({ report, notificationPrefs, setNotificationPref }),
    [report, notificationPrefs, setNotificationPref],
  );

  return (
    <SafetyContext.Provider value={store}>
      {children}
      <ReportSheet
        key={openCount}
        target={target}
        onClose={() => setTarget(null)}
        onSend={(reason) => {
          if (!target) return;
          // TEMPORARY: kept in memory. Phase 9: Convex `createReport` mutation.
          setReports((all) => [...all, { ...target, reason, createdAt: Date.now() }]);
        }}
      />
    </SafetyContext.Provider>
  );
}

function useStore(): Store {
  const store = useContext(SafetyContext);
  if (!store) throw new Error("Safety hooks must be used inside <SafetyProvider>");
  return store;
}

/** `report({ type: "post", id, userId })` opens the report sheet. */
export function useReport() {
  return useStore().report;
}

export function useNotificationPrefs() {
  const { notificationPrefs, setNotificationPref } = useStore();
  return { prefs: notificationPrefs, setPref: setNotificationPref };
}
