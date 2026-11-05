import { router } from "expo-router";
import { Ellipsis, MessageCircle, Share2 } from "lucide-react-native";
import { Alert, Pressable, Share, StyleSheet, View } from "react-native";

import { Avatar, IconButton, Text } from "@/components/ui";
import { timeAgo } from "@/lib/format";
import { openProfile } from "@/lib/open-profile";
import { useMe, usePostActions, useUsers, type Post } from "@/lib/posts";
import { useReport } from "@/lib/safety";
import { space } from "@/theme";

import { LikeButton } from "./LikeButton";
import { MediaView } from "./MediaView";

type Props = {
  post: Post;
  /** Hide "View all N comments" (on the post screen, where comments are listed). */
  hideCommentsLink?: boolean;
  /** Comment icon. Default: open the post screen with the comment field focused. */
  onCommentPress?: () => void;
};

/** Board 4: header, media, actions, likes line, caption, comments link. */
export function PostItem({ post, hideCommentsLink, onCommentPress }: Props) {
  const userById = useUsers();
  const me = useMe();
  const { setLiked, deletePost } = usePostActions();
  const report = useReport();

  const author = post.author ?? userById(post.authorId);
  const liked = post.likedByMe;
  const isMine = post.authorId === me.id;
  const commentCount = post.commentCount;

  const openPost = () => router.push({ pathname: "/post/[id]", params: { id: post.id } });
  const comment =
    onCommentPress ?? (() => router.push({ pathname: "/post/[id]", params: { id: post.id, comment: "1" } }));

  async function share() {
    // TEMPORARY: system share sheet until the in-app share sheet (board 8a, Phase 5).
    // Custom-scheme link until the https site exists (scope A12).
    await Share.share({ message: `withfriends://post/${post.id}` });
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
        { text: "Report", onPress: () => report({ type: "post", id: post.id, userId: post.authorId }) },
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
        <IconButton icon={MessageCircle} accessibilityLabel="Comment" onPress={comment} />
        <IconButton icon={Share2} accessibilityLabel="Share" onPress={share} />
      </View>

      <View style={styles.text}>
        <LikesLine post={post} />
        {post.caption ? (
          <Text>{post.caption}</Text>
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

/** "Liked by maya and 3 others". Names someone else when they can; "you" if only you. */
function LikesLine({ post }: { post: Post }) {
  const count = post.likeCount;
  if (count === 0) return null;

  const firstName = post.firstLikerUsername ?? "someone";
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
