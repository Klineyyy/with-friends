import { useMutation, useQuery } from "convex/react";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { ReportSheet } from "@/components/ReportSheet";
import { api } from "@/convex/_generated/api";

import type { ReportTarget } from "./report";

/**
 * Reports and notification settings (board 18, 19).
 *
 * Reports go to the Convex `reports` table, reviewed by hand in the Convex
 * dashboard (scope A5). Notification settings are stored on the user
 * (`users.notificationPrefs`); push that respects them is Phase 10.
 */

/** Board 18: which pushes your phone gets. Activity always shows everything. */
export type NotificationPrefs = { likes: boolean; comments: boolean; follows: boolean; messages: boolean };

const DEFAULT_PREFS: NotificationPrefs = { likes: true, comments: true, follows: true, messages: true };

type Store = {
  /** Opens the report sheet (board 19). */
  report: (target: ReportTarget) => void;
};

const SafetyContext = createContext<Store | null>(null);

/** Goes inside `PostsProvider` (it reads people and blocks). Renders the one report sheet. */
export function SafetyProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<ReportTarget | null>(null);
  // Bumped on every open so the sheet starts fresh (no reason picked, not sent).
  const [openCount, setOpenCount] = useState(0);
  const createReport = useMutation(api.reports.create);

  const report = useCallback((t: ReportTarget) => {
    setTarget(t);
    setOpenCount((n) => n + 1);
  }, []);

  const store = useMemo(() => ({ report }), [report]);

  return (
    <SafetyContext.Provider value={store}>
      {children}
      <ReportSheet
        key={openCount}
        target={target}
        onClose={() => setTarget(null)}
        onSend={(reason) => {
          if (!target) return;
          createReport({ targetType: target.type, targetId: target.id, targetUserId: target.userId, reason }).catch(
            (error) => console.warn("Report failed", error),
          );
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
  const me = useQuery(api.users.me);
  const setPref = useMutation(api.users.setNotificationPref).withOptimisticUpdate((store, { key, on }) => {
    const current = store.getQuery(api.users.me, {});
    if (current) store.setQuery(api.users.me, {}, { ...current, notificationPrefs: { ...current.notificationPrefs, [key]: on } });
  });
  return {
    prefs: me?.notificationPrefs ?? DEFAULT_PREFS,
    setPref: (key: keyof NotificationPrefs, on: boolean) => {
      setPref({ key, on }).catch((error) => console.warn(error));
    },
  };
}
