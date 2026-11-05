import { Redirect, router, useLocalSearchParams } from "expo-router";
import { Ban, Ellipsis, Flag, ImageIcon, UserX } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/EmptyState";
import { MenuPopover } from "@/components/MenuPopover";
import { PhotoGrid } from "@/components/PhotoGrid";
import { ProfileHeader } from "@/components/ProfileHeader";
import { TopBar } from "@/components/TopBar";
import { Button, IconButton } from "@/components/ui";
import { useBlockActions } from "@/lib/blocks";
import { ME_ID } from "@/lib/mock-data";
import { openThread } from "@/lib/open-profile";
import { useFollowing, userExists, useUserPosts, useUsers } from "@/lib/posts";
import { useReport } from "@/lib/safety";
import { space, useColors } from "@/theme";

/** Board 12: someone else's profile. ⋯ opens Block / Report. Blocked: no posts, just Unblock. */
export default function UserProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const userById = useUsers();
  const posts = useUserPosts(id);
  const { isFollowing, follow, unfollow } = useFollowing();
  const [menuOpen, setMenuOpen] = useState(false);
  const { isBlocked, confirmBlock, confirmUnblock } = useBlockActions();
  const report = useReport();

  // Your own profile lives on the Profile tab.
  if (id === ME_ID) return <Redirect href="/profile" />;

  if (!userExists(id)) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <TopBar back />
        <View style={styles.missing}>
          <EmptyState
            icon={UserX}
            title="This account isn't here anymore."
            body="It may have been deleted."
            action={<Button label="Back to home" variant="secondary" size="compact" onPress={() => router.navigate("/")} />}
          />
        </View>
      </View>
    );
  }

  const user = userById(id);
  const following = isFollowing(id);
  const blocked = isBlocked(id);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <TopBar
        back
        title={user.username}
        trailing={<IconButton icon={Ellipsis} accessibilityLabel="More" onPress={() => setMenuOpen(true)} />}
      />
      <PhotoGrid
        posts={blocked ? [] : posts}
        contentContainerStyle={{ paddingBottom: insets.bottom + space.md }}
        ListHeaderComponent={
          <ProfileHeader
            user={user}
            actions={
              blocked ? (
                <Button
                  label="Unblock"
                  variant="secondary"
                  accessibilityLabel={`Unblock ${user.username}`}
                  style={styles.fill}
                  onPress={() => confirmUnblock(user)}
                />
              ) : (
                <>
                  <Button
                    label={following ? "Following" : "Follow"}
                    variant={following ? "secondary" : "primary"}
                    accessibilityLabel={following ? `Unfollow ${user.username}` : `Follow ${user.username}`}
                    style={styles.fill}
                    onPress={() => (following ? unfollow(id) : follow(id))}
                  />
                  <Button
                    label="Message"
                    variant="secondary"
                    style={styles.fill}
                    onPress={() => openThread(id)}
                  />
                </>
              )
            }
          />
        }
        ListEmptyComponent={
          <View style={[styles.empty, { borderTopColor: colors.divider }]}>
            {blocked ? (
              <EmptyState
                icon={Ban}
                title={`You blocked ${user.username}`}
                body="They can't see your posts or message you. Unblock to see theirs."
              />
            ) : (
              <EmptyState icon={ImageIcon} title="No posts yet" />
            )}
          </View>
        }
      />
      <MenuPopover
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        items={[
          blocked
            ? { icon: Ban, label: `Unblock ${user.username}`, onPress: () => confirmUnblock(user) }
            : { icon: Ban, label: `Block ${user.username}`, onPress: () => confirmBlock(user) },
          { icon: Flag, label: `Report ${user.username}`, onPress: () => report({ type: "user", id, userId: id }) },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fill: { flex: 1 },
  missing: { paddingHorizontal: space.screenEdge, paddingTop: space.lg },
  empty: {
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: space.screenEdge,
    paddingTop: space.xl,
  },
});
