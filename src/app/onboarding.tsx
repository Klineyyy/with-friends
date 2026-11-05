import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { Check } from "lucide-react-native";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { Avatar, Button, Checkbox, Screen, Text, TextField } from "@/components/ui";
import { useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth";
import { errorMessage } from "@/lib/convex";
import { normalizeUsername, usernameFormatError, USERNAME_MAX } from "@/lib/username";
import { useColors } from "@/theme";

type Availability =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "available" }
  | { state: "taken" }
  | { state: "invalid"; message: string };

/** Board screen 3 · Onboarding */
export default function Onboarding() {
  const { account, completeOnboarding } = useAuth();
  const colors = useColors();

  // Defaults to the Google/Apple photo Clerk already has.
  const [avatarUri, setAvatarUri] = useState(account?.avatarUri ?? null);
  const [newAvatarUri, setNewAvatarUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [agreed, setAgreed] = useState(false);
  // Ask the server once typing pauses for 300 ms (unique `username` index).
  const [debounced, setDebounced] = useState("");

  const username = normalizeUsername(input);
  const formatError = username === "" ? null : usernameFormatError(username);
  const needsCheck = username !== "" && formatError === null;

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(username), 300);
    return () => clearTimeout(timer);
  }, [username]);
  const available = useQuery(api.users.usernameAvailable, needsCheck && debounced === username ? { username } : "skip");

  const availability: Availability =
    username === ""
      ? { state: "idle" }
      : formatError
        ? { state: "invalid", message: formatError }
        : available !== undefined && debounced === username
          ? { state: available ? "available" : "taken" }
          : { state: "checking" };

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setAvatarUri(asset.uri);
    setNewAvatarUri(asset.uri);
  }

  async function submit() {
    setSaving(true);
    setSaveError(null);
    try {
      await completeOnboarding({ username, newAvatarUri });
      // On success the route guard moves to Home; this screen unmounts.
    } catch (error) {
      setSaveError(errorMessage(error, "Couldn't save. Check your connection and try again."));
      setSaving(false);
    }
  }

  const canContinue = agreed && availability.state === "available" && !saving;

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.flex}>
      <Screen
        footer={
          <>
            {saveError ? (
              <Text variant="meta" tone="secondary" accessibilityLiveRegion="polite">
                {saveError}
              </Text>
            ) : null}
            <Button label={saving ? "Saving…" : "Continue"} disabled={!canContinue} onPress={submit} />
          </>
        }
      >
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <View style={styles.intro}>
            <Text variant="title" accessibilityRole="header">
              Welcome
            </Text>
            <Text tone="secondary">Pick a username. It shows on everything you share.</Text>
          </View>

          <View style={styles.photoRow}>
            <Avatar uri={avatarUri} size={80} accessibilityLabel="Profile photo" />
            <View style={styles.photoText}>
              <Text variant="username">Profile photo</Text>
              <Pressable accessibilityRole="button" onPress={pickPhoto} hitSlop={12}>
                <Text tone="secondary" style={styles.link}>
                  Change photo
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.field}>
            <TextField
              label="Username"
              value={input}
              onChangeText={setInput}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username-new"
              maxLength={USERNAME_MAX}
              returnKeyType="done"
            />
            <UsernameHint availability={availability} username={username} color={colors.textSecondary} />
          </View>

          <View style={styles.termsRow}>
            <Checkbox checked={agreed} onChange={setAgreed} accessibilityLabel="I agree to the Terms and Community rules" />
            <Text style={styles.termsText} onPress={() => setAgreed(!agreed)}>
              I agree to the{" "}
              <Text style={styles.link} accessibilityRole="link" onPress={() => router.push("/terms")}>
                Terms
              </Text>{" "}
              and{" "}
              <Text style={styles.link} accessibilityRole="link" onPress={() => router.push("/rules")}>
                Community rules
              </Text>
            </Text>
          </View>
        </ScrollView>
      </Screen>
    </KeyboardAvoidingView>
  );
}

function UsernameHint({
  availability,
  username,
  color,
}: {
  availability: Availability;
  username: string;
  color: string;
}) {
  // Fixed height so the layout doesn't jump as the hint changes.
  return (
    <View style={styles.hint} accessibilityLiveRegion="polite">
      {availability.state === "available" && (
        <>
          <Check size={14} strokeWidth={2} color={color} />
          <Text variant="meta" tone="secondary">
            {username} is available
          </Text>
        </>
      )}
      {availability.state === "checking" && (
        <Text variant="meta" tone="secondary">
          Checking…
        </Text>
      )}
      {availability.state === "taken" && (
        <Text variant="meta" tone="secondary">
          {username} is taken
        </Text>
      )}
      {availability.state === "invalid" && (
        <Text variant="meta" tone="secondary">
          {availability.message}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingTop: 32 },
  intro: { gap: 8 },
  photoRow: { flexDirection: "row", alignItems: "center", gap: 16, marginTop: 28 },
  photoText: { gap: 2 },
  link: { textDecorationLine: "underline" },
  field: { marginTop: 28 },
  hint: { flexDirection: "row", alignItems: "center", gap: 6, height: 28 },
  termsRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 20 },
  termsText: { flex: 1 },
});
