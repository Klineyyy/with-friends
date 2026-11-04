import * as SecureStore from "expo-secure-store";
import { useSyncExternalStore } from "react";
import { Appearance } from "react-native";

/** The user's choice in Appearance: follow the phone, or force light / dark. */
export type AppearancePref = "system" | "light" | "dark";

const KEY = "appearance";
const listeners = new Set<() => void>();

function read(): AppearancePref {
  try {
    const v = SecureStore.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system"; // web, or the store is unavailable
  }
}

/**
 * Applies the override to the whole app, native views included (glass tab bar,
 * alerts, keyboard, date pickers), so `useColorScheme()` reports the forced value.
 */
function apply(pref: AppearancePref) {
  Appearance.setColorScheme(pref === "system" ? "auto" : pref);
}

// Read synchronously at startup so the first frame is already the right colours.
let current = read();
if (current !== "system") apply(current);

export function setAppearancePref(pref: AppearancePref) {
  if (pref === current) return;
  current = pref;
  apply(pref);
  SecureStore.setItemAsync(KEY, pref).catch(() => {});
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAppearancePref(): AppearancePref {
  return useSyncExternalStore(subscribe, () => current);
}
