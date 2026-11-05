import { Pressable, StyleSheet, View } from "react-native";

import { useColors } from "@/theme";

type Props = {
  value: boolean;
  onChange: (value: boolean) => void;
  accessibilityLabel: string;
};

/**
 * design.md §1: on = black track, white knob; off = outline with a grey knob.
 * No slide animation (the like heart is the app's only animation).
 */
export function Switch({ value, onChange, accessibilityLabel }: Props) {
  const colors = useColors();
  return (
    <Pressable
      role="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={accessibilityLabel}
      onPress={() => onChange(!value)}
      hitSlop={8}
      style={[
        styles.track,
        value
          ? { backgroundColor: colors.text, borderColor: colors.text, justifyContent: "flex-end" }
          : { backgroundColor: colors.background, borderColor: colors.textSecondary },
      ]}
    >
      <View
        style={[
          value ? styles.knobOn : styles.knobOff,
          { backgroundColor: value ? colors.background : colors.textSecondary },
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 52,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 3,
  },
  knobOn: { width: 24, height: 24, borderRadius: 12 },
  knobOff: { width: 16, height: 16, borderRadius: 8, marginLeft: 4 },
});
