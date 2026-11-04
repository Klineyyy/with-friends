import type { LucideIcon } from "lucide-react-native";
import { Pressable, StyleSheet, View, type PressableProps } from "react-native";

import { useColors } from "@/theme";

import { UnreadDot } from "./UnreadDot";

type Props = Omit<PressableProps, "children" | "style"> & {
  icon: LucideIcon;
  accessibilityLabel: string;
  /** Fern dot at the top right of the icon. */
  dot?: boolean;
  color?: string;
};

/** A 24 px line icon in a 44 px touch target. */
export function IconButton({ icon: Icon, dot, color, ...rest }: Props) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={4}
      style={({ pressed }) => [styles.target, pressed && styles.pressed]}
      {...rest}
    >
      <View>
        <Icon size={24} strokeWidth={1.75} color={color ?? colors.text} />
        {dot ? <UnreadDot style={styles.dot} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  target: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.6 },
  dot: { position: "absolute", top: -2, right: -3 },
});
