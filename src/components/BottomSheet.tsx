import type { ReactNode } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { space, useColors } from "@/theme";

type Props = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
};

/**
 * Board 19 sheet: dimmed screen behind, white panel with rounded top corners and
 * a grab handle. Tap outside or press Back to close. Appears without sliding
 * (design.md: the like heart is the only animation). Also for comments and
 * share (board 7, 8a) in Phase 5.
 */
export function BottomSheet({ visible, onClose, children }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <View style={styles.root}>
        <Pressable style={[StyleSheet.absoluteFill, styles.scrim]} onPress={onClose} accessibilityLabel="Close" />
        <View
          role="dialog"
          aria-modal
          style={[
            styles.sheet,
            { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, space.md) + space.sm },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.divider }]} />
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  scrim: { backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: space.sm,
    maxHeight: "90%",
  },
  handle: { alignSelf: "center", width: 36, height: 4, borderRadius: 2, marginBottom: space.sm },
});
