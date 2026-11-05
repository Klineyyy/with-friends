import { useReverification, useSession, useUser } from "@clerk/expo";
import { useEffect, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TopBar } from "@/components/TopBar";
import { Button, Text, TextField } from "@/components/ui";
import { clerkMessage } from "@/lib/clerk-errors";
import { goBack } from "@/lib/go-back";
import { useMe } from "@/lib/posts";
import { space, useColors } from "@/theme";

/** Matches `auth_password.min_length` on the Clerk instance. */
const MIN_LENGTH = 8;

type Reverify = { complete: () => void; cancel: () => void };

/**
 * Settings → Password (not on the board; built from the design system).
 * Adds a password to a Google / Apple account, or changes it, so you can also
 * sign in with your username (or email) and password.
 *
 * Setting a password is a sensitive action: if the session isn't fresh, Clerk
 * asks to reverify first. We do that with a code sent to your email.
 */
export default function PasswordSettings() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const { session } = useSession();
  const me = useMe();
  const hasPassword = user?.passwordEnabled ?? false;

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"form" | "code">("form");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reverify = useRef<Reverify | null>(null);
  /** Set when reverification failed and already showed its own message. */
  const reverifyFailed = useRef(false);

  // Leaving mid-reverification rejects the waiting request instead of leaving it hanging.
  useEffect(() => () => reverify.current?.cancel(), []);

  async function sendCode() {
    if (!session) throw new Error("No session");
    const verification = await session.startVerification({ level: "first_factor" });
    const factor = verification.supportedFirstFactors?.find((f) => f.strategy === "email_code");
    if (!factor || factor.strategy !== "email_code") throw new Error("No email on this account");
    await session.prepareFirstFactorVerification({ strategy: "email_code", emailAddressId: factor.emailAddressId });
  }

  const updatePassword = useReverification(
    (params: { newPassword: string; currentPassword?: string }) => user!.updatePassword(params),
    {
      onNeedsReverification: ({ complete, cancel }) => {
        reverify.current = { complete, cancel };
        sendCode()
          .then(() => {
            setBusy(false);
            setStep("code");
          })
          .catch((err) => {
            reverify.current = null;
            reverifyFailed.current = true;
            cancel();
            setError(clerkMessage(err, "Couldn't send a code to your email. Try again."));
          });
      },
    },
  );

  async function save() {
    setError(null);
    if (next.length < MIN_LENGTH) return setError(`Use at least ${MIN_LENGTH} characters.`);
    if (next !== confirm) return setError("The passwords don't match.");
    setBusy(true);
    reverifyFailed.current = false;
    try {
      await updatePassword({ newPassword: next, ...(hasPassword ? { currentPassword: current } : {}) });
      reverify.current = null;
      Alert.alert(
        hasPassword ? "Password changed" : "Password added",
        `You can now sign in with ${me.username ? `@${me.username}` : "your username"} or your email and this password.`,
      );
      goBack("/settings");
    } catch (err) {
      if (!reverifyFailed.current) setError(clerkMessage(err, "Couldn't save your password. Try again."));
      reverify.current = null;
      setStep("form");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    if (!session || !reverify.current) return;
    setError(null);
    setBusy(true);
    try {
      const result = await session.attemptFirstFactorVerification({ strategy: "email_code", code: code.trim() });
      if (result.status !== "complete") throw new Error("Verification incomplete");
      // Retries updatePassword; save() picks up from there.
      reverify.current.complete();
    } catch (err) {
      setBusy(false);
      setError(clerkMessage(err, "That code didn't work. Try again."));
    }
  }

  const canSave =
    step === "form"
      ? next.length > 0 && confirm.length > 0 && (!hasPassword || current.length > 0)
      : code.trim().length >= 6;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <TopBar back title={hasPassword ? "Change password" : "Add password"} />
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + space.lg }]}
        >
          {step === "form" ? (
            <>
              <Text tone="secondary">
                {hasPassword
                  ? "Change the password you use with your username or email."
                  : `Add a password so you can sign in with ${me.username ? `@${me.username}` : "your username"} or your email, without Google or Apple. You can still use those too.`}
              </Text>
              {hasPassword ? (
                <TextField
                  label="Current password"
                  value={current}
                  onChangeText={setCurrent}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="current-password"
                  textContentType="password"
                />
              ) : null}
              <TextField
                label="New password"
                value={next}
                onChangeText={setNext}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
                placeholder={`At least ${MIN_LENGTH} characters`}
              />
              <TextField
                label="Confirm new password"
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
                onSubmitEditing={() => canSave && !busy && save()}
              />
            </>
          ) : (
            <>
              <Text tone="secondary">
                To keep your account safe, enter the code we just emailed to{" "}
                {user?.primaryEmailAddress?.emailAddress ?? "you"}.
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
                onSubmitEditing={() => canSave && !busy && verifyCode()}
              />
            </>
          )}

          {error ? (
            <Text variant="meta" tone="secondary" accessibilityLiveRegion="polite">
              {error}
            </Text>
          ) : null}

          <Button
            label={busy ? "Saving…" : step === "code" ? "Verify" : hasPassword ? "Change password" : "Add password"}
            disabled={!canSave || busy}
            onPress={step === "code" ? verifyCode : save}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { paddingHorizontal: space.screenEdge, paddingTop: space.sm, gap: space.lg },
});
