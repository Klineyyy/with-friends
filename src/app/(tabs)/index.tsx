import { router } from "expo-router";
import { Heart, SquarePlus } from "lucide-react-native";
import { useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";

import { useTabBarSpace } from "@/components/FloatingTabBar";
import { PersonRow } from "@/components/PersonRow";
import { PostItem } from "@/components/post/PostItem";
import { UploadStatusRow } from "@/components/post/UploadStatusRow";
import { TopBar } from "@/components/TopBar";
import { Button, IconButton, Logo, Text } from "@/components/ui";
import { pickPostMedia } from "@/lib/pick-media";
import { useUnread } from "@/lib/inbox";
import { useFeed, useFollowing, useSuggestedPeople, useUploads } from "@/lib/posts";
import { space, useColors } from "@/theme";

/** Board 4 (feed), 5 (empty), 6.3–6.4 (upload row). */
export default function Home() {
  const colors = useColors();
  const feed = useFeed();
  const unread = useUnread();
  const { uploads, retry } = useUploads();
  const { count: followingCount } = useFollowing();
  const bottomSpace = useTabBarSpace();
  const [refreshing, setRefreshing] = useState(false);

  // Convex queries are live, so there's nothing to refetch; the spinner just confirms the pull.
  function refresh() {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  }

  // Board 5 shows until you follow someone. Your own posts still show without follows.
  const showEmpty = feed !== undefined && followingCount === 0 && feed.length === 0 && uploads.length === 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <TopBar
        title={<Logo />}
        trailing={
          <>
            <IconButton
              icon={Heart}
              accessibilityLabel={unread.activity ? "Activity, new" : "Activity"}
              dot={unread.activity}
              onPress={() => router.push("/activity")}
            />
            <IconButton icon={SquarePlus} accessibilityLabel="New post" onPress={pickPostMedia} />
          </>
        }
      />
      {showEmpty ? (
        <HomeEmpty bottomSpace={bottomSpace} />
      ) : (
        <FlatList
          data={feed ?? []}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => <PostItem post={item} />}
          ListHeaderComponent={
            uploads.length ? (
              <View>
                {uploads.map((u) => (
                  <UploadStatusRow key={u.id} upload={u} onRetry={() => retry(u)} />
                ))}
              </View>
            ) : undefined
          }
          contentContainerStyle={{ paddingBottom: bottomSpace }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.textSecondary} />
          }
        />
      )}
    </View>
  );
}

/** Board 5: no follows yet. */
function HomeEmpty({ bottomSpace }: { bottomSpace: number }) {
  const people = useSuggestedPeople();
  return (
    <FlatList
      data={people}
      keyExtractor={(u) => u.id}
      renderItem={({ item }) => <PersonRow user={item} />}
      contentContainerStyle={[styles.empty, { paddingBottom: bottomSpace }]}
      ListHeaderComponent={
        <View style={styles.emptyHeader}>
          <View style={styles.emptyText}>
            <Text variant="title">Follow people to see their posts here</Text>
            <Text tone="secondary">Everyone in your circle is on Explore.</Text>
          </View>
          <Button
            label="Go to Explore"
            size="compact"
            style={styles.exploreButton}
            onPress={() => router.navigate("/explore")}
          />
          <Text variant="username" style={styles.peopleTitle}>
            People you may know
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
  emptyText: { gap: 6 },
  exploreButton: { alignSelf: "flex-start", height: 44, borderRadius: 8, paddingHorizontal: 20 },
  peopleTitle: { marginTop: space.lg },
});
