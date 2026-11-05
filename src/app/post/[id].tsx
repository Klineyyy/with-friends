import { router, useLocalSearchParams } from "expo-router";
import { Image as ImageIcon } from "lucide-react-native";
import { Alert, FlatList, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/EmptyState";
import { PostItem } from "@/components/post/PostItem";
import { TopBar } from "@/components/TopBar";
import { Avatar, Button, Text } from "@/components/ui";
import { timeAgo } from "@/lib/format";
import { ME_ID } from "@/lib/mock-data";
import { usePost, useUsers, useVisibleComments, type Comment, type Post } from "@/lib/posts";
import { useReport } from "@/lib/safety";
import { space, useColors } from "@/theme";

/**
 * One post with its comments (opened from "View all N comments", Activity or a link).
 * Not on the board; built from the feed item. Deleted → board 20.
 * Adding and deleting comments comes with the comments sheet (board 7, Phase 5).
 * Long-press someone else's comment to report it (until the sheet gives comments a menu).
 */
export default function PostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const post = usePost(id);
  const colors = useColors();

  if (!post) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <TopBar back title="Post" />
        <View style={styles.deleted}>
          <EmptyState
            icon={ImageIcon}
            title="This post was deleted."
            body="The person who shared it took it down."
            action={
              <Button
                label="Back to home"
                variant="secondary"
                size="compact"
                style={styles.backButton}
                onPress={() => router.dismissTo("/")}
              />
            }
          />
        </View>
      </View>
    );
  }

  return <PostWithComments post={post} />;
}

function PostWithComments({ post }: { post: Post }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const comments = useVisibleComments(post);
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <TopBar back title="Post" />
      <FlatList
        data={comments}
        keyExtractor={(c) => c.id}
        ListHeaderComponent={<PostItem post={post} hideCommentsLink />}
        renderItem={({ item }) => <CommentRow comment={item} />}
        ListHeaderComponentStyle={[styles.postDivider, { borderBottomColor: colors.divider }]}
        contentContainerStyle={{ paddingBottom: insets.bottom + space.lg }}
      />
    </View>
  );
}

function CommentRow({ comment }: { comment: Comment }) {
  const userById = useUsers();
  const report = useReport();
  const author = userById(comment.authorId);
  const mine = comment.authorId === ME_ID;

  function more() {
    Alert.alert(`Comment by ${author.username}`, undefined, [
      { text: "Report", onPress: () => report({ type: "comment", id: comment.id, userId: comment.authorId }) },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  return (
    <Pressable
      onLongPress={mine ? undefined : more}
      accessibilityActions={mine ? undefined : [{ name: "report", label: "Report comment" }]}
      onAccessibilityAction={mine ? undefined : more}
      style={styles.comment}
    >
      <Avatar uri={author.avatarUri} size={32} accessibilityLabel={author.username} />
      <View style={styles.commentText}>
        <Text>
          <Text variant="username">{author.username}</Text>{" "}
          <Text variant="meta" tone="secondary">
            {timeAgo(comment.createdAt)}
          </Text>
        </Text>
        <Text>{comment.body}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  deleted: { paddingHorizontal: space.screenEdge, paddingTop: space.lg },
  backButton: { height: 44, borderRadius: 8, paddingHorizontal: 20 },
  postDivider: { borderBottomWidth: StyleSheet.hairlineWidth, marginBottom: space.sm },
  comment: { flexDirection: "row", gap: 12, paddingHorizontal: space.screenEdge, paddingVertical: space.sm },
  commentText: { flex: 1, gap: 2 },
});
