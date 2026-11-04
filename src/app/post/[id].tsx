import { router, useLocalSearchParams } from "expo-router";
import { Image as ImageIcon } from "lucide-react-native";
import { FlatList, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/EmptyState";
import { PostItem } from "@/components/post/PostItem";
import { TopBar } from "@/components/TopBar";
import { Avatar, Button, Text } from "@/components/ui";
import { timeAgo } from "@/lib/format";
import { usePost, useUsers, type Comment } from "@/lib/posts";
import { space, useColors } from "@/theme";

/**
 * One post with its comments (opened from "View all N comments", Activity or a link).
 * Not on the board; built from the feed item. Deleted → board 20.
 * Adding and deleting comments comes with the comments sheet (board 7, Phase 5).
 */
export default function PostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const post = usePost(id);
  const colors = useColors();
  const insets = useSafeAreaInsets();

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

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <TopBar back title="Post" />
      <FlatList
        data={post.comments}
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
  const author = userById(comment.authorId);
  return (
    <View style={styles.comment}>
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
    </View>
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
