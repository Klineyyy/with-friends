import type { LucideIcon } from "lucide-react-native";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "@/components/ui";
import { radius, space, useColors } from "@/theme";

export type MenuItem = { icon: LucideIcon; label: string; onPress: () => void };

type Props = {
  visible: boolean;
  onClose: () => void;
  items: MenuItem[];
};

/**
 * Small menu dropped from the ⋯ in the top bar (board 12: Block maya / Report maya).
 * Outlined card under the top-right corner; tap outside to close.
 */
export function MenuPopover({ visible, onClose, items }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close menu" />
      <View
        role="menu"
        style={[
          styles.card,
          {
            top: insets.top + 48,
            backgroundColor: colors.background,
            borderColor: colors.divider,
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
          },
        ]}
      >
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <Pressable
              key={item.label}
              role="menuitem"
              onPress={() => {
                onClose();
                item.onPress();
              }}
              style={({ pressed }) => [
                styles.item,
                i > 0 && { borderTopColor: colors.divider, borderTopWidth: StyleSheet.hairlineWidth * 2 },
                pressed && { backgroundColor: colors.surface },
              ]}
            >
              <Icon size={20} strokeWidth={1.75} color={colors.text} />
              <Text>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "absolute",
    right: space.screenEdge,
    minWidth: 200,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radius.button,
    overflow: "hidden",
  },
  item: { flexDirection: "row", alignItems: "center", gap: 12, height: 48, paddingHorizontal: space.md },
});
