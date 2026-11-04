import { StyleSheet, TextInput, View, type TextInputProps } from "react-native";

import { radius, typeScale, useColors } from "@/theme";

import { Text } from "./Text";

type Props = TextInputProps & { label: string };

/** Label above a 1 px outlined input with 8 px corners. */
export function TextField({ label, style, ...rest }: Props) {
  const colors = useColors();
  return (
    <View style={styles.wrap}>
      <Text variant="meta" tone="secondary">
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.textSecondary}
        cursorColor={colors.text}
        selectionColor={colors.textSecondary}
        style={[
          typeScale.body,
          styles.input,
          { color: colors.text, borderColor: colors.text },
          style,
        ]}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: radius.input,
    paddingHorizontal: 14,
    paddingVertical: 0,
  },
});
