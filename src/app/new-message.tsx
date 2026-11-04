import { router } from "expo-router";
import { X } from "lucide-react-native";
import { useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PersonRow } from "@/components/PersonRow";
import { TopBar } from "@/components/TopBar";
import { IconButton, SearchField, Text } from "@/components/ui";
import { useMembers } from "@/lib/inbox";
import { useSearchPeople } from "@/lib/posts";
import { space, useColors } from "@/theme";

/**
 * ✎ on Messages (not on the board; built like 8b "Send to…"): ✕ "New message",
 * search, members. Tap someone to open your thread with them.
 */
export default function NewMessage() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const members = useMembers();
  const results = useSearchPeople(query);
  const people = query.trim() ? results : members;

  // Replace, so Back from the thread returns to Messages, not this picker.
  const open = (userId: string) => router.replace({ pathname: "/thread/[id]", params: { id: userId } });

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <TopBar
        title="New message"
        leading={<IconButton icon={X} accessibilityLabel="Close" onPress={() => router.back()} />}
      />
      <View style={styles.search}>
        <SearchField value={query} onChangeText={setQuery} placeholder="Search people" autoFocus />
      </View>
      <FlatList
        data={people}
        keyExtractor={(u) => u.id}
        renderItem={({ item }) => <PersonRow user={item} action={null} onPress={() => open(item.id)} />}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + space.md }]}
        ListEmptyComponent={
          <Text tone="secondary" style={styles.none}>
            No one matches “{query.trim()}”.
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  search: { paddingHorizontal: space.screenEdge, paddingBottom: space.sm },
  list: { paddingHorizontal: space.screenEdge },
  none: { paddingTop: space.md },
});
