import { router } from "expo-router";
import { Ellipsis, MessageCircle, Share2 } from "lucide-react-native";
import { Alert, Pressable, Share, StyleSheet, View } from "react-native";

import { Avatar, IconButton, Text } from "@/components/ui";
import { timeAgo } from "@/lib/format";
import { ME_ID } from "@/lib/mock-data";
import { openProfile } from "@/lib/open-profile";
import { usePostActions, useUsers, type Post } from "@/lib/posts";
import { space } from "@/theme";

import { LikeButton } from "./LikeButton";
import { MediaView } from "./MediaView";

type Props = {
  post: Post;
  /** Hide "View all N comments" (on the post screen, where comments are listed). */
  hideCommentsLink?: boolean;
};

/** Board 4: header, media, actions, likes line, caption, comments link. */
export function PostItem({ post, hideCommentsLink }: Props) {
  const userById = useUsers();
  const { setLiked, deletePost } = usePostActions();

  const author = userById(post.authorId);
  const liked = post.likedBy.includes(ME_ID);
  const isMine = post.authorId === ME_ID;
  const commentCount = post.comments.length;

  const openPost = () => router.push({ pathname: "/post/[id]", params: { id: post.id } });

  async function share() {
    // TEMPORARY: system share sheet until the in-app share sheet (board 8a, Phase 5).
    await Share.share({ message: `https://withfriends.app/p/${post.shortId}` });
  }

  function more() {
    if (isMine) {
      Alert.alert("Delete post?", "It will be removed for everyone.", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deletePost(post.id) },
      ]);
    } else {
      Alert.alert(author.username, undefined, [
        { text: "Share", onPress: share },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  }

  return (
    <View style={styles.post}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={author.username}
          onPress={() => openProfile(author.id)}
          style={({ pressed }) => [styles.author, pressed && styles.pressed]}
        >
          <Avatar uri={author.avatarUri} size={32} />
          <Text variant="username" numberOfLines={1} style={styles.shrink}>
            {author.username}
          </Text>
        </Pressable>
        <Text variant="meta" tone="secondary" style={styles.grow}>
          {timeAgo(post.createdAt)}
        </Text>
        <IconButton icon={Ellipsis} accessibilityLabel="More" onPress={more} />
      </View>

      <MediaView
        post={post}
        accessibilityLabel={`${post.mediaType === "video" ? "Video" : "Photo"} by ${author.username}`}
        onDoubleTap={() => setLiked(post.id, true)}
      />

      <View style={styles.actions}>
        <LikeButton liked={liked} onChange={(next) => setLiked(post.id, next)} />
        <IconButton icon={MessageCircle} accessibilityLabel="Comments" onPress={openPost} />
        <IconButton icon={Share2} accessibilityLabel="Share" onPress={share} />
      </View>

      <View style={styles.text}>
        <LikesLine post={post} />
        {post.caption ? (
          <Text>
            <Text variant="username">{author.username}</Text> {post.caption}
          </Text>
        ) : null}
        {commentCount > 0 && !hideCommentsLink ? (
          <Pressable onPress={openPost} accessibilityRole="link" hitSlop={6}>
            <Text tone="secondary">
              {commentCount === 1 ? "View 1 comment" : `View all ${commentCount} comments`}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/** "Liked by maya and 3 others". You come first when you've liked it. */
function LikesLine({ post }: { post: Post }) {
  const userById = useUsers();
  const count = post.likedBy.length;
  if (count === 0) return null;

  const first = post.likedBy[0];
  const firstName = first === ME_ID ? "you" : userById(first).username;
  const others = count - 1;

  return (
    <Text>
      Liked by <Text variant="username">{firstName}</Text>
      {others > 0 ? (
        <>
          {" and "}
          <Text variant="username">{others === 1 ? "1 other" : `${others} others`}</Text>
        </>
      ) : null}
    </Text>
  );
}

const styles = StyleSheet.create({
  post: { paddingBottom: space.md },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingLeft: space.screenEdge,
    paddingRight: space.screenEdge - 10,
    height: 52,
  },
  author: { flexDirection: "row", alignItems: "center", gap: 10, flexShrink: 1 },
  pressed: { opacity: 0.6 },
  shrink: { flexShrink: 1 },
  grow: { flex: 1 },
  actions: { flexDirection: "row", alignItems: "center", paddingHorizontal: space.screenEdge - 10 },
  text: { paddingHorizontal: space.screenEdge, gap: 2 },
});
