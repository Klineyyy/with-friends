import { Text as RNText, type TextProps as RNTextProps } from "react-native";

import { typeScale, useColors, type TypeVariant } from "@/theme";

type Props = RNTextProps & {
  variant?: TypeVariant;
  tone?: "default" | "secondary";
};

export function Text({ variant = "body", tone = "default", style, ...rest }: Props) {
  const colors = useColors();
  return (
    <RNText
      style={[
        typeScale[variant],
        { color: tone === "secondary" ? colors.textSecondary : colors.text },
        style,
      ]}
      {...rest}
    />
  );
}
