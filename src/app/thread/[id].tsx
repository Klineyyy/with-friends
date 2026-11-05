import * as ImagePicker from "expo-image-picker";
import { Redirect, useLocalSearchParams } from "expo-router";
import { Ban, Ellipsis, Flag, ImageIcon, Send, UserRound } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { FlatList, KeyboardAvoidingView, Pressable, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MenuPopover } from "@/components/MenuPopover";
import { MessageBubble } from "@/components/messages/MessageBubble";
import { TopBar } from "@/components/TopBar";
import { Avatar, Button, IconButton, Text } from "@/components/ui";
import { useBlockActions } from "@/lib/blocks";
import { threadTimestamp } from "@/lib/format";
import { MESSAGE_MAX_LENGTH, useThread, type Message } from "@/lib/inbox";
import { ME_ID } from "@/lib/mock-data";
import { openProfile } from "@/lib/open-profile";
import { compressImage } from "@/lib/prepare-media";
import { useUsers, type User } from "@/lib/posts";
import { useReport } from "@/lib/safety";
import { space, typeScale, useColors } from "@/theme";

/** A centred time shows above the first message after an hour's quiet. */
const TIME_GAP_MS = 60 * 60_000;

type Row =
  | { type: "time"; key: string; at: number }
  | { type: "message"; key: string; message: Message; newSender: boolean }
  | { type: "seen"; key: string };

/** Board 15: one-to-one thread. The route ID is the other person's user ID. */
export default function Thread() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const userById = useUsers();
  const { messages, theirLastReadAt, send, markRead } = useThread(id);
  const [menuOpen, setMenuOpen] = useState(false);
  const { isBlocked, confirmBlock, confirmUnblock } = useBlockActions();
  const report = useReport();

  // Reading the thread clears its unread dot, including messages that arrive while it's open.
  const lastMessageAt = messages[messages.length - 1]?.createdAt;
  useEffect(() => {
    markRead();
  }, [markRead, lastMessageAt]);

  // Newest first, for the inverted list (it starts at the bottom, like every chat).
  const rows = useMemo(() => buildRows(messages, theirLastReadAt).reverse(), [messages, theirLastReadAt]);

  if (id === ME_ID) return <Redirect href="/messages" />;

  const user = userById(id);
  const blocked = isBlocked(id);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <TopBar
        back
        title={
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`${user.displayName || user.username}, open profile`}
            onPress={() => openProfile(user.id)}
            style={({ pressed }) => [styles.person, pressed && styles.pressed]}
          >
            <Avatar uri={user.avatarUri} size={32} />
            <View style={styles.flex}>
              <Text variant="username" numberOfLines={1}>
                {user.displayName || user.username}
              </Text>
              <Text variant="meta" tone="secondary" numberOfLines={1}>
                @{user.username}
              </Text>
            </View>
          </Pressable>
        }
        trailing={<IconButton icon={Ellipsis} accessibilityLabel="More" onPress={() => setMenuOpen(true)} />}
      />
      <View style={[styles.divider, { backgroundColor: colors.divider }]} />
      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
        <FlatList
          inverted
          data={rows}
          keyExtractor={(r) => r.key}
          renderItem={({ item }) => <ThreadRow row={item} />}
          contentContainerStyle={styles.list}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
        />
        {blocked ? <BlockedFooter user={user} onUnblock={() => confirmUnblock(user)} /> : <Composer onSend={send} />}
      </KeyboardAvoidingView>
      <MenuPopover
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        items={[
          { icon: UserRound, label: "View profile", onPress: () => openProfile(user.id) },
          blocked
            ? { icon: Ban, label: `Unblock ${user.username}`, onPress: () => confirmUnblock(user) }
            : { icon: Ban, label: `Block ${user.username}`, onPress: () => confirmBlock(user) },
          { icon: Flag, label: `Report ${user.username}`, onPress: () => report({ type: "user", id, userId: id }) },
        ]}
      />
    </View>
  );
}

/** Oldest first: time separators, messages, and "Seen" under your last message once they've read it. */
function buildRows(messages: Message[], theirLastReadAt: number): Row[] {
  const rows: Row[] = [];
  let prev: Message | undefined;
  for (const message of messages) {
    if (!prev || message.createdAt - prev.createdAt > TIME_GAP_MS) {
      rows.push({ type: "time", key: `t_${message.id}`, at: message.createdAt });
    }
    rows.push({
      type: "message",
      key: message.id,
      message,
      newSender: !prev || prev.senderId !== message.senderId,
    });
    prev = message;
  }
  if (prev && prev.senderId === ME_ID && theirLastReadAt >= prev.createdAt) {
    rows.push({ type: "seen", key: "seen" });
  }
  return rows;
}

function ThreadRow({ row }: { row: Row }) {
  if (row.type === "time") {
    return (
      <Text variant="meta" tone="secondary" style={styles.time}>
        {threadTimestamp(row.at)}
      </Text>
    );
  }
  if (row.type === "seen") {
    return (
      <Text variant="meta" tone="secondary" style={styles.seen}>
        Seen
      </Text>
    );
  }
  return (
    <View style={{ marginTop: row.newSender ? 12 : 4 }}>
      <MessageBubble message={row.message} mine={row.message.senderId === ME_ID} />
    </View>
  );
}

/** In place of the composer while you've blocked them. */
function BlockedFooter({ user, onUnblock }: { user: User; onUnblock: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.blocked,
        { borderTopColor: colors.divider, paddingBottom: Math.max(insets.bottom, space.sm) + space.sm },
      ]}
    >
      <Text tone="secondary" style={styles.flex}>
        You blocked {user.username}. They can&apos;t message you.
      </Text>
      <Button label="Unblock" variant="secondary" size="compact" onPress={onUnblock} />
    </View>
  );
}

/** Photo button, "Message…" field, send. */
function Composer({ onSend }: { onSend: ReturnType<typeof useThread>["send"] }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState("");
  const canSend = text.trim().length > 0;

  function sendText() {
    if (!canSend) return;
    onSend({ kind: "text", body: text.trim() });
    setText("");
  }

  async function sendPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return;
    const image = await compressImage(asset.uri, asset.width, asset.height);
    onSend({ kind: "image", imageUri: image.uri, width: image.width, height: image.height });
  }

  return (
    <View
      style={[
        styles.composer,
        { borderTopColor: colors.divider, paddingBottom: Math.max(insets.bottom, space.sm) },
      ]}
    >
      <IconButton icon={ImageIcon} accessibilityLabel="Send a photo" onPress={() => void sendPhoto()} />
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Message…"
        accessibilityLabel="Message"
        placeholderTextColor={colors.textSecondary}
        cursorColor={colors.text}
        selectionColor={colors.textSecondary}
        maxLength={MESSAGE_MAX_LENGTH}
        multiline
        style={[typeScale.body, styles.input, { backgroundColor: colors.surface, color: colors.text }]}
      />
      <IconButton
        icon={Send}
        accessibilityLabel="Send"
        disabled={!canSend}
        color={canSend ? colors.text : colors.textSecondary}
        onPress={sendText}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  person: { flexDirection: "row", alignItems: "center", gap: 10 },
  pressed: { opacity: 0.6 },
  divider: { height: StyleSheet.hairlineWidth * 2 },
  list: { paddingHorizontal: space.screenEdge, paddingVertical: space.sm },
  time: { textAlign: "center", marginTop: space.md, marginBottom: 4 },
  seen: { textAlign: "right", marginTop: 4 },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    paddingTop: space.sm,
    paddingHorizontal: space.screenEdge - 10,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
  },
  blocked: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: space.md,
    paddingHorizontal: space.screenEdge,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
  },
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
});
