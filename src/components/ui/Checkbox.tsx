import { Check } from "lucide-react-native";
import { Pressable, StyleSheet } from "react-native";

import { useColors } from "@/theme";

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  accessibilityLabel: string;
};

/** Black fill + white check when on; outline when off. */
export function Checkbox({ checked, onChange, accessibilityLabel }: Props) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={accessibilityLabel}
      onPress={() => onChange(!checked)}
      hitSlop={11}
      style={[
        styles.box,
        checked
          ? { backgroundColor: colors.text, borderColor: colors.text }
          : { borderColor: colors.textSecondary },
      ]}
    >
      {checked && <Check size={16} strokeWidth={2.5} color={colors.background} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
});
