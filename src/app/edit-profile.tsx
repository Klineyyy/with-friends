import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TopBar } from "@/components/TopBar";
import { Avatar, Button, Text, TextField } from "@/components/ui";
import { PROFILE_LIMITS } from "@/lib/format";
import { goBack } from "@/lib/go-back";
import { errorMessage } from "@/lib/convex";
import { useMe, useSetAvatar, useUpdateProfile } from "@/lib/posts";
import { fonts, space, useColors } from "@/theme";

/**
 * Edit profile (not on the board; built from the design system).
 * Photo, name and bio, saved to Convex. A new photo is uploaded and saved as
 * soon as it's picked (no Save needed). Changing username comes later.
 */
export default function EditProfile() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const me = useMe();
  const updateProfile = useUpdateProfile();
  const setAvatar = useSetAvatar();
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);

  async function changePhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;
    const uri = result.assets[0].uri;
    setPendingPhoto(uri);
    try {
      await setAvatar(uri);
    } catch (error) {
      Alert.alert("Couldn't change photo", errorMessage(error, "Check your connection and try again."));
    } finally {
      setPendingPhoto(null);
    }
  }
  const [displayName, setDisplayName] = useState(me.displayName);
  const [bio, setBio] = useState(me.bio ?? "");

  const changed = displayName.trim() !== me.displayName || bio.trim() !== (me.bio ?? "");

  function save() {
    updateProfile({ displayName: displayName.trim(), bio: bio.trim() }).catch((error) =>
      Alert.alert("Couldn't save", errorMessage(error, "Check your connection and try again.")),
    );
    goBack();
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
            <Pressable
              onPress={changePhoto}
              disabled={pendingPhoto !== null}
              accessibilityRole="button"
              accessibilityLabel="Change photo"
              style={styles.photoButton}
            >
              <Avatar uri={pendingPhoto ?? me.avatarUri} size={80} accessibilityLabel="Your photo" />
              <Text variant="meta" style={styles.changePhoto}>
                {pendingPhoto ? "Uploading…" : "Change photo"}
              </Text>
            </Pressable>
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
  photoButton: { alignItems: "center", gap: space.sm },
  changePhoto: { fontFamily: fonts.medium },
  bio: { gap: 6 },
  bioInput: { height: 100, paddingTop: 12, paddingBottom: 12, textAlignVertical: "top" },
  counter: { alignSelf: "flex-end" },
});
