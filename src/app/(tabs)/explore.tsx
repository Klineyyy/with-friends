import { useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";

import { useTabBarSpace } from "@/components/FloatingTabBar";
import { PersonRow } from "@/components/PersonRow";
import { PhotoGrid } from "@/components/PhotoGrid";
import { TopBar } from "@/components/TopBar";
import { SearchField, Text } from "@/components/ui";
import { plural } from "@/lib/format";
import { useExplorePosts, useSearchPeople } from "@/lib/posts";
import { space, useColors } from "@/theme";

/** Board 10a (grid of recent posts from everyone) and 10b (people search). */
export default function Explore() {
  const colors = useColors();
  const bottomSpace = useTabBarSpace();
  const [query, setQuery] = useState("");
  const posts = useExplorePosts();
  const people = useSearchPeople(query);
  const searching = query.trim().length > 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <TopBar title="Explore" />
      <View style={styles.search}>
        <SearchField value={query} onChangeText={setQuery} placeholder="Search people" />
      </View>
      {searching ? (
        <FlatList
          data={people}
          keyExtractor={(u) => u.id}
          renderItem={({ item }) => <PersonRow user={item} />}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={[styles.people, { paddingBottom: bottomSpace }]}
          ListHeaderComponent={
            <Text variant="meta" tone="secondary" style={styles.count}>
              {people.length ? plural(people.length, "person", "people") : "No one by that name"}
            </Text>
          }
        />
      ) : (
        <PhotoGrid
          posts={posts ?? []}
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ paddingBottom: bottomSpace }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  search: { paddingHorizontal: space.screenEdge, paddingBottom: 12 },
  people: { paddingHorizontal: space.screenEdge },
  count: { paddingBottom: space.xs },
});
