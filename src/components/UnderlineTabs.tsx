import { Pressable, StyleSheet, View } from "react-native";

import { Text } from "@/components/ui";
import { fonts, useColors } from "@/theme";

type Props<T extends string> = {
  tabs: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

/** Equal-width text tabs with an underline under the active one (board 13). */
export function UnderlineTabs<T extends string>({ tabs, value, onChange }: Props<T>) {
  const colors = useColors();
  return (
    <View
      role="tablist"
      style={[styles.row, { borderBottomColor: colors.divider }]}
    >
      {tabs.map((tab) => {
        const selected = tab.value === value;
        return (
          <Pressable
            key={tab.value}
            role="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(tab.value)}
            style={styles.tab}
          >
            <Text
              style={{
                color: selected ? colors.text : colors.textSecondary,
                fontFamily: selected ? fonts.semibold : fonts.regular,
              }}
            >
              {tab.label}
            </Text>
            <View style={[styles.underline, selected && { backgroundColor: colors.text }]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth * 2 },
  tab: { flex: 1, height: 48, alignItems: "center", justifyContent: "center" },
  underline: { position: "absolute", left: 0, right: 0, bottom: -1, height: 2 },
});
