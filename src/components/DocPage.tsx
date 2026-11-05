import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TopBar } from "@/components/TopBar";
import { Text } from "@/components/ui";
import { space, useColors } from "@/theme";

export type DocSection = { heading: string; body: string };

/** A plain reading page: title bar, intro, then headed sections (Community rules, Terms). */
export function DocPage({ title, intro, sections }: { title: string; intro?: string; sections: DocSection[] }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <TopBar back title={title} />
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + space.xl }]}>
        {intro ? <Text tone="secondary">{intro}</Text> : null}
        {sections.map((s) => (
          <View key={s.heading} style={styles.section}>
            <Text variant="username" role="heading">
              {s.heading}
            </Text>
            <Text>{s.body}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { paddingHorizontal: space.screenEdge, paddingTop: space.sm, gap: space.lg },
  section: { gap: 4 },
});
