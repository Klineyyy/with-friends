import { StyleSheet, View } from "react-native";
import Svg, { Circle, Ellipse, Path } from "react-native-svg";

import { useColors } from "@/theme";

import { Text } from "./Text";

type MarkProps = { width?: number };

/** The banded fish mark. Always black-and-white: inverts in dark mode. */
export function LogoMark({ width = 30 }: MarkProps) {
  const colors = useColors();
  const ink = colors.text;
  const paper = colors.background;
  return (
    <Svg width={width} height={(width * 40) / 60} viewBox="0 0 60 40" accessibilityLabel="With Friends logo">
      <Path d="M36 20 L57 5 Q51 20 57 35 Z" fill={ink} />
      <Ellipse cx={22} cy={20} rx={20} ry={15} fill={ink} />
      <Path d="M15 4.5 Q11.5 20 15 35.5" stroke={paper} strokeWidth={2.6} fill="none" />
      <Path d="M28.5 4.5 Q32 20 28.5 35.5" stroke={paper} strokeWidth={2.6} fill="none" />
      <Circle cx={8.5} cy={19} r={2.3} fill={paper} />
    </Svg>
  );
}

/** Mark + "With Friends" wordmark, as used in the app header. */
export function Logo() {
  return (
    <View style={styles.row}>
      <LogoMark />
      <Text variant="title">With Friends</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
});
