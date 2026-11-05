import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PersonRow } from "@/components/PersonRow";
import { TopBar } from "@/components/TopBar";
import { UnderlineTabs } from "@/components/UnderlineTabs";
import { Text } from "@/components/ui";
import { plural } from "@/lib/format";
import { useFollowLists, useUsers } from "@/lib/posts";
import { space, useColors } from "@/theme";

type Tab = "followers" | "following";

/** Board 13: ← username, "10 followers" / "9 following" tabs, people rows. */
export default function Follows() {
  const params = useLocalSearchParams<{ id: string; tab?: Tab }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const userById = useUsers();
  const lists = useFollowLists(params.id);
  const followers = lists?.followers ?? [];
  const following = lists?.following ?? [];
  const [tab, setTab] = useState<Tab>(params.tab === "following" ? "following" : "followers");

  const user = userById(params.id);
  const people = tab === "followers" ? followers : following;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <TopBar back title={user.username} />
      <UnderlineTabs
        tabs={[
          { value: "followers", label: plural(followers.length, "follower") },
          { value: "following", label: `${following.length} following` },
        ]}
        value={tab}
        onChange={setTab}
      />
      <FlatList
        data={people}
        keyExtractor={(u) => u.id}
        renderItem={({ item }) => <PersonRow user={item} />}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + space.md }]}
        ListEmptyComponent={
          <Text tone="secondary" style={styles.empty}>
            {tab === "followers" ? "No followers yet." : "Not following anyone yet."}
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: { paddingHorizontal: space.screenEdge, paddingTop: space.sm },
  empty: { paddingTop: space.md },
});
