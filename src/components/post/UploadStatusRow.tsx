import { Image } from "expo-image";
import { Play, RotateCw } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";

import { Text } from "@/components/ui";
import type { Upload } from "@/lib/posts";
import { space, useColors } from "@/theme";

type Props = { upload: Upload; onRetry: () => void };

/** Top-of-Home row while a post is sharing (6.3) or after it failed (6.4). */
export function UploadStatusRow({ upload, onRetry }: Props) {
  const colors = useColors();
  const failed = upload.status === "failed";
  const isVideo = upload.draft.mediaType === "video";
  const thumbUri = isVideo ? upload.draft.posterUri : upload.draft.uri;

  return (
    <Pressable
      disabled={!failed}
      onPress={onRetry}
      accessibilityRole={failed ? "button" : undefined}
      accessibilityLabel={failed ? "Upload failed. Tap to retry." : "Sharing"}
      style={[styles.row, { borderBottomColor: colors.divider }]}
    >
      <View style={[styles.thumb, { backgroundColor: colors.surface }]}>
        {thumbUri ? (
          <Image source={{ uri: thumbUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : null}
        {isVideo ? <Play size={16} strokeWidth={1.75} color={thumbUri ? "#FFFFFF" : colors.textSecondary} /> : null}
      </View>
      {failed ? (
        <>
          <Text style={styles.grow}>Upload failed. Tap to retry.</Text>
          <RotateCw size={24} strokeWidth={1.75} color={colors.text} />
        </>
      ) : (
        <View style={[styles.grow, styles.progressWrap]}>
          <Text variant="username">Sharing…</Text>
          <View
            style={[styles.track, { backgroundColor: colors.surface }]}
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: 100, now: Math.round(upload.progress * 100) }}
          >
            <View
              style={[styles.fill, { width: `${upload.progress * 100}%`, backgroundColor: colors.text }]}
            />
          </View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: space.screenEdge,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  thumb: { width: 44, height: 44, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  grow: { flex: 1 },
  progressWrap: { gap: 8 },
  track: { height: 3, borderRadius: 2, overflow: "hidden" },
  fill: { height: 3, borderRadius: 2 },
});
