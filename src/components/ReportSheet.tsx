import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { BottomSheet } from "@/components/BottomSheet";
import { RadioRow } from "@/components/SettingsRow";
import { Button, Text } from "@/components/ui";
import { useBlockActions } from "@/lib/blocks";
import { useUsers } from "@/lib/posts";
import { REPORT_REASONS, type ReportReason, type ReportTarget } from "@/lib/report";
import { space, useColors } from "@/theme";

type Props = {
  /** `null` = closed. */
  target: ReportTarget | null;
  onClose: () => void;
  onSend: (reason: ReportReason) => void;
};

const TITLES: Record<ReportTarget["type"], string> = {
  post: "Report post",
  comment: "Report comment",
  user: "Report account",
};

/**
 * Board 19: pick a reason, Send report. Then a thank-you with the option to
 * block, since someone reporting often wants them gone too. Rendered once by
 * `SafetyProvider`; open it with `useReport()`.
 */
export function ReportSheet({ target, onClose, onSend }: Props) {
  const colors = useColors();
  const userById = useUsers();
  const { isBlocked, confirmBlock } = useBlockActions();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [sent, setSent] = useState(false);

  const user = target ? userById(target.userId) : null;

  return (
    <BottomSheet visible={!!target} onClose={onClose}>
      {target && user ? (
        sent ? (
          <View style={styles.body}>
            <View style={styles.header}>
              <Text variant="title">Thanks for telling us</Text>
              <Text tone="secondary">
                We&apos;ll take a look. {user.username} won&apos;t know it was you.
                {isBlocked(user.id) ? "" : ` You can also block them, so they can't see your posts or message you.`}
              </Text>
            </View>
            <View style={styles.buttons}>
              {isBlocked(user.id) ? null : (
                <Button
                  label={`Block ${user.username}`}
                  variant="secondary"
                  onPress={() => {
                    onClose();
                    confirmBlock(user);
                  }}
                />
              )}
              <Button label="Done" onPress={onClose} />
            </View>
          </View>
        ) : (
          <>
            <View style={[styles.header, styles.body, { borderBottomColor: colors.divider }, styles.headerRule]}>
              <Text variant="title">{TITLES[target.type]}</Text>
              <Text tone="secondary">
                {target.type === "user"
                  ? `Why are you reporting ${user.username}? They won't know it was you.`
                  : `Why are you reporting this? ${user.username} won't know it was you.`}
              </Text>
            </View>
            <ScrollView role="radiogroup" accessibilityLabel="Reason" style={styles.reasons}>
              {REPORT_REASONS.map((r) => (
                <RadioRow
                  key={r.value}
                  label={r.label}
                  selected={reason === r.value}
                  onPress={() => setReason(r.value)}
                />
              ))}
            </ScrollView>
            <View style={styles.body}>
              <Button
                label="Send report"
                disabled={!reason}
                onPress={() => {
                  if (!reason) return;
                  onSend(reason);
                  setSent(true);
                }}
              />
            </View>
          </>
        )
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: space.screenEdge },
  header: { gap: 4, paddingTop: space.sm, paddingBottom: space.md },
  headerRule: { borderBottomWidth: StyleSheet.hairlineWidth * 2 },
  reasons: { flexGrow: 0, marginVertical: space.sm, marginBottom: space.lg },
  buttons: { gap: 12, marginTop: space.sm },
});
