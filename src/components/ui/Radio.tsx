import { StyleSheet, View } from "react-native";

import { useColors } from "@/theme";

/**
 * design.md §1: black ring + dot when selected. Visual only: put it inside a
 * pressable row that carries `role="radio"` and the label (see `RadioRow`).
 */
export function Radio({ selected }: { selected: boolean }) {
  const colors = useColors();
  return (
    <View style={[styles.ring, { borderColor: selected ? colors.text : colors.textSecondary }]}>
      {selected ? <View style={[styles.dot, { backgroundColor: colors.text }]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: { width: 12, height: 12, borderRadius: 6 },
});
