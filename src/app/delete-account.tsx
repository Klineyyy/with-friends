import { router } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TopBar } from "@/components/TopBar";
import { Button, Checkbox, Text } from "@/components/ui";
import { INVITE_ONLY } from "@/lib/app-info";
import { useAuth } from "@/lib/auth";
import { space, useColors } from "@/theme";

/**
 * Board 21. The copy follows the scope (messages stay, shown as "Deleted user"),
 * not the board's "messages for everyone": design.md §6 conflict 3.
 */
export default function DeleteAccount() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { deleteAccount } = useAuth();
  const [understood, setUnderstood] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function onDelete() {
    setDeleting(true);
    try {
      // Signs you out; the route guard then shows sign-in.
      await deleteAccount();
    } catch (e) {
      setDeleting(false);
      Alert.alert("Couldn't delete your account", e instanceof Error ? e.message : "Try again in a moment.");
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <TopBar back title="Delete account" />
      <ScrollView contentContainerStyle={styles.body}>
        <Text variant="title">Delete your account?</Text>
        <Text>
          This removes your profile, posts, comments, and likes. Messages you sent stay in the other
          person&apos;s chat, shown as from &quot;Deleted user&quot;. You can&apos;t undo this.
        </Text>
        {INVITE_ONLY ? <Text tone="secondary">To come back later, you&apos;ll need a new invitation.</Text> : null}
        <View style={styles.check}>
          <Checkbox
            checked={understood}
            onChange={setUnderstood}
            accessibilityLabel="I understand this can't be undone"
          />
          <Text style={styles.flex} onPress={() => setUnderstood(!understood)}>
            I understand this can&apos;t be undone
          </Text>
        </View>
      </ScrollView>
      <View style={[styles.buttons, { paddingBottom: insets.bottom + space.md }]}>
        <Button
          label={deleting ? "Deleting…" : "Delete account"}
          disabled={!understood || deleting}
          onPress={() => void onDelete()}
        />
        <Button label="Cancel" variant="secondary" disabled={deleting} onPress={() => router.back()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  body: { paddingHorizontal: space.screenEdge, paddingTop: space.md, gap: 12 },
  check: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: space.sm },
  buttons: { paddingHorizontal: space.screenEdge, gap: 12 },
});
