import { StyleSheet, View } from "react-native";

import { TopBar } from "@/components/TopBar";
import { Text } from "@/components/ui";
import { space, useColors } from "@/theme";

/** TEMPORARY placeholder for Explore (board 10a–10b, Phase 4). */
export default function Explore() {
  const colors = useColors();
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <TopBar title="Explore" />
      <View style={styles.body}>
        <Text tone="secondary">Explore comes in Phase 4.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { paddingHorizontal: space.screenEdge },
});
