import { useWaitlist } from "@clerk/expo";
import { ArrowLeft } from "lucide-react-native";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TopBar } from "@/components/TopBar";
import { Button, IconButton, Text, TextField } from "@/components/ui";
import { clerkMessage } from "@/lib/clerk-errors";
import { goBack } from "@/lib/go-back";
import { space, useColors } from "@/theme";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Request access. Not on the board; built from the design system.
 *
 * Clerk is in **Waitlist** mode: a new person can't create an account. They
 * get here from "Request access" on screen 1, or when Continue with Google /
 * Apple refuses a new account (social-sign-in.ts → "noAccount" → no-account.tsx). Joining adds
 * the email to Clerk's waitlist. Approve with `npm run approve -- <email>`
 * (scripts/approve.mjs); then they continue with Google / Apple
 * on the sign-in screen.
 */
export default function Waitlist() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { waitlist, fetchStatus } = useWaitlist();
  const [email, setEmail] = useState("");
  const [joined, setJoined] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const busy = fetchStatus === "fetching";
  const trimmed = email.trim();
  const canSubmit = EMAIL.test(trimmed) && !busy;

  async function join() {
    setError(null);
    const { error } = await waitlist.join({ emailAddress: trimmed });
    if (error) return setError(clerkMessage(error, "Couldn't join the waitlist. Check your connection and try again."));
    setJoined(trimmed);
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <TopBar
        title="Request access"
        leading={<IconButton icon={ArrowLeft} accessibilityLabel="Back" onPress={() => goBack("/sign-in")} />}
      />
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + space.lg }]}
        >
          {joined ? (
            <>
              <Text variant="title" accessibilityRole="header" accessibilityLiveRegion="polite">
                You&apos;re on the list
              </Text>
              <Text tone="secondary">
                We&apos;ll email {joined} if your request is approved. Then continue with the Google or Apple account
                that uses that email.
              </Text>
              <Button label="Done" onPress={() => goBack("/sign-in")} />
            </>
          ) : (
            <>
              <Text tone="secondary">
                With Friends is for people who know each other, so every new account is approved by hand. Leave
                your email and we&apos;ll let you know.
              </Text>
              <TextField
                label="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="go"
                autoFocus
                onSubmitEditing={() => canSubmit && join()}
              />
              {error ? (
                <Text variant="meta" tone="secondary" accessibilityLiveRegion="polite">
                  {error}
                </Text>
              ) : null}
              <Button label={busy ? "Sending…" : "Join the waitlist"} disabled={!canSubmit} onPress={join} />
              <Text variant="meta" tone="secondary">
                Use the email of the Google or Apple account you&apos;ll sign in with.
              </Text>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { paddingHorizontal: space.screenEdge, paddingTop: space.sm, gap: space.lg },
});
