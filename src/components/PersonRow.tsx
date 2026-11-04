import { StyleSheet, View } from "react-native";

import { Avatar, Button, Text } from "@/components/ui";
import { useFollowing, type User } from "@/lib/posts";
import { space } from "@/theme";

/** 44 avatar + username over display name + Follow / Following. design.md §1. */
export function PersonRow({ user }: { user: User }) {
  const { isFollowing, follow, unfollow } = useFollowing();
  const following = isFollowing(user.id);

  return (
    <View style={styles.row}>
      <Avatar uri={user.avatarUri} size={44} accessibilityLabel={user.username} />
      <View style={styles.names}>
        <Text variant="username" numberOfLines={1}>
          {user.username}
        </Text>
        <Text variant="meta" tone="secondary" numberOfLines={1}>
          {user.displayName}
        </Text>
      </View>
      <Button
        size="compact"
        variant={following ? "secondary" : "primary"}
        label={following ? "Following" : "Follow"}
        accessibilityLabel={following ? `Unfollow ${user.username}` : `Follow ${user.username}`}
        onPress={() => (following ? unfollow(user.id) : follow(user.id))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: space.sm },
  names: { flex: 1 },
});
