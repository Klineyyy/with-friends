import { Heart } from "lucide-react-native";
import { StyleSheet, View } from "react-native";

import { EmptyState } from "@/components/EmptyState";
import { TopBar } from "@/components/TopBar";
import { space, useColors } from "@/theme";

/** Board 16b. The full Activity list (16a) comes in Phase 6. */
export default function Activity() {
  const colors = useColors();
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <TopBar back title="Activity" />
      <View style={styles.body}>
        <EmptyState icon={Heart} title="Nothing yet" body="Likes, comments, and follows show up here." />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { paddingHorizontal: space.screenEdge, paddingTop: space.lg },
});
