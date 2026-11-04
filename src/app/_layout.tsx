import { ClerkProvider } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import {
  Roboto_400Regular,
  Roboto_500Medium,
  Roboto_600SemiBold,
  useFonts,
} from "@expo-google-fonts/roboto";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect } from "react";

import { useAuth } from "@/lib/auth";
import { PostsProvider } from "@/lib/posts";
import { useColors, useScheme } from "@/theme";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";

if (!publishableKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY. Add it to .env (run `npx -y clerk@latest env pull`), then restart the dev server.",
  );
}

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Roboto_400Regular,
    Roboto_500Medium,
    Roboto_600SemiBold,
  });

  if (!fontsLoaded && !fontError) return null;

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <SchemeChrome />
      <PostsProvider>
        <RootStack />
      </PostsProvider>
    </ClerkProvider>
  );
}

/** Status bar icons and the root window colour follow the light/dark choice. */
function SchemeChrome() {
  const scheme = useScheme();
  const colors = useColors();
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background).catch(() => {});
  }, [colors.background]);
  return <StatusBar style={scheme === "dark" ? "light" : "dark"} />;
}

/** Each auth state unlocks exactly one part of the app. */
function RootStack() {
  const { status } = useAuth();
  const colors = useColors();

  // Keep the splash up while Clerk restores the session, so a signed-in user
  // never sees the sign-in screen flash on cold start.
  useEffect(() => {
    if (status !== "loading") SplashScreen.hideAsync();
  }, [status]);

  if (status === "loading") return null;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: "none",
      }}
    >
      <Stack.Protected guard={status === "signedOut"}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
      <Stack.Protected guard={status === "onboarding"}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={status === "signedIn"}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="post/[id]" options={{ animation: "default" }} />
        <Stack.Screen name="activity" options={{ animation: "default" }} />
        <Stack.Screen name="new-post" options={{ animation: "default" }} />
      </Stack.Protected>
    </Stack>
  );
}
