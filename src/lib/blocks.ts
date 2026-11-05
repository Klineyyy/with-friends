import { Alert } from "react-native";

import { useBlocks, type User } from "./posts";

/** Block / Unblock with a confirm first, as every entry point should ask the same way. */
export function useBlockActions() {
  const { isBlocked, block, unblock } = useBlocks();

  const confirmBlock = (user: User) =>
    Alert.alert(
      `Block ${user.username}?`,
      "They won't be able to see your posts or message you, and you won't see theirs. They won't be told.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Block", style: "destructive", onPress: () => block(user.id) },
      ],
    );

  const confirmUnblock = (user: User) =>
    Alert.alert(
      `Unblock ${user.username}?`,
      "They'll be able to see your posts and message you again. You'll need to follow each other again.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Unblock", onPress: () => unblock(user.id) },
      ],
    );

  return { isBlocked, block, confirmBlock, confirmUnblock };
}
