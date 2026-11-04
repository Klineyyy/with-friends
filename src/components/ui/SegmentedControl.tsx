import { Pressable, StyleSheet, View } from "react-native";

import { fonts, radius, useColors } from "@/theme";

import { Text } from "./Text";

type Props<T extends string> = {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
};

/** Equal-width choices on a grey track; the selected one sits on a raised chip. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: Props<T>) {
  const colors = useColors();

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={[styles.track, { backgroundColor: colors.surface }]}
    >
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            style={[
              styles.segment,
              selected && {
                backgroundColor: colors.background,
                boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
              },
            ]}
          >
            <Text
              variant="meta"
              style={{
                color: selected ? colors.text : colors.textSecondary,
                fontFamily: selected ? fonts.semibold : fonts.medium,
              }}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: "row", alignSelf: "stretch", borderRadius: radius.button, padding: 2 },
  segment: {
    flex: 1,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.button - 2,
  },
});
