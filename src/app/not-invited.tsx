import { Mail } from "lucide-react-native";
import { StyleSheet, View } from "react-native";

import { Button, Screen, Text } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useColors } from "@/theme";

/** Board screen 2 · Not invited */
export default function NotInvited() {
  const { account, signOut } = useAuth();
  const colors = useColors();

  return (
    <Screen footer={<Button label="Use another account" variant="secondary" onPress={signOut} />}>
      <View style={styles.content}>
        <Mail size={26} strokeWidth={1.75} color={colors.text} />
        <Text variant="title" style={styles.title} accessibilityRole="header">
          Not invited yet
        </Text>
        <Text>You need an invitation to join. Ask the person who shared the app with you.</Text>
        {account ? (
          <Text variant="meta" tone="secondary" style={styles.signedInAs}>
            Signed in as {account.email}
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 72 },
  title: { marginTop: 24, marginBottom: 12 },
  signedInAs: { marginTop: 20 },
});
