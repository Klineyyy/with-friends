import { router } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { Avatar, Text } from "@/components/ui";
import { useFollowLists, useUserPosts, type User } from "@/lib/posts";
import { space } from "@/theme";

type Props = {
  user: User;
  /** Edit profile, or Follow + Message. */
  actions: ReactNode;
};

/**
 * Board 11a / 12: 80 avatar, display name, @username, bio,
 * "18 posts  9 followers  10 following", then the action buttons.
 * Followers and following open board 13.
 */
export function ProfileHeader({ user, actions }: Props) {
  const posts = useUserPosts(user.id);
  const { followers, following } = useFollowLists(user.id);

  const openFollows = (tab: "followers" | "following") =>
    router.push({ pathname: "/follows/[id]", params: { id: user.id, tab } });

  return (
    <View style={styles.wrap}>
      <Avatar uri={user.avatarUri} size={80} accessibilityLabel={`${user.username}'s photo`} />
      <View style={styles.names}>
        {user.displayName ? <Text variant="username">{user.displayName}</Text> : null}
        <Text variant="meta" tone="secondary">
          @{user.username}
        </Text>
      </View>
      {user.bio ? <Text>{user.bio}</Text> : null}
      <View style={styles.counts}>
        <Count value={posts.length} one="post" />
        <Count value={followers.length} one="follower" onPress={() => openFollows("followers")} />
        <Count value={following.length} one="following" many="following" onPress={() => openFollows("following")} />
      </View>
      <View style={styles.actions}>{actions}</View>
    </View>
  );
}

function Count({
  value,
  one,
  many = `${one}s`,
  onPress,
}: {
  value: number;
  one: string;
  many?: string;
  onPress?: () => void;
}) {
  const label = value === 1 ? one : many;
  const text = (
    <Text>
      <Text variant="username">{value}</Text> <Text tone="secondary">{label}</Text>
    </Text>
  );
  if (!onPress) return text;
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${value} ${label}`}
      hitSlop={{ top: 12, bottom: 12, left: 6, right: 6 }}
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}
    >
      {text}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: space.screenEdge,
    paddingTop: space.sm,
    paddingBottom: space.md,
    gap: 12,
    alignItems: "flex-start",
  },
  names: { gap: 2, marginTop: 4 },
  counts: { flexDirection: "row", gap: 20 },
  actions: { alignSelf: "stretch", flexDirection: "row", gap: space.sm, marginTop: 4 },
  pressed: { opacity: 0.6 },
});
