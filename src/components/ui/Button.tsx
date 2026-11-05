import type { ReactNode } from "react";
import { Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from "react-native";

import { radius, typeScale, useColors } from "@/theme";

import { Text } from "./Text";

type Props = Omit<PressableProps, "children" | "style"> & {
  label: string;
  variant?: "primary" | "secondary";
  size?: "large" | "compact";
  style?: StyleProp<ViewStyle>;
  /** Leading icon (e.g. the Google / Apple logo). Gets the label colour. */
  icon?: (color: string) => ReactNode;
};

/** Primary = filled, secondary = thin outline. Disabled = grey fill, grey text. */
export function Button({ label, variant = "primary", size = "large", disabled, icon, style, ...rest }: Props) {
  const colors = useColors();

  const fill = disabled
    ? { backgroundColor: colors.surface, borderColor: colors.surface }
    : variant === "primary"
      ? { backgroundColor: colors.text, borderColor: colors.text }
      : { backgroundColor: colors.background, borderColor: colors.divider };

  const labelColor = disabled
    ? colors.textSecondary
    : variant === "primary"
      ? colors.background
      : colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        size === "large" ? styles.large : styles.compact,
        fill,
        pressed && styles.pressed,
        style,
      ]}
      {...rest}
    >
      {icon ? icon(labelColor) : null}
      <Text style={[typeScale.button, { color: labelColor }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radius.button,
  },
  large: { height: 48, alignSelf: "stretch" },
  compact: { height: 32, paddingHorizontal: 16, borderRadius: 16 },
  pressed: { opacity: 0.7 },
});
