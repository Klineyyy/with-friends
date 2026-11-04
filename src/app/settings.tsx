import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TopBar } from "@/components/TopBar";
import { Button, SegmentedControl, Text } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useClearConversations } from "@/lib/inbox";
import { useFollowing } from "@/lib/posts";
import { setAppearancePref, space, useAppearancePref, useColors, type AppearancePref } from "@/theme";

const APPEARANCE: { value: AppearancePref; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

/**
 * TEMPORARY Settings, opened from ≡ on your profile. Holds what used to sit on
 * the Profile placeholder. The full board 17 screen comes in Phase 7.
 */
export default function Settings() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const { clearAll } = useFollowing();
  const clearMessages = useClearConversations();
  const appearance = useAppearancePref();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <TopBar back title="Settings" />
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + space.lg }]}>
        <View style={styles.group}>
          <Text variant="username">Appearance</Text>
          <SegmentedControl
            accessibilityLabel="Appearance"
            options={APPEARANCE}
            value={appearance}
            onChange={setAppearancePref}
          />
        </View>
        <View style={styles.group}>
          {__DEV__ ? (
            <>
              <Button label="Unfollow everyone (test empty Home)" variant="secondary" onPress={clearAll} />
              <Button label="Clear messages (test empty Messages)" variant="secondary" onPress={clearMessages} />
            </>
          ) : null}
          <Button label="Sign out" variant="secondary" onPress={signOut} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { paddingHorizontal: space.screenEdge, paddingTop: space.sm, gap: space.lg },
  group: { gap: 12 },
});
