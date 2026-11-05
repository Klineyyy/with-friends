import { StyleSheet, View } from "react-native";

import { RadioRow } from "@/components/SettingsRow";
import { TopBar } from "@/components/TopBar";
import { setAppearancePref, useAppearancePref, useColors, type AppearancePref } from "@/theme";

const OPTIONS: { value: AppearancePref; label: string; description?: string }[] = [
  { value: "system", label: "System", description: "Match your phone's setting" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

/** Appearance (not on the board; design.md "Appearance choice"). Saved on this phone. */
export default function Appearance() {
  const colors = useColors();
  const pref = useAppearancePref();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <TopBar back title="Appearance" />
      <View role="radiogroup" accessibilityLabel="Appearance">
        {OPTIONS.map((o) => (
          <RadioRow
            key={o.value}
            label={o.label}
            description={o.description}
            selected={pref === o.value}
            onPress={() => setAppearancePref(o.value)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
