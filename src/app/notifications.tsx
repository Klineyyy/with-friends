import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SettingsRow } from "@/components/SettingsRow";
import { TopBar } from "@/components/TopBar";
import { Switch, Text } from "@/components/ui";
import { useNotificationPrefs, type NotificationPrefs } from "@/lib/safety";
import { space, useColors } from "@/theme";

const ROWS: { key: keyof NotificationPrefs; label: string; description: string }[] = [
  { key: "likes", label: "Likes", description: "When someone likes your post" },
  { key: "comments", label: "Comments", description: "When someone comments on your post" },
  { key: "follows", label: "Follows", description: "When someone follows you" },
  { key: "messages", label: "Messages", description: "When someone sends you a message" },
];

/**
 * Board 18. Saved on your user in Convex (`users.notificationPrefs`); push that
 * respects them arrives in Phase 10.
 */
export default function NotificationSettings() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { prefs, setPref } = useNotificationPrefs();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <TopBar back title="Notifications" />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + space.md }}>
        <Text variant="meta" tone="secondary" style={styles.intro}>
          Choose what your phone tells you about. Everything still shows in Activity.
        </Text>
        {ROWS.map((row) => (
          <SettingsRow
            key={row.key}
            label={row.label}
            description={row.description}
            trailing={
              <Switch
                value={prefs[row.key]}
                onChange={(on) => setPref(row.key, on)}
                accessibilityLabel={`${row.label}: ${row.description}`}
              />
            }
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  intro: { paddingHorizontal: space.screenEdge, paddingBottom: space.sm },
});
