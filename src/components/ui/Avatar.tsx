import { Image } from "expo-image";
import { User } from "lucide-react-native";
import { StyleSheet, View } from "react-native";

import { useColors } from "@/theme";

export type AvatarSize = 24 | 32 | 44 | 52 | 80;

type Props = { uri?: string | null; size: AvatarSize; accessibilityLabel?: string };

export function Avatar({ uri, size, accessibilityLabel }: Props) {
  const colors = useColors();
  const shape = { width: size, height: size, borderRadius: size / 2 };

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[shape, { backgroundColor: colors.surface }]}
        contentFit="cover"
        accessibilityLabel={accessibilityLabel}
      />
    );
  }
  return (
    <View
      style={[shape, styles.empty, { backgroundColor: colors.surface }]}
      accessibilityLabel={accessibilityLabel}
    >
      <User size={size * 0.45} strokeWidth={1.75} color={colors.textSecondary} />
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: "center", justifyContent: "center" },
});
