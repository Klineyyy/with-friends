import { Image } from "expo-image";
import { Play } from "lucide-react-native";
import { useRef } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";

import { Text } from "@/components/ui";
import { clampedAspectRatio, formatDuration } from "@/lib/format";
import type { Post } from "@/lib/posts";
import { useColors } from "@/theme";

type Props = {
  post: Pick<Post, "mediaType" | "mediaUri" | "posterUri" | "width" | "height" | "durationMs">;
  onDoubleTap?: () => void;
  accessibilityLabel?: string;
};

const DOUBLE_TAP_MS = 280;

/**
 * Feed media: edge to edge, its own shape clamped 4:5 – 1.91:1, square corners.
 * Videos show the poster, a duration badge (top right) and a centred play button.
 * Playback needs expo-video (not installed yet).
 */
export function MediaView({ post, onDoubleTap, accessibilityLabel }: Props) {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const lastTap = useRef(0);
  const height = width / clampedAspectRatio(post.width, post.height);
  const isVideo = post.mediaType === "video";
  const source = isVideo ? post.posterUri : post.mediaUri;

  function onPress() {
    const now = Date.now();
    if (now - lastTap.current < DOUBLE_TAP_MS) {
      lastTap.current = 0;
      onDoubleTap?.();
    } else {
      lastTap.current = now;
    }
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={onDoubleTap ? "Double-tap to like" : undefined}
      style={{ width, height, backgroundColor: isVideo && !source ? "#111111" : colors.surface }}
    >
      {source ? (
        <Image
          source={{ uri: source }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={0}
          recyclingKey={source}
        />
      ) : null}
      {isVideo ? (
        <>
          {post.durationMs ? (
            <View style={styles.badge}>
              <Text variant="meta" style={styles.badgeText}>
                {formatDuration(post.durationMs)}
              </Text>
            </View>
          ) : null}
          <View style={styles.center} pointerEvents="none">
            <View style={styles.play}>
              <Play size={22} strokeWidth={1.75} color="#FFFFFF" fill="#FFFFFF" />
            </View>
          </View>
        </>
      ) : null}
    </Pressable>
  );
}

// Overlays sit on photos, so they stay dark in both themes.
const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: { color: "#FFFFFF", fontSize: 12, lineHeight: 16 },
  center: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
  play: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 3,
  },
});
