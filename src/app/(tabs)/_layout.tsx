import { BlurTargetView } from "expo-blur";
import { Tabs } from "expo-router/js-tabs";
import { useRef, type ComponentRef } from "react";
import { StyleSheet, View } from "react-native";

import { FloatingTabBar } from "@/components/FloatingTabBar";
import { hasNativeBlur } from "@/lib/native";
import { useColors } from "@/theme";

/**
 * Home · Explore · Messages · Profile under a floating glass tab bar.
 * The bar sits outside the navigator so Android can blur the tab screens
 * (expo-blur only blurs what's inside a BlurTargetView, which can't contain the blur itself).
 */
export default function TabsLayout() {
  const colors = useColors();
  const blurTarget = useRef<ComponentRef<typeof View> | null>(null);
  // Older dev builds don't include expo-blur's native views (see lib/native.ts).
  const Target = hasNativeBlur ? BlurTargetView : View;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Target ref={blurTarget} style={styles.root}>
        <Tabs
          tabBar={() => null}
          screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }}
        >
          <Tabs.Screen name="index" options={{ title: "Home" }} />
          <Tabs.Screen name="explore" options={{ title: "Explore" }} />
          <Tabs.Screen name="messages" options={{ title: "Messages" }} />
          <Tabs.Screen name="profile" options={{ title: "Profile" }} />
        </Tabs>
      </Target>
      {/* Rendered after the screens so the Android blur keeps updating while they scroll. */}
      <FloatingTabBar blurTarget={blurTarget} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
