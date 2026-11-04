import { useColorScheme } from "react-native";

import { useAppearancePref } from "./appearance";
import { palette, type Colors } from "./colors";

export { setAppearancePref, useAppearancePref, type AppearancePref } from "./appearance";

export { fonts, typeScale, type TypeVariant } from "./typography";
export type { Colors };

/** Spacing from design.md §1: 16 px screen edge on an 8 px grid. */
export const space = {
  screenEdge: 16,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = { button: 8, input: 8 } as const;

/** Light or dark after applying the user's Appearance choice (default: follow the phone). */
export function useScheme(): "light" | "dark" {
  const pref = useAppearancePref();
  const system = useColorScheme();
  if (pref !== "system") return pref;
  return system === "dark" ? "dark" : "light";
}

export function useColors(): Colors {
  return palette[useScheme()];
}
