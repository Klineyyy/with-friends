import { StyleSheet, View } from "react-native";

import { Button, LogoMark, Screen, Text } from "@/components/ui";
import { useAuth } from "@/lib/auth";

/** Board screen 1 · Sign in */
export default function SignIn() {
  const { signInWithGoogle, signInWithApple } = useAuth();

  return (
    <Screen
      footer={
        <>
          <Button label="Continue with Google" variant="secondary" onPress={signInWithGoogle} />
          <Button label="Continue with Apple" onPress={signInWithApple} />
          <Text variant="meta" tone="secondary" style={styles.footnote}>
            With Friends is invite-only. Use the account your invite was sent to.
          </Text>
        </>
      }
    >
      <View style={styles.center}>
        <LogoMark width={58} />
        <Text variant="display" style={styles.name} accessibilityRole="header">
          With Friends
        </Text>
        <Text tone="secondary">Photos and videos, just for your circle.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  name: { marginTop: 20, marginBottom: 8 },
  footnote: { textAlign: "center", paddingHorizontal: 8 },
});
