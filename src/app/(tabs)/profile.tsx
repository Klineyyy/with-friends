import { router } from "expo-router";
import { Camera, Menu, SquarePlus } from "lucide-react-native";
import { StyleSheet, View } from "react-native";

import { EmptyState } from "@/components/EmptyState";
import { useTabBarSpace } from "@/components/FloatingTabBar";
import { PhotoGrid } from "@/components/PhotoGrid";
import { ProfileHeader } from "@/components/ProfileHeader";
import { TopBar } from "@/components/TopBar";
import { Button, IconButton } from "@/components/ui";
import { pickPostMedia } from "@/lib/pick-media";
import { useMe, useUserPosts } from "@/lib/posts";
import { space, useColors } from "@/theme";

/** Board 11a (your profile) and 11b (no posts yet). */
export default function Profile() {
  const colors = useColors();
  const me = useMe();
  const posts = useUserPosts(me.id);
  const bottomSpace = useTabBarSpace();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <TopBar
        title={me.username}
        trailing={
          <>
            <IconButton icon={SquarePlus} accessibilityLabel="New post" onPress={pickPostMedia} />
            <IconButton icon={Menu} accessibilityLabel="Settings" onPress={() => router.push("/settings")} />
          </>
        }
      />
      <PhotoGrid
        posts={posts ?? []}
        contentContainerStyle={{ paddingBottom: bottomSpace }}
        ListHeaderComponent={
          <ProfileHeader
            user={me}
            actions={
              <Button
                label="Edit profile"
                variant="secondary"
                style={styles.fill}
                onPress={() => router.push("/edit-profile")}
              />
            }
          />
        }
        ListEmptyComponent={
          posts === undefined ? undefined : <View style={[styles.empty, { borderTopColor: colors.divider }]}>
            <EmptyState
              icon={Camera}
              title="Share your first photo"
              body="Your photos and videos show up here for your circle."
              action={
                <Button label="New post" size="compact" style={styles.newPost} onPress={pickPostMedia} />
              }
            />
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fill: { flex: 1 },
  empty: {
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: space.screenEdge,
    paddingTop: space.xl,
  },
  // Board 11b: a bigger button than the compact pill, like "Go to Explore" on Home.
  newPost: { height: 44, borderRadius: 8, paddingHorizontal: 20 },
});
