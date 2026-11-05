import { router } from "expo-router";
import { MessageSquare, Pencil } from "lucide-react-native";
import { FlatList, StyleSheet, View } from "react-native";

import { ConversationRow } from "@/components/ConversationRow";
import { EmptyState } from "@/components/EmptyState";
import { useTabBarSpace } from "@/components/FloatingTabBar";
import { PersonRow } from "@/components/PersonRow";
import { TopBar } from "@/components/TopBar";
import { Button, IconButton, Text } from "@/components/ui";
import { useConversations, useMembers } from "@/lib/inbox";
import { openThread } from "@/lib/open-profile";
import { space, useColors } from "@/theme";

/** Board 14a (conversations) and 14b (no conversations yet). */
export default function Messages() {
  const colors = useColors();
  const conversations = useConversations();
  const bottomSpace = useTabBarSpace();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <TopBar
        title="Messages"
        trailing={
          <IconButton icon={Pencil} accessibilityLabel="New message" onPress={() => router.push("/new-message")} />
        }
      />
      {conversations === undefined ? null : conversations.length ? (
        <FlatList
          data={conversations}
          keyExtractor={(c) => c.user.id}
          renderItem={({ item }) => <ConversationRow conversation={item} onPress={() => openThread(item.user.id)} />}
          contentContainerStyle={{ paddingBottom: bottomSpace }}
        />
      ) : (
        <MessagesEmpty bottomSpace={bottomSpace} />
      )}
    </View>
  );
}

/** Board 14b: start a conversation with any member. */
function MessagesEmpty({ bottomSpace }: { bottomSpace: number }) {
  const members = useMembers();
  return (
    <FlatList
      data={members}
      keyExtractor={(u) => u.id}
      renderItem={({ item }) => (
        <PersonRow
          user={item}
          action={
            <Button
              label="Message"
              variant="secondary"
              size="compact"
              accessibilityLabel={`Message ${item.username}`}
              onPress={() => openThread(item.id)}
            />
          }
        />
      )}
      contentContainerStyle={[styles.empty, { paddingBottom: bottomSpace }]}
      ListHeaderComponent={
        <View style={styles.emptyHeader}>
          <EmptyState
            icon={MessageSquare}
            title="Start a conversation"
            body="Messages are one-to-one and only seen by the two of you."
          />
          <Text variant="username" style={styles.membersTitle}>
            Members
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  empty: { paddingHorizontal: space.screenEdge, paddingTop: space.lg },
  emptyHeader: { gap: space.lg },
  membersTitle: { marginTop: space.sm },
});
