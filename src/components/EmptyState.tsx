import type { LucideIcon } from "lucide-react-native";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { Text } from "@/components/ui";
import { useColors } from "@/theme";

type Props = { icon?: LucideIcon; title: string; body?: string; action?: ReactNode };

/** Icon, title, one line of help, optional button. Left-aligned like the board. */
export function EmptyState({ icon: Icon, title, body, action }: Props) {
  const colors = useColors();
  return (
    <View style={styles.wrap}>
      {Icon ? <Icon size={24} strokeWidth={1.75} color={colors.text} style={styles.icon} /> : null}
      <Text variant="title">{title}</Text>
      {body ? <Text tone="secondary">{body}</Text> : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6, alignItems: "flex-start" },
  icon: { marginBottom: 10 },
  action: { marginTop: 18 },
});
