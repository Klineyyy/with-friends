import { router, useLocalSearchParams } from "expo-router";
import { Check, CircleAlert } from "lucide-react-native";
import { useState } from "react";
import { KeyboardAvoidingView, ScrollView, StyleSheet, TextInput, View } from "react-native";

import { MediaView } from "@/components/post/MediaView";
import { TopBar } from "@/components/TopBar";
import { Avatar, Button, Text } from "@/components/ui";
import { formatDuration, POST_LIMITS } from "@/lib/format";
import { useMe, useUploads } from "@/lib/posts";
import { space, typeScale, useColors } from "@/theme";

type Params = {
  uri: string;
  type: "image" | "video";
  width: string;
  height: string;
  durationMs?: string;
  fileSize?: string;
};

/** Board 6.2: preview, 30 s check, caption, Share. */
export default function NewPost() {
  const params = useLocalSearchParams<Params>();
  const colors = useColors();
  const me = useMe();
  const { share } = useUploads();
  const [caption, setCaption] = useState("");

  const isVideo = params.type === "video";
  const width = Number(params.width) || 1;
  const height = Number(params.height) || 1;
  const durationMs = params.durationMs ? Number(params.durationMs) : undefined;
  const fileSize = params.fileSize ? Number(params.fileSize) : undefined;

  const tooLong = isVideo && durationMs !== undefined && durationMs > POST_LIMITS.videoMaxMs;
  const tooBig = isVideo && fileSize !== undefined && fileSize > POST_LIMITS.videoMaxBytes;
  const canShare = !!params.uri && !tooLong && !tooBig;

  function onShare() {
    share({
      mediaType: isVideo ? "video" : "image",
      uri: params.uri,
      width,
      height,
      durationMs,
      caption,
    });
    router.dismissTo("/");
  }

  return (
    <KeyboardAvoidingView behavior="padding" style={[styles.root, { backgroundColor: colors.background }]}>
      <TopBar
        back
        title="New post"
        trailing={
          <Button
            label="Share"
            size="compact"
            disabled={!canShare}
            onPress={onShare}
            style={styles.shareButton}
          />
        }
      />
      <ScrollView keyboardShouldPersistTaps="handled">
        <MediaView
          post={{
            mediaType: isVideo ? "video" : "image",
            mediaUri: params.uri,
            posterUri: undefined,
            width,
            height,
            durationMs,
          }}
          accessibilityLabel={isVideo ? "Selected video" : "Selected photo"}
        />

        {isVideo && durationMs !== undefined ? (
          <View style={[styles.check, { borderBottomColor: colors.divider }]}>
            {tooLong || tooBig ? (
              <CircleAlert size={16} strokeWidth={1.75} color={colors.text} />
            ) : (
              <Check size={16} strokeWidth={1.75} color={colors.textSecondary} />
            )}
            <Text variant="meta" tone={tooLong || tooBig ? "default" : "secondary"} style={styles.grow}>
              {tooLong
                ? `${formatDuration(durationMs)} is over the 30 second limit. Trim it first.`
                : tooBig
                  ? "This video is over 50 MB. Pick a shorter or smaller one."
                  : `${formatDuration(durationMs)} of 0:30. Fits the 30 second limit.`}
            </Text>
          </View>
        ) : null}

        <View style={[styles.captionRow, { borderBottomColor: colors.divider }]}>
          <Avatar uri={me.avatarUri} size={32} accessibilityLabel="You" />
          <TextInput
            value={caption}
            onChangeText={setCaption}
            placeholder="Write a caption…"
            accessibilityLabel="Caption"
            multiline
            maxLength={POST_LIMITS.captionLength}
            placeholderTextColor={colors.textSecondary}
            cursorColor={colors.text}
            selectionColor={colors.textSecondary}
            style={[typeScale.body, styles.caption, { color: colors.text }]}
          />
        </View>

        {isVideo ? (
          <Text variant="meta" tone="secondary" style={styles.hint}>
            Videos can be up to 30 seconds. Longer ones need trimming first.
          </Text>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  shareButton: { marginRight: 10 },
  check: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: space.screenEdge,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  grow: { flex: 1 },
  captionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: space.screenEdge,
    paddingVertical: space.md,
    minHeight: 100,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  caption: { flex: 1, paddingTop: 5, paddingBottom: 0, textAlignVertical: "top" },
  hint: { paddingHorizontal: space.screenEdge, paddingVertical: 12 },
});
