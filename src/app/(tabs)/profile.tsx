import { StyleSheet, View } from "react-native";

import { TopBar } from "@/components/TopBar";
import { Avatar, Button, SegmentedControl, Text } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useFollowing, useMe } from "@/lib/posts";
import { setAppearancePref, space, useAppearancePref, useColors, type AppearancePref } from "@/theme";

const APPEARANCE: { value: AppearancePref; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

/** TEMPORARY placeholder for Your profile (board 11a–11b, Phase 4). Sign out and Appearance move to Settings in Phase 7. */
export default function Profile() {
  const colors = useColors();
  const me = useMe();
  const { signOut } = useAuth();
  const { clearAll } = useFollowing();
  const appearance = useAppearancePref();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <TopBar title={me.username} />
      <View style={styles.body}>
        <Avatar uri={me.avatarUri} size={80} accessibilityLabel="Your photo" />
        <Text variant="username">{me.displayName || me.username}</Text>
        <Text tone="secondary">Your profile comes in Phase 4.</Text>
        <View style={styles.appearance}>
          <Text variant="username">Appearance</Text>
          <SegmentedControl
            accessibilityLabel="Appearance"
            options={APPEARANCE}
            value={appearance}
            onChange={setAppearancePref}
          />
        </View>
        <View style={styles.buttons}>
          {__DEV__ ? (
            <Button
              label="Unfollow everyone (test empty Home)"
              variant="secondary"
              onPress={clearAll}
            />
          ) : null}
          <Button label="Sign out" variant="secondary" onPress={signOut} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { paddingHorizontal: space.screenEdge, gap: space.sm, alignItems: "flex-start" },
  appearance: { alignSelf: "stretch", gap: space.sm, marginTop: space.lg },
  buttons: { alignSelf: "stretch", gap: 12, marginTop: space.lg },
});
