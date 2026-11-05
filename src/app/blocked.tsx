import { Ban } from "lucide-react-native";
import { FlatList, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/EmptyState";
import { PersonRow } from "@/components/PersonRow";
import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui";
import { useBlockActions } from "@/lib/blocks";
import { useBlocks, useUsers } from "@/lib/posts";
import { space, useColors } from "@/theme";

/** Blocked users (not on the board; built like the follower list, 13). */
export default function BlockedUsers() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const userById = useUsers();
  const { blockedIds } = useBlocks();
  const { confirmUnblock } = useBlockActions();
  const people = blockedIds.map(userById);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <TopBar back title="Blocked users" />
      <FlatList
        data={people}
        keyExtractor={(u) => u.id}
        renderItem={({ item }) => (
          <PersonRow
            user={item}
            action={
              <Button
                label="Unblock"
                variant="secondary"
                size="compact"
                accessibilityLabel={`Unblock ${item.username}`}
                onPress={() => confirmUnblock(item)}
              />
            }
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <EmptyState
              icon={Ban}
              title="No one blocked"
              body="People you block can't see your posts or message you. Block someone from ⋯ on their profile."
            />
          </View>
        }
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + space.md }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: { paddingHorizontal: space.screenEdge },
  empty: { paddingTop: space.lg },
});
