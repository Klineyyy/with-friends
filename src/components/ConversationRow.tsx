import { Pressable, StyleSheet, View } from "react-native";

import { Avatar, Text, UnreadDot } from "@/components/ui";
import { messageListTime } from "@/lib/format";
import type { ConversationSummary } from "@/lib/inbox";
import { space } from "@/theme";

type Props = { conversation: ConversationSummary; onPress: () => void };

/** Board 14a: 52 avatar, display name, "preview · time", fern dot when unread. */
export function ConversationRow({ conversation, onPress }: Props) {
  const { user, preview, lastMessageAt, unread } = conversation;
  const name = user.displayName || user.username;
  const time = messageListTime(lastMessageAt);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}${unread ? ", unread" : ""}. ${preview}, ${time}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Avatar uri={user.avatarUri} size={52} />
      <View style={styles.text}>
        <Text variant="username" numberOfLines={1}>
          {name}
        </Text>
        <View style={styles.previewLine}>
          <Text numberOfLines={1} style={styles.preview}>
            {preview}
          </Text>
          <Text tone="secondary">{` · ${time}`}</Text>
        </View>
      </View>
      <View style={styles.dotSlot}>{unread ? <UnreadDot /> : null}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: space.screenEdge,
    paddingVertical: 10,
  },
  text: { flex: 1, gap: 2 },
  previewLine: { flexDirection: "row" },
  preview: { flexShrink: 1 },
  dotSlot: { width: 8, alignItems: "center" },
  pressed: { opacity: 0.6 },
});
