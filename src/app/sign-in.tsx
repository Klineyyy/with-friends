import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppleIcon, GoogleIcon } from "@/components/BrandIcons";
import { Button, LogoMark, Text, TextField } from "@/components/ui";
import { usePasswordSignIn } from "@/lib/password-sign-in";
import { useSocialSignIn, type Provider } from "@/lib/social-sign-in";
import { fonts, space, useColors } from "@/theme";

/**
 * Board screen 1 · Sign in. Redesigned 2026-11-06 for the waitlist:
 * logo and tagline, then one outlined card "Have an account?" with username
 * (or email) + password and Google / Apple, then "New here? Request access".
 *
 * Google / Apple for someone with no account (Clerk is in Waitlist mode, so it
 * doesn't create one) → no-account.tsx.
 */
export default function SignIn() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const pw = usePasswordSignIn();
  const { signInWith, pending } = useSocialSignIn();
  const [socialError, setSocialError] = useState<string | null>(null);

  const anyBusy = pw.busy || pending !== null;

  async function onSocial(provider: Provider) {
    setSocialError(null);
    const outcome = await signInWith(provider);
    if (outcome.kind === "noAccount") router.push("/no-account");
    else if (outcome.kind === "error") setSocialError("Couldn't sign in. Check your connection and try again.");
    // signedIn → the route guards take over. cancelled → stay here quietly.
  }

  const error = pw.error ?? socialError;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + space.xl, paddingBottom: Math.max(insets.bottom, space.md) + space.md },
        ]}
      >
        <View style={styles.brand}>
          <LogoMark width={58} />
          <Text variant="display" style={styles.name} accessibilityRole="header">
            With Friends
          </Text>
          <Text tone="secondary">Photos and videos, just for your circle.</Text>
        </View>

        <View style={[styles.card, { borderColor: colors.divider }]}>
          <Text variant="title" accessibilityRole="header">
            Have an account?
          </Text>

          {pw.step === "password" ? (
            <>
              <TextField
                label="Username or email"
                value={pw.identifier}
                onChangeText={pw.setIdentifier}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username"
                textContentType="username"
                returnKeyType="next"
              />
              <TextField
                label="Password"
                value={pw.password}
                onChangeText={pw.setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="current-password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={() => pw.canSubmit && pw.submit()}
              />
            </>
          ) : (
            <>
              <Text tone="secondary">
                {pw.codeSentTo
                  ? `This is a new device. Enter the code we emailed to ${pw.codeSentTo}.`
                  : "This is a new device. Enter the code we emailed you."}
              </Text>
              <TextField
                label="Code"
                value={pw.code}
                onChangeText={pw.setCode}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                maxLength={6}
                autoFocus
                onSubmitEditing={() => pw.canSubmit && pw.submit()}
              />
            </>
          )}

          {error ? (
            <Text variant="meta" tone="secondary" accessibilityLiveRegion="polite">
              {error}
            </Text>
          ) : null}

          <Button
            label={pw.busy ? "Signing in…" : pw.step === "password" ? "Sign in" : "Verify"}
            disabled={!pw.canSubmit || pending !== null}
            onPress={pw.submit}
          />
          {pw.step === "code" ? (
            <Button label="Use a different account" variant="secondary" onPress={pw.backToPassword} />
          ) : (
            <>
              <View style={styles.or} accessibilityRole="text">
                <View style={[styles.orLine, { backgroundColor: colors.divider }]} />
                <Text variant="meta" tone="secondary">
                  or
                </Text>
                <View style={[styles.orLine, { backgroundColor: colors.divider }]} />
              </View>
              <Button
                label={pending === "google" ? "Opening Google…" : "Continue with Google"}
                variant="secondary"
                icon={() => <GoogleIcon />}
                disabled={anyBusy}
                onPress={() => onSocial("google")}
              />
              <Button
                label={pending === "apple" ? "Opening Apple…" : "Continue with Apple"}
                icon={(color) => <AppleIcon color={color} />}
                disabled={anyBusy}
                onPress={() => onSocial("apple")}
              />
            </>
          )}
        </View>

        <Text
          variant="meta"
          tone="secondary"
          style={styles.link}
          accessibilityRole="link"
          accessibilityLabel="New here? Request access"
          onPress={() => router.push("/waitlist")}
          suppressHighlighting={false}
        >
          New here?{" "}
          <Text variant="meta" style={[styles.linkAction, { color: colors.text }]}>
            Request access
          </Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: "center", paddingHorizontal: space.screenEdge, gap: space.lg },
  brand: { alignItems: "center" },
  name: { marginTop: 20, marginBottom: 8 },
  card: { borderWidth: 1, borderRadius: 12, padding: space.md, gap: space.md },
  or: { flexDirection: "row", alignItems: "center", gap: 12 },
  orLine: { flex: 1, height: StyleSheet.hairlineWidth * 2 },
  link: { textAlign: "center", paddingVertical: space.sm },
  linkAction: { fontFamily: fonts.medium, textDecorationLine: "underline" },
});
