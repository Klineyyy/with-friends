import { router } from "expo-router";
import { Ban, Bell, FileText, KeyRound, Lock, LogOut, SunMoon, Trash2 } from "lucide-react-native";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SettingsDivider, SettingsRow } from "@/components/SettingsRow";
import { TopBar } from "@/components/TopBar";
import { Avatar, Text } from "@/components/ui";
import { APP_VERSION, INVITE_ONLY } from "@/lib/app-info";
import { useAuth } from "@/lib/auth";
import { useBlocks, useFollowing, useMe } from "@/lib/posts";
import { space, useAppearancePref, useColors } from "@/theme";

const APPEARANCE_LABEL = { system: "System", light: "Light", dark: "Dark" } as const;

/** Board 17, opened from ≡ on your profile. */
export default function Settings() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { account, signOut } = useAuth();
  const me = useMe();
  const { blockedIds } = useBlocks();
  const appearance = useAppearancePref();

  const signedInWith = [account?.provider ? `Signed in with ${account.provider}` : "Signed in", account?.email]
    .filter(Boolean)
    .join(" · ");

  function confirmSignOut() {
    Alert.alert("Sign out?", undefined, [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", onPress: signOut },
    ]);
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <TopBar back title="Settings" />
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + space.md }]}>
        <View style={styles.account}>
          <Avatar uri={me.avatarUri} size={44} />
          <View style={styles.accountText}>
            <Text variant="username" numberOfLines={1}>
              {me.displayName || me.username}
            </Text>
            <Text variant="meta" tone="secondary" numberOfLines={1}>
              {signedInWith}
            </Text>
          </View>
        </View>
        <SettingsDivider />

        <SettingsRow
          icon={KeyRound}
          label="Password"
          value={account?.hasPassword ? undefined : "Not set"}
          chevron
          onPress={() => router.push("/password")}
        />
        <SettingsRow icon={Bell} label="Notifications" chevron onPress={() => router.push("/notifications")} />
        <SettingsRow
          icon={SunMoon}
          label="Appearance"
          value={APPEARANCE_LABEL[appearance]}
          chevron
          onPress={() => router.push("/appearance")}
        />
        <SettingsRow
          icon={Ban}
          label="Blocked users"
          value={blockedIds.length > 0 ? String(blockedIds.length) : undefined}
          chevron
          onPress={() => router.push("/blocked")}
        />
        <SettingsDivider />

        <SettingsRow icon={FileText} label="Community rules" chevron onPress={() => router.push("/rules")} />
        <SettingsRow icon={Lock} label="Terms and privacy" chevron onPress={() => router.push("/terms")} />
        <SettingsDivider />

        <SettingsRow icon={LogOut} label="Sign out" onPress={confirmSignOut} />
        <SettingsRow
          icon={Trash2}
          label="Delete account"
          description="Removes your profile, posts, and likes"
          onPress={() => router.push("/delete-account")}
        />

        {__DEV__ ? <DevTools /> : null}

        <Text variant="meta" tone="secondary" style={styles.footer}>
          With Friends {APP_VERSION}
          {INVITE_ONLY ? " · Invite-only" : ""}
        </Text>
      </ScrollView>
    </View>
  );
}

/** Dev builds only: empty states that are otherwise hard to reach. */
function DevTools() {
  const { clearAll } = useFollowing();
  return (
    <>
      <SettingsDivider />
      <Text variant="meta" tone="secondary" style={styles.devLabel}>
        Dev only
      </Text>
      <SettingsRow label="Unfollow everyone" description="See the empty Home" onPress={clearAll} />
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flexGrow: 1 },
  account: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: space.screenEdge,
    paddingVertical: space.sm,
  },
  accountText: { flex: 1 },
  devLabel: { paddingHorizontal: space.screenEdge, paddingTop: space.sm },
  footer: { marginTop: "auto", paddingTop: space.xl, paddingHorizontal: space.screenEdge },
});
