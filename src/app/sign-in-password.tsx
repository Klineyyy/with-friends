import { useSignIn } from "@clerk/expo";
import { ArrowLeft } from "lucide-react-native";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TopBar } from "@/components/TopBar";
import { Button, IconButton, Text, TextField } from "@/components/ui";
import { clerkCode, clerkMessage } from "@/lib/clerk-errors";
import { goBack } from "@/lib/go-back";
import { space, useColors } from "@/theme";

/**
 * Sign in with username (or email) and password. Not on the board; built from
 * the design system. A password is added in Settings → Password after a first
 * Google / Apple sign-in, so there's no sign-up here.
 *
 * Clerk's Device Trust may ask for an emailed code the first time a password
 * is used on a new phone (`needs_client_trust`).
 */
export default function SignInPassword() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signIn, fetchStatus } = useSignIn();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"password" | "code">("password");
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const busy = fetchStatus === "fetching";

  async function finish() {
    // The route guards in _layout.tsx move on once the session is active.
    const { error } = await signIn.finalize({ navigate: () => {} });
    if (error) setError(clerkMessage(error, "Couldn't sign in. Try again."));
  }

  async function submitPassword() {
    setError(null);
    const { error } = await signIn.password({
      identifier: identifier.trim().replace(/^@/, ""),
      password,
    });
    if (error) {
      const code = clerkCode(error);
      setError(
        code === "form_identifier_not_found"
          ? "No account with that username or email."
          : code === "form_password_incorrect"
            ? "Wrong password. Try again."
            : clerkMessage(error, "Couldn't sign in. Check your connection and try again."),
      );
      return;
    }
    if (signIn.status === "complete") return finish();
    if (signIn.status === "needs_client_trust" || signIn.status === "needs_second_factor") {
      const emailFactor = signIn.supportedSecondFactors?.find((f) => f.strategy === "email_code");
      if (emailFactor) {
        const { error: sendError } = await signIn.mfa.sendEmailCode();
        if (sendError) return setError(clerkMessage(sendError, "Couldn't send the code. Try again."));
        setCodeSentTo("safeIdentifier" in emailFactor ? emailFactor.safeIdentifier : null);
        setStep("code");
        return;
      }
    }
    setError("This account needs a sign-in step the app doesn't support yet. Use Google or Apple.");
  }

  async function submitCode() {
    setError(null);
    const { error } = await signIn.mfa.verifyEmailCode({ code: code.trim() });
    if (error) return setError(clerkMessage(error, "That code didn't work. Try again."));
    if (signIn.status === "complete") return finish();
    setError("Couldn't sign in. Try again.");
  }

  async function backToPassword() {
    await signIn.reset();
    setCode("");
    setError(null);
    setStep("password");
  }

  const canSubmit =
    step === "password" ? identifier.trim().length > 0 && password.length > 0 : code.trim().length >= 6;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <TopBar
        title="Sign in"
        leading={
          <IconButton
            icon={ArrowLeft}
            accessibilityLabel="Back"
            onPress={() => (step === "code" ? backToPassword() : goBack("/sign-in"))}
          />
        }
      />
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + space.lg }]}
        >
          {step === "password" ? (
            <>
              <TextField
                label="Username or email"
                value={identifier}
                onChangeText={setIdentifier}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username"
                textContentType="username"
                returnKeyType="next"
                autoFocus
              />
              <TextField
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="current-password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={() => canSubmit && !busy && submitPassword()}
              />
            </>
          ) : (
            <>
              <Text tone="secondary">
                {codeSentTo
                  ? `This is a new device. Enter the code we emailed to ${codeSentTo}.`
                  : "This is a new device. Enter the code we emailed you."}
              </Text>
              <TextField
                label="Code"
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                maxLength={6}
                autoFocus
                onSubmitEditing={() => canSubmit && !busy && submitCode()}
              />
            </>
          )}

          {error ? (
            <Text variant="meta" tone="secondary" accessibilityLiveRegion="polite">
              {error}
            </Text>
          ) : null}

          <Button
            label={busy ? "Signing in…" : step === "password" ? "Sign in" : "Verify"}
            disabled={!canSubmit || busy}
            onPress={step === "password" ? submitPassword : submitCode}
          />

          {step === "password" ? (
            <Text variant="meta" tone="secondary">
              No password yet, or forgot it? Continue with Google or Apple, then go to Settings → Password.
            </Text>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { paddingHorizontal: space.screenEdge, paddingTop: space.sm, gap: space.lg },
});
