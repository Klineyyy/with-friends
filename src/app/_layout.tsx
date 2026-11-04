import {
  Roboto_400Regular,
  Roboto_500Medium,
  Roboto_600SemiBold,
  useFonts,
} from "@expo-google-fonts/roboto";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";

import { AuthProvider, useAuth } from "@/lib/auth";
import { useColors } from "@/theme";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Roboto_400Regular,
    Roboto_500Medium,
    Roboto_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <AuthProvider>
      <StatusBar style="auto" />
      <RootStack />
    </AuthProvider>
  );
}

/** Each auth state unlocks exactly one part of the app. */
function RootStack() {
  const { status } = useAuth();
  const colors = useColors();

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
      <Stack.Protected guard={status === "notInvited"}>
        <Stack.Screen name="not-invited" />
      </Stack.Protected>
      <Stack.Protected guard={status === "onboarding"}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={status === "signedIn"}>
        <Stack.Screen name="index" />
      </Stack.Protected>
    </Stack>
  );
}
