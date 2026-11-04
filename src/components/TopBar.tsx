import { ArrowLeft } from "lucide-react-native";
import { router } from "expo-router";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconButton, Text } from "@/components/ui";
import { space, useColors } from "@/theme";

type Props = {
  /** Screen title, or any element (e.g. the logo on Home). */
  title?: ReactNode;
  /** Show ← and go back. */
  back?: boolean;
  /** Replace ← with another leading control (e.g. ✕). */
  leading?: ReactNode;
  trailing?: ReactNode;
};

/** 56 px top bar under the status bar. design.md §1. */
export function TopBar({ title, back, leading, trailing }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const lead =
    leading ??
    (back ? (
      <IconButton icon={ArrowLeft} accessibilityLabel="Back" onPress={() => router.back()} />
    ) : null);

  return (
    <View style={{ paddingTop: insets.top, backgroundColor: colors.background }}>
      <View style={[styles.bar, lead ? styles.withLeading : null]}>
        {lead}
        <View style={styles.title}>
          {typeof title === "string" ? <Text variant="title">{title}</Text> : title}
        </View>
        <View style={styles.trailing}>{trailing}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: space.screenEdge,
    paddingRight: space.screenEdge - 10,
  },
  withLeading: { paddingLeft: space.screenEdge - 10, gap: 4 },
  title: { flex: 1 },
  trailing: { flexDirection: "row", alignItems: "center" },
});
