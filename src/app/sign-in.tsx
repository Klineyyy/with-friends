import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { Button, LogoMark, Screen, Text } from "@/components/ui";
import { useSocialSignIn, type Provider } from "@/lib/social-sign-in";

/** Board screen 1 · Sign in */
export default function SignIn() {
  const { signInWith, pending } = useSocialSignIn();
  const [error, setError] = useState<string | null>(null);

  async function onPress(provider: Provider) {
    setError(null);
    const outcome = await signInWith(provider);
    if (outcome.kind === "error") {
      setError("Couldn't sign in. Check your connection and try again.");
    }
    // signedIn → the route guards take over. cancelled → stay here quietly.
  }

  return (
    <Screen
      footer={
        <>
          {error ? (
            <Text variant="meta" tone="secondary" style={styles.centerText} accessibilityLiveRegion="polite">
              {error}
            </Text>
          ) : null}
          <Button
            label={pending === "google" ? "Opening Google…" : "Continue with Google"}
            variant="secondary"
            disabled={pending !== null}
            onPress={() => onPress("google")}
          />
          <Button
            label={pending === "apple" ? "Opening Apple…" : "Continue with Apple"}
            disabled={pending !== null}
            onPress={() => onPress("apple")}
          />
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
  centerText: { textAlign: "center" },
});
