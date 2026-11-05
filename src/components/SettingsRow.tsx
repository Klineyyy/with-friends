import { ChevronRight, type LucideIcon } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { Radio, Text } from "@/components/ui";
import { space, useColors } from "@/theme";

type Props = {
  icon?: LucideIcon;
  label: string;
  /** One line under the label (e.g. "Removes your profile, posts, and likes"). */
  description?: string;
  /** Grey text before the chevron (e.g. the blocked count, "System"). */
  value?: string;
  /** Show › (rows that open another screen). */
  chevron?: boolean;
  /** Replaces value + chevron (e.g. a Switch on board 18). */
  trailing?: ReactNode;
  onPress?: () => void;
};

/** Board 17 / 18 row: 24 px icon, label over an optional description, value and ›. */
export function SettingsRow({ icon: Icon, label, description, value, chevron, trailing, onPress }: Props) {
  const colors = useColors();
  const content = (
    <>
      {Icon ? <Icon size={24} strokeWidth={1.75} color={colors.text} /> : null}
      <View style={styles.text}>
        <Text>{label}</Text>
        {description ? (
          <Text variant="meta" tone="secondary">
            {description}
          </Text>
        ) : null}
      </View>
      {trailing ?? (
        <>
          {value ? (
            <Text variant="meta" tone="secondary">
              {value}
            </Text>
          ) : null}
          {chevron ? <ChevronRight size={20} strokeWidth={1.75} color={colors.textSecondary} /> : null}
        </>
      )}
    </>
  );

  if (!onPress) return <View style={styles.row}>{content}</View>;
  return (
    <Pressable
      accessibilityRole={chevron ? "link" : "button"}
      accessibilityLabel={value ? `${label}, ${value}` : label}
      accessibilityHint={description}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surface }]}
    >
      {content}
    </Pressable>
  );
}

/** A full-width row with a radio on the left (board 19 reasons, Appearance). */
export function RadioRow({
  label,
  description,
  selected,
  onPress,
}: {
  label: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      role="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      accessibilityHint={description}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surface }]}
    >
      <Radio selected={selected} />
      <View style={styles.text}>
        <Text>{label}</Text>
        {description ? (
          <Text variant="meta" tone="secondary">
            {description}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

/** Full-width hairline between groups of rows (board 17). */
export function SettingsDivider() {
  const colors = useColors();
  return <View style={[styles.divider, { backgroundColor: colors.divider }]} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    minHeight: 56,
    paddingVertical: space.sm,
    paddingHorizontal: space.screenEdge,
  },
  text: { flex: 1, gap: 2 },
  divider: { height: StyleSheet.hairlineWidth * 2, marginVertical: space.sm },
});
