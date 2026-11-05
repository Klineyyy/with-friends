import { router, useLocalSearchParams } from "expo-router";
import { Image as ImageIcon } from "lucide-react-native";
import { useRef, useState, type ComponentRef, type RefObject } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/EmptyState";
import { PostItem } from "@/components/post/PostItem";
import { TopBar } from "@/components/TopBar";
import { Avatar, Button, Text } from "@/components/ui";
import { timeAgo } from "@/lib/format";
import {
  COMMENT_MAX_LENGTH,
  useComments,
  useMe,
  usePost,
  usePostActions,
  useUsers,
  type Comment,
  type Post,
} from "@/lib/posts";
import { useReport } from "@/lib/safety";
import { space, typeScale, useColors } from "@/theme";

/**
 * One post with its comments (opened from "View all N comments", Activity or a link).
 * Not on the board; built from the feed item. Deleted → board 20.
 * Comment bar and "Delete" on your own comments follow board 7 (comments sheet).
 * `?comment=1` (the comment icon) focuses the field on open.
 * Long-press someone else's comment to report it (until the sheet gives comments a menu).
 */
export default function PostScreen() {
  const { id, comment } = useLocalSearchParams<{ id: string; comment?: string }>();
  const post = usePost(id);
  const colors = useColors();

  if (post === undefined) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <TopBar back title="Post" />
      </View>
    );
  }

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

  return <PostWithComments post={post} focusComment={comment === "1"} />;
}

function PostWithComments({ post, focusComment }: { post: Post; focusComment: boolean }) {
  const colors = useColors();
  const comments = useComments(post.id) ?? [];
  const { addComment } = usePostActions();
  const list = useRef<FlatList<Comment>>(null);
  const input = useRef<ComponentRef<typeof TextInput> | null>(null);
  const justPosted = useRef(false);

  function postComment(body: string) {
    addComment(post.id, body);
    justPosted.current = true;
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <TopBar back title="Post" />
      <KeyboardAvoidingView behavior="padding" style={styles.root}>
        <FlatList
          ref={list}
          data={comments}
          keyExtractor={(c) => c.id}
          ListHeaderComponent={
            <PostItem post={post} hideCommentsLink onCommentPress={() => input.current?.focus()} />
          }
          renderItem={({ item }) => <CommentRow postId={post.id} comment={item} />}
          ListHeaderComponentStyle={[styles.postDivider, { borderBottomColor: colors.divider }]}
          contentContainerStyle={styles.listContent}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => {
            // Show the comment you just posted (it's added at the end).
            if (!justPosted.current) return;
            justPosted.current = false;
            list.current?.scrollToEnd({ animated: true });
          }}
        />
        <CommentBar inputRef={input} autoFocus={focusComment} onPost={postComment} />
      </KeyboardAvoidingView>
    </View>
  );
}

/** Board 7 bottom bar: your avatar, "Add a comment…", Post. */
function CommentBar({
  inputRef,
  autoFocus,
  onPost,
}: {
  inputRef: RefObject<ComponentRef<typeof TextInput> | null>;
  autoFocus: boolean;
  onPost: (body: string) => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const me = useMe();
  const [text, setText] = useState("");
  const canPost = text.trim().length > 0;

  function submit() {
    if (!canPost) return;
    onPost(text);
    setText("");
  }

  return (
    <View
      style={[
        styles.bar,
        { borderTopColor: colors.divider, paddingBottom: Math.max(insets.bottom, space.sm) },
      ]}
    >
      <View style={styles.barAvatar}>
        <Avatar uri={me.avatarUri} size={32} />
      </View>
      <TextInput
        ref={inputRef}
        value={text}
        onChangeText={setText}
        autoFocus={autoFocus}
        placeholder="Add a comment…"
        accessibilityLabel="Add a comment"
        placeholderTextColor={colors.textSecondary}
        cursorColor={colors.text}
        selectionColor={colors.textSecondary}
        maxLength={COMMENT_MAX_LENGTH}
        multiline
        style={[typeScale.body, styles.input, { backgroundColor: colors.surface, color: colors.text }]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Post comment"
        accessibilityState={{ disabled: !canPost }}
        disabled={!canPost}
        onPress={submit}
        hitSlop={8}
        style={({ pressed }) => [styles.postButton, pressed && styles.pressed]}
      >
        <Text style={[typeScale.button, { color: canPost ? colors.text : colors.textSecondary }]}>Post</Text>
      </Pressable>
    </View>
  );
}

function CommentRow({ postId, comment }: { postId: string; comment: Comment }) {
  const userById = useUsers();
  const me = useMe();
  const report = useReport();
  const { deleteComment } = usePostActions();
  const author = comment.author ?? userById(comment.authorId);
  const mine = comment.authorId === me.id;

  function confirmDelete() {
    Alert.alert("Delete comment?", undefined, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteComment(postId, comment.id) },
    ]);
  }

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
      {mine ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Delete comment"
          onPress={confirmDelete}
          hitSlop={8}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Text variant="meta" tone="secondary">
            Delete
          </Text>
        </Pressable>
      ) : null}
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
  listContent: { paddingBottom: space.lg },
  pressed: { opacity: 0.6 },
  bar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingTop: space.sm,
    paddingHorizontal: space.screenEdge,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
  },
  barAvatar: { marginBottom: 6 },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    marginBottom: 2,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  postButton: { height: 40, justifyContent: "center", marginBottom: 2 },
});
