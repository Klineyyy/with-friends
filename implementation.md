# Implementation Plan — With Friends

> How we build what [project-scope.md](project-scope.md) describes, in order.
> Visuals and copy come from [design.md](design.md) and the board in [`design/`](design/).
> Last updated: 2026-11-05

## Approach

**UI first, backend second.** Each area is built as real screens running on mock data, so the flow can be clicked through on a phone early. Then Clerk and Convex replace the mocks behind the same interfaces. Mock code is marked `TEMPORARY` and lives in `src/lib/`, so it's easy to find and delete.

Every phase ends with `npx tsc --noEmit` and `npx expo lint` passing.

## Code layout

```
src/
  app/              routes only (Expo Router). (tabs)/ = Home · Explore · Messages · Profile
  components/ui/    design-system primitives: Text, Button, IconButton, TextField, SearchField, Checkbox, Switch, Radio, Avatar, UnreadDot, Logo, Screen, SegmentedControl
  components/       app components: TopBar, FloatingTabBar, PersonRow, EmptyState, PhotoGrid, ProfileHeader, UnderlineTabs, MenuPopover, ConversationRow, ActivityRow, BottomSheet, ReportSheet, SettingsRow (+ RadioRow, SettingsDivider), DocPage
  components/post/  PostItem, MediaView, LikeButton, UploadStatusRow
  components/messages/  MessageBubble (text / photo / shared-post card)
  lib/              app logic: auth state, posts store + hooks (incl. blocks), inbox store + hooks (messages, activity), safety (reports, notification settings), mock data, formatting, later Convex hooks
  theme/            tokens: colours (light/dark), Roboto type scale, spacing, radius
```

- Screens use `useColors()` and `<Text variant>`. No hard-coded hex values or font sizes in screens.
- Fonts are picked by `fontFamily` per weight (`Roboto_600SemiBold`), never by `fontWeight`, since Android needs one family per weight.
- Icons: `lucide-react-native`, 24 px, `strokeWidth={1.75}`.

## Phases

### Phase 1 — Getting in (UI) ✅ done
Board screens 1–3.

- [x] Theme tokens (`src/theme`), Roboto via `@expo-google-fonts/roboto`; the splash screen stays up until fonts load
- [x] Appearance choice: System / Light / Dark (`src/theme/appearance.ts`, `useAppearancePref`, `setAppearancePref`). Saved in `expo-secure-store`, read synchronously at startup. Now an Appearance row on Settings (17) that opens a System / Light / Dark radio list (Phase 7). Use `useScheme()` / `useColors()`, never RN `useColorScheme()` directly
- [x] UI primitives: `Text`, `Button` (primary / secondary / disabled, large / compact), `TextField`, `Checkbox`, `Avatar`, `Logo` / `LogoMark` (SVG fish), `Screen`
- [x] `sign-in` (1), `onboarding` (3). Screen 2 (Not invited) was built, then dropped with invite-only
- [x] Route guards with `Stack.Protected` driven by an auth status
- [x] Username rules (`src/lib/username.ts`): lowercase, `[a-z0-9_.]`, 3–30 characters; live "✓ jamie is available" with a mock check of taken names
- [x] "Change photo" uses the system photo picker (`expo-image-picker`), square crop
- [x] ~~`index` is a placeholder Home with Sign out~~ replaced by the tab shell in Phase 2

Open items for this area:
- ~~Terms and Community rules links don't go anywhere yet~~ They open the `terms` and `rules` pages since Phase 7.
- Splash background (`#208AEF`) and app icons are still the Expo template's. Replace them with the fish mark on white.
- The logo is redrawn as SVG from the board; check it against the board at large size.

### Phase 2 — App shell and Home (UI) ✅ done
Board screens 4, 5, 6.3–6.4.

- [x] Custom floating tab bar (design.md §6.1 option a) on Expo Router `Tabs` from `expo-router/js-tabs`: `src/components/FloatingTabBar.tsx`. Tabs: Home · Explore · Messages · Profile; fern active tab; fern dot on Messages. Content scrolls under it; tab screens pad the bottom with `useTabBarSpace()`. (Native glass tabs were tried on 2026-11-04 and reverted at your request.)
- [x] **Glass tab bar** (your call, replaces the board's flat style): `expo-glass-effect` Liquid Glass on iOS 26+, `expo-blur` system material on older iOS, and on Android `expo-blur` blurring a `BlurTargetView` that wraps the tab screens (`dimezisBlurViewSdk31Plus`: Android 12+, frosted tint below). The bar is rendered **outside** the `Tabs` navigator (`tabBar={() => null}`), because the blur can't sit inside its own target; it tracks the active tab with `usePathname()` and switches with `router.navigate`. Side effect: tapping the current tab again does nothing (no scroll-to-top yet). **Needs a dev-build rebuild** (`expo-blur` is native)
- [x] Home header: logo, Activity heart (fern dot when unread) → `activity` (board 16b empty state for now), ⊞ new post
- [x] `PostItem` (32 avatar, username, time, ⋯; media; like / comment / share; "Liked by **maya** and **3 others**"; caption; "View all 4 comments"), `MediaView` (clamped 4:5–1.91:1, video poster + duration badge + play), `LikeButton` (the one pop animation, skipped with reduced motion). Double-tap the media to like
- [x] Empty Home (5): "Follow people to see their posts here", Go to Explore, "People you may know" with working Follow buttons
- [x] Upload row at the top of Home: "Sharing…" with progress (6.3), "Upload failed. Tap to retry." (6.4)
- [x] `post/[id]`: one post with its comments (not on the board, built from the feed item). Missing post → board 20 "This post was deleted."
- [x] ⋯ on your own post → Delete post (with confirm). On others' posts → Share (Report comes in Phase 7)
- [x] **Sample data** (`src/lib/mock-data.ts`, **TEMPORARY**): the board's people (maya, tom, lola.ines, bencruz, ana, jules, priya, theo, sam.o, nina), 9 posts incl. 2 videos, likes and comments. Photos are fixed picsum.photos IDs (needs network). You follow 7 of them; theo, sam.o and nina are "people you may know"
- [x] Store and hooks in `src/lib/posts.tsx` (`useFeed`, `usePost`, `usePostActions`, `useFollowing`, `useUploads`, `useUsers`, `useMe`…). In-memory: resets on reload. Phase 9 keeps the hook names and swaps the inside for Convex
- [x] ~~Explore, Messages, Profile tabs are placeholders~~ Explore and Profile built in Phase 4, Messages in Phase 6

Open items for this area:
- Feed videos don't play yet (`expo-video` is installed for posters; playback UI not built). Your own video posts get a poster made on device (Phase 3).
- Share button uses the system share sheet with `withfriends.app/p/{shortId}` until the in-app share sheet (8a, Phase 5).
- Comment icon and "View all N comments" open `post/[id]`; the comments sheet (7) replaces that in Phase 5. "Liked by…" isn't tappable yet (9, Phase 5).
- Pull to refresh only shows the spinner (nothing to refetch with mock data).

### Phase 3 — Posting (UI) ✅ done (needs a dev-build rebuild for compression and posters)
Flow 6.

- [x] ⊞ opens a "New post" chooser: **Take photo · Record video · Choose from library** (action sheet on iOS, alert on Android): `src/lib/pick-media.ts`
- [x] Library = the **system photo picker** (photos and videos), not the 6.1 in-app grid (design.md §6.5, Play media-permission rules)
- [x] Camera = the **system camera** via `launchCameraAsync` (stands in for 6.1's Camera tile). Asks for camera permission; if it was refused for good, offers Open Settings. Video recording asks the camera app to stop at 30 s (`videoMaxDuration`); the composer still checks the length, since not every Android camera app honours it
- [x] `new-post` (6.2): ← "New post" [Share], preview, "✓ 0:24 of 0:30. Fits the 30 second limit." (or an over-limit message that disables Share; also 50 MB), avatar + caption (2,200 max), video hint
- [x] Share → back to Home with the upload row. **TEMPORARY** fake upload: ~2.5 s, about 1 in 5 attempts fails so the retry row can be seen
- [x] **On-device prep** in the composer (`src/lib/prepare-media.ts`), while you write the caption; a small spinner shows and Share waits for it:
  - Photos: long edge capped at 2048 px, re-encoded as JPEG 0.8 (`expo-image-manipulator`)
  - Videos: poster frame at 0.5 s, max 1080 px, saved as JPEG (`expo-video` `generateThumbnailsAsync`, scope A13). Shown in the composer, the upload row and the feed
  - Both modules are imported only when the binary has them (`src/lib/native.ts`). On an older dev build, photos upload as picked and videos show the dark tile; nothing crashes
- [x] Camera, microphone and photos permission text set in `app.json` (`expo-image-picker` plugin)

Open items for this area:
- **Rebuild the dev build**: `expo-video` and `expo-image-manipulator` are new native code, and the permission text is native config.
- Android can kill the app while the camera is open on low-memory phones; the photo is then lost. `ImagePicker.getPendingResultAsync()` can recover it. Not handled yet.
- Feed video playback (`expo-video` is now installed, so this is just UI work).

### Phase 4 — Explore, profiles, follows (UI) ✅ done
Screens 10a–13.

- [x] `explore` (10a): "Explore", "Search people" field, 3-col grid of every post, newest first. Typing switches to 10b: "3 people" + person rows with Follow / Following. Matches username or display name, leaves you out
- [x] `PhotoGrid`: 3 columns, 1 px gaps, square crops, edge to edge, small ▶ on video tiles; tap opens `post/[id]`. Used by Explore and both profiles
- [x] `profile` tab (11a / 11b): username, ⊞ new post, ≡ → `settings`. `ProfileHeader`: 80 avatar, display name, @username, bio, "**18** posts **9** followers **10** following" (followers / following open 13), Edit profile. No posts → divider + "Share your first photo" + New post
- [x] `user/[id]` (12): ← username ⋯. ⋯ opens a dropdown (`MenuPopover`): Block maya / Report maya. Follow / Following + Message side by side. No posts → "No posts yet". Your own ID redirects to the Profile tab; an unknown ID shows "This account isn't here anymore."
- [x] `follows/[id]` (13): ← username, "10 followers" / "9 following" tabs with underline (`UnderlineTabs`), person rows. Your own row shows "You" instead of a button (as on board 9)
- [x] Profiles open from: post author (avatar + username), every person row (Home empty state, search, follower lists). `openProfile()` in `src/lib/open-profile.ts` sends you to the Profile tab for yourself
- [x] `edit-profile` (not on the board): name and bio (150 max, counter), Save in the top bar. **TEMPORARY**: saved in memory
- [x] ~~`settings` (**TEMPORARY**, until board 17 in Phase 7)~~ Replaced by board 17 in Phase 7
- [x] Sample data: bios, a follow graph between members (`mockFollowGraph`; maya has 10 followers / 9 following like the board), 16 older square photos so grids fill. Theo, Sam and Nina renamed to the board's Theo Reyes, Sam Ocampo, Nina Lim (so "reyes" finds 3 people, as in 10b)
- [x] Hooks in `src/lib/posts.tsx`: `useExplorePosts`, `useUserPosts`, `useFollowLists`, `useSearchPeople`, `useUpdateProfile`, `userExists`. Your follows update every count and list at once

Open items for this area:
- ~~Block / Report in the ⋯ menu show "isn't ready yet" until Phase 7.~~ Working since Phase 7.
- ~~Message opens the Messages tab, not a thread, until Phase 6.~~ Opens the thread since Phase 6.
- Profiles, follower lists and Settings open on the root stack, so the tab bar is hidden there (same as `post/[id]`). Board 12 shows the tab bar on maya's profile; keeping it needs a stack inside each tab. See decisions.
- Edit profile can't change photo or username yet (username needs the Convex unique index, Phase 9). Edits reset on reload.
- Tapping a grid tile opens the single-post screen, not a scrollable feed of that profile's posts.

### Phase 5 — Comments, likes, share (UI)
Screens 7, 8a, 8b, 9, 20. `BottomSheet` component (built in Phase 7 for the report sheet; reuse it). Give comments a ⋯ / Report in the comments sheet, replacing the long-press on `post/[id]`.

### Phase 6 — Messages and Activity (UI) ✅ done
Screens 14a–16b.

- [x] `messages` tab (14a): "Messages" + ✎ (pencil) → New message. `ConversationRow`: 52 avatar, display name, "preview · time" ("Sent a photo", "Shared a post", "You: …"; times "2m", "3h", "Mon", "Oct 28"), fern dot when unread. Most recent first
- [x] Empty (14b): chat icon, "Start a conversation" / "Messages are one-to-one and only seen by the two of you.", "Members" with Message buttons (`PersonRow` now takes an `action` and `onPress`)
- [x] `thread/[id]` (15), ID = the other person's user ID: ← 32 avatar, display name, @username (taps to profile), ⋯ → View profile / Block / Report (working since Phase 7). Inverted list; centred time ("Today 8:12 AM") above the first message after an hour's gap. `MessageBubble`: incoming grey left, outgoing black right, photos 200 wide rounded, shared-post card (24 avatar + username, media, 2-line caption, opens the post; "This post was deleted." if gone). "Seen" under your last message when it's the newest and they've read it. Composer: photo button (system picker, compressed like posts), "Message…" (1,000 max, grows to ~5 lines), send (grey until there's text)
- [x] `new-message` (not on the board, built like 8b): ✕ "New message", "Search people", members; tap → thread (replaces the picker, so Back goes to Messages)
- [x] `activity` (16a): ← "Activity", sections Today / This week / Earlier. `ActivityRow`: fern dot left of unread rows, 44 avatar, "**maya** liked your post. 12m", 44 thumbnail (opens the post) or Follow / Following (follows open the profile). Likes on the same post in the same section are grouped: "tom and 2 others liked your post." (design.md §6 conflict 4). Opening Activity clears the Home heart dot; rows keep their dots until you leave
- [x] Store and hooks in `src/lib/inbox.tsx` (`useConversations`, `useThread`, `useMembers`, `useActivity`, `useUnread`). The Home heart and Messages tab dots are now derived from it (the fixed `mockUnread` flags are gone). In-memory: resets on reload
- [x] Sample data: conversations matching 14a / 15 (maya and lola unread), activity matching 16a, and **3 posts of your own** (Activity needs something to point at). So your profile now shows 11a; delete the three posts to see 11b
- [x] Dev-only "Clear messages" on the temporary Settings screen, to see 14b

Open items for this area:
- **TEMPORARY** "Seen" is faked 2.5 s after you send. Nobody replies.
- Tapping a photo message does nothing (no full-screen viewer on the board).
- The thread's bottom safe-area padding stays while the keyboard is open, leaving a small gap above the keyboard on phones with a gesture bar. Same as the composer.
- Activity rows for a post that's since been deleted show no thumbnail and open the person. Phase 9 should delete those notifications with the post.
- Sending a post to someone from the share sheet (8a / 8b) comes in Phase 5; the store already accepts `{ kind: "post", postId }`.

### Phase 7 — Settings and safety (UI) ✅ done
Screens 17–19, 21.

- [x] `settings` (17): ← "Settings". Account row (44 avatar, name, "Signed in with Google · email", provider from Clerk `externalAccounts`). Notifications ›, **Appearance** (value, ›), Blocked users (count when > 0) ›, Community rules ›, Terms and privacy ›, Sign out (asks first), Delete account. Footer "With Friends 1.0.0", plus "· Invite-only" when `INVITE_ONLY` in `src/lib/app-info.ts` is on (off now). Dev builds add "Unfollow everyone" / "Clear messages" rows
- [x] `notifications` (18): intro line + Likes / Comments / Follows / Messages, each with a one-line description and a `Switch` (all on by default). **TEMPORARY**: in memory; push and stored preferences are Phase 10
- [x] `appearance` (not on the board): System / Light / Dark as radio rows. Same saved setting as before
- [x] Report sheet (19): `BottomSheet` + `ReportSheet`, rendered once by `SafetyProvider`; open with `useReport()({ type, id, userId })`. "Report post" / "Report comment" / "Report account", "…won't know it was you", six reasons, Send report (disabled until a reason is picked). Then "Thanks for telling us" with **Block {username}** and Done. **TEMPORARY**: reports kept in memory. Opens from: post ⋯ (others' posts: Share · Report), profile ⋯, thread ⋯, long-press on someone else's comment in `post/[id]`
- [x] Blocking: `useBlocks()` in `src/lib/posts.tsx`, confirm dialogs in `useBlockActions()` (`src/lib/blocks.ts`). Block from profile ⋯ or thread ⋯, or after reporting. Blocking also unfollows. A blocked person is hidden from Home, Explore, search, "People you may know", follower lists, comments (and counts), Messages, New message, Activity and the unread dots. Their profile shows "You blocked maya" + Unblock; their thread shows "You blocked maya. They can't message you." + Unblock instead of the composer
- [x] `blocked` (not on the board): person rows with Unblock (asks first); empty state "No one blocked"
- [x] `delete-account` (21): title, explanation, "I understand this can't be undone" checkbox, Delete account (disabled until ticked, "Deleting…") + Cancel. **Really deletes the Clerk user** (`user.delete()`), which signs you out. Needs "Allow users to delete their accounts" on in Clerk (on by default); otherwise the error shows in an alert
- [x] `rules` and `terms` (not on the board): plain reading pages (`DocPage`). Open from Settings and from the onboarding checkbox text; routes sit outside the auth guards so onboarding can reach them
- [x] Primitives: `Switch` (black track + white knob / outline + grey knob, no slide animation), `Radio` (black ring + dot). `SettingsRow`, `RadioRow`, `SettingsDivider`

Open items for this area:
- **Delete account copy follows the scope, not the board** (design.md §6 conflict 3): "Messages you sent stay… shown as from 'Deleted user'". If you'd rather delete messages for everyone, change the copy in `delete-account.tsx`, the Settings row and `terms.tsx`, and the Phase 9 cascade.
- Account deletion only removes the Clerk user until Phase 9 (Convex cascade from the `user.deleted` webhook). The web page to request deletion is Phase 10.
- **Terms and privacy is a plain-language draft**, written to match the scope. Get real terms and a privacy policy before release (Play needs a privacy policy URL that matches the Data safety form). Community rules are a draft too.
- Blocks, reports and notification settings reset on reload (in memory). Blocking someone doesn't remove their follow of you in the sample data (the follow graph is fixed); Phase 9's mutation removes both.
- A post by someone you blocked still opens from a direct link or an old Activity row; scope only asks to hide them from lists.
- "Something else" has no free-text box (`reports` has only `reason`).
- The sheet appears without sliding and can't be dragged down; tap outside or Back closes it.

### Phase 8 — Auth (Clerk) ✅ code done, not yet tested on a device
Done out of order (before Phases 2–7) at your request.

- [x] `npx clerk init --app app_3LdKwR3ypW6XLfH4zMCKQgC2Fnr` (app "WithFriends"): `@clerk/expo` 4.15, keys in `.env` (git-ignored)
- [x] **Our board screens 1 and 2**, on Clerk's browser SSO (`useSSO`, `src/lib/social-sign-in.ts`). Tried Clerk's built-in `AuthView` first and dropped it: it couldn't match the board
- [x] Dev instance redirect allowlist: `withfriends://sso-callback`. `src/app/+native-intent.tsx` stops Expo Router from opening that callback as a screen ("Unmatched route")
- [x] **Invite-only removed for now** (2026-11-04, your call): sign-up mode **public**, Not invited screen and invite footnote removed. Anyone with the app can sign up with Google or Apple
- [x] `src/lib/auth.tsx` derives `loading → signedOut → onboarding → signedIn` from Clerk; splash stays up while Clerk loads
- [x] Onboarding saves `onboarded`, `username`, `termsAcceptedAt` to Clerk `unsafeMetadata` (**TEMPORARY** until Convex) and a new photo via `user.setProfileImage`. Default avatar = Google/Apple photo
- [x] Dev instance: Google and Apple enabled
- [x] `expo-dev-client`, `expo-secure-store` (token cache), `expo-auth-session` + `expo-crypto` (SSO) installed

Still to do before it runs:
- [x] Android package ID `com.klinegarcia.withfriends` in `app.json`; `eas.json` with `development` / `preview` / `production` profiles
- [x] EAS project linked (`@fskline/withfriends`)
- Rebuild the dev build (`npx eas-cli build --profile development --platform android`): `expo-crypto` is new native code
- Clerk Dashboard → **Native applications**: register the Android app (namespace `android_app`, package, SHA-256 of the EAS signing key). Needed for native Google sign-in later; browser SSO works without it
- Google's consent screen says "Clerk" because the dev instance uses Clerk's shared Google credentials. Before inviting friends, add your own Google Cloud OAuth credentials in Clerk so it says "With Friends"
- Before release, decide how to restrict who can join (scope requires invite-only): Clerk restricted mode or an email allowlist, plus bring back the Not invited screen (in git history, commit 2e03f1b)
- Invite yourself in Clerk Dashboard → Users → Invitations, sign in, finish onboarding, restart the app and check the session survives.
- Apple on Android goes through a browser; needs the Apple Services ID set up in Clerk for production (dev uses Clerk's shared credentials).

### Phase 9 — Backend (Convex)
- Schema from project-scope §5; `ConvexProviderWithClerk`; Clerk webhook.
- Swap each mock for queries and mutations, area by area, in the same order as the UI phases.
- Username availability → query on the unique `username` index (still mocked in `src/lib/username.ts`); onboarding → mutation that sets `onboarded`, `termsAcceptedAt`, avatar. Move `onboarded` off Clerk `unsafeMetadata` (users can edit it) into Convex, or into Clerk `publicMetadata` set by the webhook.
- Convex function tests (permissions, owner-only deletes, blocks, username uniqueness, deletion cascade).

### Phase 10 — Push, CI, release
- `expo-notifications` + FCM credentials in EAS; per-type preferences.
- GitHub Actions: lint, typecheck, Convex tests.
- `eas.json` profiles; production Convex + Clerk; account-deletion web page; Play internal testing.

## Decisions taken while building

| Decision | Why | Revisit when |
|---|---|---|
| Styling with `StyleSheet` + typed tokens in `src/theme`, **not NativeWind yet** | NativeWind v4/v5 compatibility with RN 0.88 is an open risk (scope §11.1). Tokens keep screens semantic, so moving to NativeWind classes later is mechanical. | Before Phase 2 if you want NativeWind. Ask for a short spike. |
| Custom floating tab bar (`expo-router/js-tabs`), not native tabs | Matches the board's floating pill; native tabs can't be shaped like it (design.md §6.1). Native glass tabs were tried and reverted (2026-11-04) | If the JS tab bar feels slow on low-end Android |
| Glass look on the custom bar (Liquid Glass / blur), not the board's flat outline | Your call (2026-11-04) | If Android blur costs frames while scrolling the feed: drop to `blurMethod="none"` (tint only) |
| System photo picker for new posts, not the 6.1 in-app grid | No broad photo/video permission, which Google Play restricts (design.md §6.5) | — |
| System camera app for capture, not an in-app camera (`expo-camera`) | No custom camera UI to build or keep working across Android devices; the board has no camera design | If you want an in-app camera screen |
| Poster frames from `expo-video`, not `expo-video-thumbnails` | `expo-video-thumbnails` is deprecated; `expo-video` is needed for playback anyway | — |
| Photos capped at 2048 px long edge, JPEG 0.8 | Sharp on phone screens, a few hundred KB, small next to Convex storage limits (scope §11.4) | If photos look soft, or storage gets tight |
| Sample photos from picsum.photos by fixed ID | No binary assets in the repo for throwaway data; same images every launch | Phase 9 (real uploads) |
| Light/dark override via RN `Appearance.setColorScheme`, saved in `expo-secure-store` | Native views (glass tab bar, alerts, keyboard) switch too, not only our colours. Secure store is already in the dev build, so no rebuild; a theme setting isn't secret, but adding a key-value store just for this isn't worth a native rebuild | If another non-secret setting needs storing: move these to `expo-sqlite/kv-store` |
| `lucide-react-native` for icons | Line style matches the board; stroke width is adjustable | — |
| Roboto bundled on both platforms | design.md: Roboto everywhere | — |
| `Stack.Protected` route guards | Each auth state unlocks exactly one set of routes; Clerk slots in without changing routes | — |
| Board sign-in screens + Clerk `useSSO` (browser) for Google and Apple | Matches the board; works with Clerk's dev credentials. Clerk's `AuthView` was tried and removed because its layout and copy are Clerk's | Native Google sheet (`@clerk/expo-google-signin`) needs Google Cloud OAuth clients; consider before release |
| Profiles and follower lists on the root stack, no tab bar | Same as `post/[id]`; one stack, simple back behaviour. Stacks inside each tab would keep the bar (board 12) but double every pushed route | If losing the tab bar on profiles feels wrong on the phone |
| Onboarding state in Clerk `unsafeMetadata` | Lets onboarding work before Convex exists | Phase 9 |
