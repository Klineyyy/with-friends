import { Heart } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { SectionList, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ActivityRow, type ActivityEntry } from "@/components/ActivityRow";
import { EmptyState } from "@/components/EmptyState";
import { TopBar } from "@/components/TopBar";
import { Text } from "@/components/ui";
import { activitySection } from "@/lib/format";
import { useActivity, type ActivityItem } from "@/lib/inbox";
import { space, useColors } from "@/theme";

type Section = { title: string; data: ActivityEntry[] };

/** Board 16a (Today / This week) and 16b (nothing yet). Opening it marks everything read. */
export default function Activity() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { items, markAllRead } = useActivity();

  // Keep the dots that were unread when the list first loaded, then clear the Home heart.
  const [unreadOnOpen, setUnreadOnOpen] = useState<Set<string> | null>(null);
  if (items && !unreadOnOpen) setUnreadOnOpen(new Set(items.filter((a) => !a.read).map((a) => a.id)));
  const loaded = unreadOnOpen !== null;
  useEffect(() => {
    if (loaded) markAllRead();
  }, [loaded, markAllRead]);

  const sections = useMemo(() => buildSections(items ?? [], unreadOnOpen ?? new Set()), [items, unreadOnOpen]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <TopBar back title="Activity" />
      {items === undefined ? null : sections.length ? (
        <SectionList
          sections={sections}
          keyExtractor={(e) => e.key}
          renderItem={({ item }) => <ActivityRow entry={item} />}
          renderSectionHeader={({ section }) => (
            <Text variant="username" style={[styles.header, { backgroundColor: colors.background }]}>
              {section.title}
            </Text>
          )}
          contentContainerStyle={{ paddingBottom: insets.bottom + space.md }}
        />
      ) : (
        <View style={styles.empty}>
          <EmptyState icon={Heart} title="Nothing yet" body="Likes, comments, and follows show up here." />
        </View>
      )}
    </View>
  );
}

/**
 * Today / This week / Earlier, newest first. Likes on the same post within a
 * section become one row ("tom and 2 others liked your post.", board 16a);
 * comments and follows stay one row each.
 */
function buildSections(
  items: ActivityItem[],
  unreadOnOpen: Set<string>,
): Section[] {
  const sections: Section[] = [];
  const likeGroups = new Map<string, ActivityEntry>();
  for (const item of items) {
    const title = activitySection(item.createdAt);
    let section = sections.find((s) => s.title === title);
    if (!section) {
      section = { title, data: [] };
      sections.push(section);
    }
    const unread = unreadOnOpen.has(item.id);
    const groupKey = item.type === "like" && item.post ? `${title}:${item.post.id}` : undefined;
    const group = groupKey ? likeGroups.get(groupKey) : undefined;
    if (group) {
      if (!group.actors.some((u) => u.id === item.actorId)) group.actors.push(item.actor);
      group.unread ||= unread;
      continue;
    }
    const entry: ActivityEntry = {
      key: item.id,
      type: item.type,
      actors: [item.actor],
      post: item.post,
      body: item.body,
      createdAt: item.createdAt,
      unread,
    };
    section.data.push(entry);
    if (groupKey) likeGroups.set(groupKey, entry);
  }
  return sections;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: space.screenEdge, paddingTop: space.md, paddingBottom: space.xs },
  empty: { paddingHorizontal: space.screenEdge, paddingTop: space.lg },
});
