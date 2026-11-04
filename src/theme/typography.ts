import type { TextStyle } from "react-native";

/**
 * Roboto, loaded in the root layout. Android needs a separate font family per
 * weight, so weights are chosen with `fontFamily`, never `fontWeight`.
 */
export const fonts = {
  regular: "Roboto_400Regular",
  medium: "Roboto_500Medium",
  semibold: "Roboto_600SemiBold",
} as const;

/** Type roles from design.md §1. Hierarchy comes from weight, not size. */
export const typeScale = {
  display: { fontFamily: fonts.semibold, fontSize: 30, lineHeight: 36 },
  title: { fontFamily: fonts.semibold, fontSize: 22, lineHeight: 28 },
  username: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
  meta: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  button: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20 },
} satisfies Record<string, TextStyle>;

export type TypeVariant = keyof typeof typeScale;
