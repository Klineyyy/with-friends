import { ClerkProvider, useAuth as useClerkAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import {
  Roboto_400Regular,
  Roboto_500Medium,
  Roboto_600SemiBold,
  useFonts,
} from "@expo-google-fonts/roboto";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { router, Stack, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect } from "react";

import { useAuth } from "@/lib/auth";
import { convex } from "@/lib/convex";
import { PostsProvider, usePostsReady } from "@/lib/posts";
import { SafetyProvider } from "@/lib/safety";
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
      <ConvexProviderWithClerk client={convex} useAuth={useClerkAuth}>
        <SchemeChrome />
        <PostsProvider>
          <SafetyProvider>
            <RootStack />
          </SafetyProvider>
        </PostsProvider>
      </ConvexProviderWithClerk>
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
  const { status: authStatus } = useAuth();
  const dataReady = usePostsReady();
  const colors = useColors();
  // Signed in: also wait for the member directory and your follows, so names never flash "Deleted user".
  const status = authStatus === "signedIn" && !dataReady ? "loading" : authStatus;

  // Keep the splash up while Clerk restores the session and Convex loads you,
  // so a signed-in user never sees the sign-in screen flash on cold start.
  useEffect(() => {
    if (status !== "loading") SplashScreen.hideAsync();
  }, [status]);

  // When a guard flips (e.g. right after Google sign-in) the router falls back
  // to some allowed screen, which can be Community rules with nothing under it.
  // Back from there goes to "/", which is guarded, so you bounce straight back.
  // Put people where they belong; a reading page is only kept if it was opened
  // on top of something.
  const top = useSegments()[0] as string | undefined;
  useEffect(() => {
    if (status === "loading") return;
    const onReadingPage = top === "rules" || top === "terms";
    if (status === "onboarding" && top !== "onboarding" && !(onReadingPage && router.canGoBack())) {
      router.replace("/onboarding");
    } else if (status === "signedIn" && onReadingPage && !router.canGoBack()) {
      router.replace("/");
    }
  }, [status, top]);

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
        <Stack.Screen name="sign-in-password" options={{ animation: "default" }} />
      </Stack.Protected>
      <Stack.Protected guard={status === "onboarding"}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={status === "signedIn"}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="post/[id]" options={{ animation: "default" }} />
        <Stack.Screen name="activity" options={{ animation: "default" }} />
        <Stack.Screen name="new-post" options={{ animation: "default" }} />
        <Stack.Screen name="user/[id]" options={{ animation: "default" }} />
        <Stack.Screen name="follows/[id]" options={{ animation: "default" }} />
        <Stack.Screen name="edit-profile" options={{ animation: "default" }} />
        <Stack.Screen name="settings" options={{ animation: "default" }} />
        <Stack.Screen name="thread/[id]" options={{ animation: "default" }} />
        <Stack.Screen name="new-message" options={{ animation: "default" }} />
        <Stack.Screen name="notifications" options={{ animation: "default" }} />
        <Stack.Screen name="appearance" options={{ animation: "default" }} />
        <Stack.Screen name="blocked" options={{ animation: "default" }} />
        <Stack.Screen name="delete-account" options={{ animation: "default" }} />
        <Stack.Screen name="password" options={{ animation: "default" }} />
      </Stack.Protected>
      {/*
        Reading pages: open from onboarding and Settings. Never leave a screen
        outside a guard: when signed out, Expo Router sends you to the first
        unguarded screen alphabetically, and "rules" would beat "sign-in".
      */}
      <Stack.Protected guard={status === "onboarding" || status === "signedIn"}>
        <Stack.Screen name="rules" options={{ animation: "default" }} />
        <Stack.Screen name="terms" options={{ animation: "default" }} />
      </Stack.Protected>
    </Stack>
  );
}
