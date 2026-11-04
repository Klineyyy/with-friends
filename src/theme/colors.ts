/** Design tokens from design.md §1. Light/dark follow the system setting. */
export const palette = {
  light: {
    background: "#FFFFFF",
    text: "#000000",
    textSecondary: "#6B6F76",
    divider: "#E4E4E7",
    fern: "#5A9E1A",
    surface: "#F2F2F3",
  },
  dark: {
    background: "#000000",
    text: "#FFFFFF",
    textSecondary: "#A1A1AA",
    divider: "#27272A",
    fern: "#A3E635",
    surface: "#18181B",
  },
} as const;

export type Colors = { [K in keyof typeof palette.light]: string };
