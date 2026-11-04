import { StyleSheet, View } from "react-native";

import { TopBar } from "@/components/TopBar";
import { Text } from "@/components/ui";
import { space, useColors } from "@/theme";

/** TEMPORARY placeholder for Messages (board 14a–15, Phase 6). */
export default function Messages() {
  const colors = useColors();
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <TopBar title="Messages" />
      <View style={styles.body}>
        <Text tone="secondary">Messages come in Phase 6.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { paddingHorizontal: space.screenEdge },
});
