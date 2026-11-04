import { useColorScheme } from "react-native";

import { palette, type Colors } from "./colors";

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

export function useColors(): Colors {
  return useColorScheme() === "dark" ? palette.dark : palette.light;
}
