import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, StyleSheet } from "react-native";

import { Avatar, Button, Text, UnreadDot } from "@/components/ui";
import { timeAgo } from "@/lib/format";
import { openProfile } from "@/lib/open-profile";
import type { ActivityItem } from "@/lib/inbox";
import { useFollowing, type User } from "@/lib/posts";
import { space, useColors } from "@/theme";

/** One Activity row. Likes on the same post in the same section are grouped. */
export type ActivityEntry = {
  key: string;
  type: "like" | "comment" | "follow";
  /** Most recent first. */
  actors: User[];
  post: ActivityItem["post"];
  body?: string;
  createdAt: number;
  unread: boolean;
};

/**
 * Board 16a: fern dot for unread, 44 avatar, "**maya** liked your post. 12m",
 * post thumbnail on the right, or Follow / Following for follows.
 * Tap opens the post (likes, comments) or the person (follows).
 */
export function ActivityRow({ entry }: { entry: ActivityEntry }) {
  const colors = useColors();
  const { isFollowing, follow, unfollow } = useFollowing();
  const actor = entry.actors[0];
  const others = entry.actors.length - 1;
  const sentence = describe(entry, others);
  const time = timeAgo(entry.createdAt);

  const open = () => {
    if (entry.type === "follow" || !entry.post) openProfile(actor.id);
    else router.push({ pathname: "/post/[id]", params: { id: entry.post.id } });
  };

  const thumb = entry.post?.thumbUri ?? undefined;
  const following = isFollowing(actor.id);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${entry.unread ? "New. " : ""}${actor.username}${sentence} ${time}`}
      onPress={open}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {entry.unread ? <UnreadDot size={6} style={styles.dot} /> : null}
      <Pressable accessibilityRole="link" accessibilityLabel={actor.username} onPress={() => openProfile(actor.id)}>
        <Avatar uri={actor.avatarUri} size={44} />
      </Pressable>
      <Text style={styles.text} numberOfLines={3}>
        <Text variant="username">{actor.username}</Text>
        {sentence}{" "}
        <Text variant="meta" tone="secondary">
          {time}
        </Text>
      </Text>
      {entry.type === "follow" ? (
        <Button
          size="compact"
          variant={following ? "secondary" : "primary"}
          label={following ? "Following" : "Follow"}
          accessibilityLabel={following ? `Unfollow ${actor.username}` : `Follow ${actor.username}`}
          onPress={() => (following ? unfollow(actor.id) : follow(actor.id))}
        />
      ) : thumb ? (
        <Image
          source={{ uri: thumb }}
          style={[styles.thumb, { backgroundColor: colors.surface }]}
          contentFit="cover"
          recyclingKey={thumb}
          accessibilityIgnoresInvertColors
        />
      ) : null}
    </Pressable>
  );
}

/** The words after the username. */
function describe(entry: ActivityEntry, others: number): string {
  if (entry.type === "follow") return " started following you.";
  if (entry.type === "comment") return ` commented: “${entry.body ?? ""}”`;
  if (others > 0) return ` and ${others} ${others === 1 ? "other" : "others"} liked your post.`;
  return " liked your post.";
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: space.screenEdge,
    paddingVertical: 10,
  },
  dot: { position: "absolute", left: 5 },
  text: { flex: 1 },
  thumb: { width: 44, height: 44 },
  pressed: { opacity: 0.6 },
});
