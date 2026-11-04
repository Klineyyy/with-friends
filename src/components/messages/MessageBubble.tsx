import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { Avatar, Text } from "@/components/ui";
import { clampedAspectRatio } from "@/lib/format";
import type { Message } from "@/lib/inbox";
import { usePost, useUsers } from "@/lib/posts";
import { useColors } from "@/theme";

type Align = { alignSelf: "flex-start" | "flex-end" };

const PHOTO_WIDTH = 200;
const CARD_WIDTH = 232;

/**
 * One message in a thread (board 15). Incoming: grey bubble on the left.
 * Outgoing: black bubble on the right. Photos are rounded; shared posts are an
 * outlined card that opens the post.
 */
export function MessageBubble({ message, mine }: { message: Message; mine: boolean }) {
  const align = mine ? styles.right : styles.left;
  if (message.kind === "image") return <PhotoMessage message={message} style={align} />;
  if (message.kind === "post") return <PostCard postId={message.postId} style={align} />;
  return <TextBubble body={message.body ?? ""} mine={mine} />;
}

function TextBubble({ body, mine }: { body: string; mine: boolean }) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.bubble,
        mine ? styles.right : styles.left,
        { backgroundColor: mine ? colors.text : colors.surface },
      ]}
    >
      <Text selectable style={{ color: mine ? colors.background : colors.text }}>
        {body}
      </Text>
    </View>
  );
}

function PhotoMessage({ message, style }: { message: Message; style: Align }) {
  const colors = useColors();
  const height = PHOTO_WIDTH / clampedAspectRatio(message.width ?? 1, message.height ?? 1);
  return (
    <Image
      source={{ uri: message.imageUri }}
      style={[styles.photo, style, { height, backgroundColor: colors.surface }]}
      contentFit="cover"
      accessibilityLabel="Photo"
      recyclingKey={message.imageUri}
    />
  );
}

/** A shared post: author, media, caption. Deleted posts say so (scope §8). */
function PostCard({ postId, style }: { postId?: string; style: Align }) {
  const colors = useColors();
  const post = usePost(postId);
  const userById = useUsers();
  const frame = [styles.card, style, { borderColor: colors.divider, backgroundColor: colors.background }];

  if (!post) {
    return (
      <View style={[frame, styles.cardText]}>
        <Text variant="meta" tone="secondary">
          This post was deleted.
        </Text>
      </View>
    );
  }

  const author = userById(post.authorId);
  const source = post.mediaType === "video" ? post.posterUri : post.mediaUri;
  const height = CARD_WIDTH / clampedAspectRatio(post.width, post.height);

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${author.username}'s post${post.caption ? `: ${post.caption}` : ""}`}
      onPress={() => router.push({ pathname: "/post/[id]", params: { id: post.id } })}
      style={({ pressed }) => [frame, pressed && styles.pressed]}
    >
      <View style={styles.cardHeader}>
        <Avatar uri={author.avatarUri} size={24} />
        <Text variant="username" numberOfLines={1} style={styles.flex}>
          {author.username}
        </Text>
      </View>
      <Image
        source={source ? { uri: source } : null}
        style={{ width: CARD_WIDTH, height, backgroundColor: colors.surface }}
        contentFit="cover"
        recyclingKey={source}
      />
      {post.caption ? (
        <Text variant="meta" numberOfLines={2} style={styles.cardText}>
          {post.caption}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  left: { alignSelf: "flex-start" },
  right: { alignSelf: "flex-end" },
  bubble: { maxWidth: "78%", borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8 },
  photo: { width: PHOTO_WIDTH, borderRadius: 12 },
  card: {
    width: CARD_WIDTH,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: 12,
    overflow: "hidden",
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10 },
  cardText: { padding: 10 },
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
});
