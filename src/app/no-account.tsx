import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TopBar } from "@/components/TopBar";
import { Button, IconButton, Text } from "@/components/ui";
import { goBack } from "@/lib/go-back";
import { space, useColors } from "@/theme";

/**
 * No account yet. Not on the board; built from the design system.
 *
 * Shown when Continue with Google / Apple on the sign-in screen finds no account for
 * that Google / Apple account: Clerk is in Waitlist mode, so it didn't create
 * one. Points them to Request access, or back to try another account.
 */
export default function NoAccount() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <TopBar
        leading={<IconButton icon={ArrowLeft} accessibilityLabel="Back" onPress={() => goBack("/sign-in")} />}
      />
      <View style={[styles.body, { paddingBottom: Math.max(insets.bottom, space.md) }]}>
        <View style={styles.intro}>
          <Text variant="title" accessibilityRole="header">
            No account yet
          </Text>
          <Text tone="secondary">
            There&apos;s no With Friends account for that Google or Apple account. Every new member is approved
            by hand, so request access first.
          </Text>
          <Text tone="secondary">
            Once you&apos;re approved we&apos;ll email you. Then come back and continue with the same Google or
            Apple account.
          </Text>
          <Text variant="meta" tone="secondary">
            Already approved? Make sure you picked the account that uses the email you were approved with.
          </Text>
        </View>
        <View style={styles.actions}>
          <Button label="Request access" onPress={() => router.replace("/waitlist")} />
          <Button label="Try a different account" variant="secondary" onPress={() => goBack("/sign-in")} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1, paddingHorizontal: space.screenEdge, justifyContent: "space-between" },
  intro: { gap: space.md, paddingTop: space.sm },
  actions: { gap: 12 },
});
