import { Image } from "expo-image";
import { router } from "expo-router";
import { Play } from "lucide-react-native";
import { memo, type ComponentProps } from "react";
import { FlatList, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";

import type { Post } from "@/lib/posts";
import { useColors } from "@/theme";

const COLUMNS = 3;
const GAP = 1;

type Props = Omit<
  ComponentProps<typeof FlatList<Post>>,
  "data" | "renderItem" | "numColumns" | "keyExtractor"
> & { posts: Post[] };

/**
 * Explore and profile grids: 3 columns, 1 px gaps, square crops, edge to edge.
 * Videos show a small ▶ in the corner. Tap a tile to open the post.
 * design.md §1 Photo shapes.
 */
export function PhotoGrid({ posts, columnWrapperStyle, ...rest }: Props) {
  const { width } = useWindowDimensions();
  const size = (width - GAP * (COLUMNS - 1)) / COLUMNS;

  return (
    <FlatList
      data={posts}
      keyExtractor={(p) => p.id}
      numColumns={COLUMNS}
      renderItem={({ item }) => <Tile post={item} size={size} />}
      columnWrapperStyle={[styles.row, columnWrapperStyle]}
      {...rest}
    />
  );
}

const Tile = memo(function Tile({ post, size }: { post: Post; size: number }) {
  const colors = useColors();
  const isVideo = post.mediaType === "video";
  const source = isVideo ? post.posterUri : post.mediaUri;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isVideo ? "Video" : "Photo"}
      onPress={() => router.push({ pathname: "/post/[id]", params: { id: post.id } })}
      style={({ pressed }) => [
        { width: size, height: size, backgroundColor: isVideo && !source ? "#111111" : colors.surface },
        pressed && styles.pressed,
      ]}
    >
      {source ? (
        <Image
          source={{ uri: source }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={0}
          recyclingKey={post.id}
        />
      ) : null}
      {isVideo ? (
        // Sits on the photo, so it stays white in both themes.
        <View style={styles.videoMark} pointerEvents="none">
          <Play size={14} strokeWidth={1.75} color="#FFFFFF" fill="#FFFFFF" />
        </View>
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: { gap: GAP, marginBottom: GAP },
  pressed: { opacity: 0.8 },
  videoMark: { position: "absolute", top: 6, right: 6 },
});
