import { View, type StyleProp, type ViewStyle } from "react-native";

import { useColors } from "@/theme";

/** Fern dot for unread activity and messages. */
export function UnreadDot({ size = 8, style }: { size?: number; style?: StyleProp<ViewStyle> }) {
  const colors = useColors();
  return (
    <View
      accessibilityLabel="Unread"
      style={[
        { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.fern },
        style,
      ]}
    />
  );
}
