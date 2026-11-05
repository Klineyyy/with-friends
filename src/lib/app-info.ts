import Constants from "expo-constants";

/** App version from app.json, for the Settings footer (board 17). */
export const APP_VERSION = Constants.expoConfig?.version ?? "1.0.0";

/**
 * Whether joining needs an invitation. Off since 2026-11-04 (implementation.md,
 * Phase 8); the scope wants it back before release. Controls the "Invite-only"
 * footer on Settings and the "new invitation" line on Delete account.
 */
export const INVITE_ONLY = false;
