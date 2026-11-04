import { BlurView } from "expo-blur";
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from "expo-glass-effect";
import { router, usePathname, type Href } from "expo-router";
import { House, MessageSquare, Search, User, type LucideIcon } from "lucide-react-native";
import { useEffect, useState, type ComponentRef, type RefObject } from "react";
import {
  AccessibilityInfo,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text, UnreadDot } from "@/components/ui";
import { hasNativeBlur } from "@/lib/native";
import { useUnread } from "@/lib/posts";
import { fonts, space, useColors, useScheme } from "@/theme";

const BAR_HEIGHT = 64;
const BAR_GAP = 12;

const TABS: { href: Href; path: string; icon: LucideIcon; label: string }[] = [
  { href: "/", path: "/", icon: House, label: "Home" },
  { href: "/explore", path: "/explore", icon: Search, label: "Explore" },
  { href: "/messages", path: "/messages", icon: MessageSquare, label: "Messages" },
  { href: "/profile", path: "/profile", icon: User, label: "Profile" },
];

/** Liquid Glass needs iOS 26+; some iOS 26 betas lack the API and crash without this check. */
const liquidGlass = Platform.OS === "ios" && isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

/** Space to leave at the bottom of a scrolling tab screen so content can clear the bar. */
export function useTabBarSpace() {
  const insets = useSafeAreaInsets();
  return BAR_HEIGHT + BAR_GAP + Math.max(insets.bottom, space.sm) + space.md;
}

/** iOS "Reduce transparency": swap the glass for a solid bar. */
function useReduceTransparency() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    if (Platform.OS !== "ios") return;
    AccessibilityInfo.isReduceTransparencyEnabled().then(setReduce);
    const sub = AccessibilityInfo.addEventListener("reduceTransparencyChanged", setReduce);
    return () => sub.remove();
  }, []);
  return reduce;
}

type Props = {
  /** Android: the view to blur behind the bar (the tab screens). */
  blurTarget: RefObject<ComponentRef<typeof View> | null>;
};

/**
 * iOS-style floating glass tab bar.
 * - iOS 26+: system Liquid Glass.
 * - iOS 18 and earlier: system chrome blur material.
 * - Android 12+: real blur of the tab screens (expo-blur); older Android gets a frosted tint.
 * Active tab = fern icon + label on a soft capsule. Unread messages = fern dot.
 */
export function FloatingTabBar({ blurTarget }: Props) {
  const colors = useColors();
  const dark = useScheme() === "dark";
  const insets = useSafeAreaInsets();
  const unread = useUnread();
  const pathname = usePathname();
  const reduceTransparency = useReduceTransparency();

  const edge = dark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.7)";
  const capsule = dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)";

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: Math.max(insets.bottom, space.sm) + BAR_GAP }]}
    >
      <View
        style={[
          styles.shadow,
          { boxShadow: dark ? "0 8px 24px rgba(0,0,0,0.5)" : "0 8px 24px rgba(0,0,0,0.12)" },
        ]}
      >
        <View style={[styles.clip, !liquidGlass && { borderColor: edge, borderWidth: 1 }]}>
          {reduceTransparency ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
          ) : !hasNativeBlur ? (
            // Dev build without expo-blur: frosted tint only, until it's rebuilt.
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: dark ? "rgba(28,28,30,0.88)" : "rgba(255,255,255,0.88)" },
              ]}
            />
          ) : liquidGlass ? (
            <GlassView style={StyleSheet.absoluteFill} glassEffectStyle="regular" isInteractive />
          ) : Platform.OS === "ios" ? (
            <BlurView
              style={StyleSheet.absoluteFill}
              tint={dark ? "systemChromeMaterialDark" : "systemChromeMaterialLight"}
              intensity={100}
            />
          ) : (
            <BlurView
              style={StyleSheet.absoluteFill}
              blurTarget={blurTarget}
              blurMethod="dimezisBlurViewSdk31Plus"
              tint={dark ? "dark" : "light"}
              intensity={70}
            />
          )}

          <View role="tablist" style={styles.row}>
            {TABS.map((tab) => {
              const focused = pathname === tab.path;
              const Icon = tab.icon;
              const showDot = tab.path === "/messages" && unread.messages;
              return (
                <Pressable
                  key={tab.path}
                  role="tab"
                  accessibilityState={{ selected: focused }}
                  accessibilityLabel={showDot ? `${tab.label}, unread` : tab.label}
                  onPress={() => {
                    if (!focused) router.navigate(tab.href);
                  }}
                  style={({ pressed }) => [
                    styles.tab,
                    focused && { backgroundColor: capsule },
                    pressed && !focused && styles.pressed,
                  ]}
                >
                  <View>
                    <Icon
                      size={24}
                      strokeWidth={focused ? 2 : 1.75}
                      color={focused ? colors.fern : colors.text}
                    />
                    {showDot ? <UnreadDot style={styles.dot} /> : null}
                  </View>
                  <Text
                    variant="meta"
                    style={[
                      styles.label,
                      focused
                        ? { color: colors.fern, fontFamily: fonts.semibold }
                        : { color: colors.text, fontFamily: fonts.medium },
                    ]}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: space.screenEdge, right: space.screenEdge },
  shadow: { borderRadius: BAR_HEIGHT / 2 },
  clip: { height: BAR_HEIGHT, borderRadius: BAR_HEIGHT / 2, overflow: "hidden" },
  row: { flex: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 6 },
  tab: {
    flex: 1,
    height: BAR_HEIGHT - 12,
    borderRadius: (BAR_HEIGHT - 12) / 2,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  pressed: { opacity: 0.6 },
  label: { fontSize: 11, lineHeight: 14 },
  dot: { position: "absolute", top: -2, right: -3 },
});
