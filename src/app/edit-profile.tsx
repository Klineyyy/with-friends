import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TopBar } from "@/components/TopBar";
import { Avatar, Button, Text, TextField } from "@/components/ui";
import { PROFILE_LIMITS } from "@/lib/format";
import { useMe, useUpdateProfile } from "@/lib/posts";
import { space, useColors } from "@/theme";

/**
 * Edit profile (not on the board; built from the design system).
 * Name and bio. TEMPORARY: saved in memory until Convex owns the profile (Phase 9).
 * Changing photo and username comes later.
 */
export default function EditProfile() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const me = useMe();
  const updateProfile = useUpdateProfile();
  const [displayName, setDisplayName] = useState(me.displayName);
  const [bio, setBio] = useState(me.bio ?? "");

  const changed = displayName.trim() !== me.displayName || bio.trim() !== (me.bio ?? "");

  function save() {
    updateProfile({ displayName: displayName.trim(), bio: bio.trim() });
    router.back();
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <TopBar
        back
        title="Edit profile"
        trailing={<Button label="Save" size="compact" disabled={!changed} onPress={save} style={styles.save} />}
      />
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + space.lg }]}
        >
          <View style={styles.photo}>
            <Avatar uri={me.avatarUri} size={80} accessibilityLabel="Your photo" />
            <Text variant="meta" tone="secondary">
              @{me.username}
            </Text>
          </View>
          <TextField
            label="Name"
            value={displayName}
            onChangeText={setDisplayName}
            maxLength={PROFILE_LIMITS.displayNameLength}
            autoCapitalize="words"
            textContentType="name"
            returnKeyType="next"
          />
          <View style={styles.bio}>
            <TextField
              label="Bio"
              value={bio}
              onChangeText={setBio}
              maxLength={PROFILE_LIMITS.bioLength}
              multiline
              placeholder="A line about you"
              style={styles.bioInput}
            />
            <Text variant="meta" tone="secondary" style={styles.counter}>
              {bio.length} / {PROFILE_LIMITS.bioLength}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  save: { marginRight: 10 },
  body: { paddingHorizontal: space.screenEdge, paddingTop: space.sm, gap: space.lg },
  photo: { alignItems: "flex-start", gap: space.sm },
  bio: { gap: 6 },
  bioInput: { height: 100, paddingTop: 12, paddingBottom: 12, textAlignVertical: "top" },
  counter: { alignSelf: "flex-end" },
});
