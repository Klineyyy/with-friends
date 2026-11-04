import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { space, useColors } from "@/theme";

type Props = {
  children: ReactNode;
  /** Pinned to the bottom of the screen, above the gesture bar. */
  footer?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Full-screen container: safe-area padding, 16 px edges, optional bottom footer. */
export function Screen({ children, footer, style }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top,
          paddingBottom: Math.max(insets.bottom, space.md),
        },
      ]}
    >
      <View style={[styles.body, style]}>{children}</View>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: space.screenEdge },
  body: { flex: 1 },
  footer: { gap: 12, paddingTop: space.md },
});
