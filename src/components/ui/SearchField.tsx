import { Search, X } from "lucide-react-native";
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from "react-native";

import { radius, typeScale, useColors } from "@/theme";

type Props = Omit<TextInputProps, "value" | "onChangeText"> & {
  value: string;
  onChangeText: (text: string) => void;
};

/** Grey field with a search icon and a clear ×. design.md §1 Controls. */
export function SearchField({ value, onChangeText, placeholder, style, ...rest }: Props) {
  const colors = useColors();
  return (
    <View style={[styles.wrap, { backgroundColor: colors.surface }, style]}>
      <Search size={20} strokeWidth={1.75} color={colors.textSecondary} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        accessibilityLabel={placeholder}
        placeholderTextColor={colors.textSecondary}
        cursorColor={colors.text}
        selectionColor={colors.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        style={[typeScale.body, styles.input, { color: colors.text }]}
        {...rest}
      />
      {value ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          hitSlop={10}
          onPress={() => onChangeText("")}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <X size={20} strokeWidth={1.75} color={colors.textSecondary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    borderRadius: radius.input,
  },
  input: { flex: 1, height: "100%", paddingVertical: 0 },
  pressed: { opacity: 0.6 },
});
