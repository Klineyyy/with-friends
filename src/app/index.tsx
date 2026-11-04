import { StyleSheet, View } from "react-native";

import { Button, Logo, Screen, Text } from "@/components/ui";
import { useAuth } from "@/lib/auth";

/** TEMPORARY placeholder for Home (board screen 4) until the app shell is built. */
export default function Home() {
  const { account, signOut } = useAuth();

  return (
    <Screen footer={<Button label="Sign out" variant="secondary" onPress={signOut} />}>
      <View style={styles.header}>
        <Logo />
      </View>
      <View style={styles.center}>
        <Text variant="username">Signed in as @{account?.username}</Text>
        <Text tone="secondary">Home feed comes next.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { height: 56, justifyContent: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 4 },
});
