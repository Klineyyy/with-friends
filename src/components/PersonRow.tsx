import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { Avatar, Button, Text } from "@/components/ui";
import { openProfile } from "@/lib/open-profile";
import { useFollowing, useMe, type User } from "@/lib/posts";
import { space } from "@/theme";

/**
 * 44 avatar + username over display name + Follow / Following. design.md §1.
 * Tap the person to open their profile. Your own row shows "You" (board 9).
 * `action` replaces the Follow button (e.g. Message on board 14b; `null` = none),
 * `onPress` replaces opening the profile.
 */
export function PersonRow({ user, action, onPress }: { user: User; action?: ReactNode; onPress?: () => void }) {
  const { isFollowing, follow, unfollow } = useFollowing();
  const following = isFollowing(user.id);
  const isMe = user.id === useMe().id;

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`${user.username}, ${user.displayName}`}
        onPress={onPress ?? (() => openProfile(user.id))}
        style={({ pressed }) => [styles.person, pressed && styles.pressed]}
      >
        <Avatar uri={user.avatarUri} size={44} />
        <View style={styles.names}>
          <Text variant="username" numberOfLines={1}>
            {user.username}
          </Text>
          {user.displayName ? (
            <Text variant="meta" tone="secondary" numberOfLines={1}>
              {user.displayName}
            </Text>
          ) : null}
        </View>
      </Pressable>
      {action !== undefined ? (
        action
      ) : isMe ? (
        <Text variant="meta" tone="secondary">
          You
        </Text>
      ) : (
        <Button
          size="compact"
          variant={following ? "secondary" : "primary"}
          label={following ? "Following" : "Follow"}
          accessibilityLabel={following ? `Unfollow ${user.username}` : `Follow ${user.username}`}
          onPress={() => (following ? unfollow(user.id) : follow(user.id))}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: space.sm },
  person: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  names: { flex: 1 },
  pressed: { opacity: 0.6 },
});
