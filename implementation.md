# Implementation Plan — With Friends

> How we build what [project-scope.md](project-scope.md) describes, in order.
> Visuals and copy come from [design.md](design.md) and the board in [`design/`](design/).
> Last updated: 2026-11-05 (Phase 9)

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
  lib/              app logic: auth state, posts hooks (incl. blocks), inbox hooks (messages, activity), safety (reports, notification settings), uploads, formatting. All read Convex
convex/             backend: schema, queries / mutations, account-deletion cascade, Clerk webhook (http.ts), tests
  theme/            tokens: colours (light/dark), Roboto type scale, spacing, radius
```

- Screens use `useColors()` and `<Text variant>`. No hard-coded hex values or font sizes in screens.
- Fonts are picked by `fontFamily` per weight (`Roboto_600SemiBold`), never by `fontWeight`, since Android needs one family per weight.
- Icons: `lucide-react-native`, 24 px, `strokeWidth={1.75}`.
- Going back (←, ✕, Cancel, after Save): `goBack()` from `src/lib/go-back.ts`, never bare `router.back()`. A screen can be first in the stack (reopened after a reload, or opened from a link), and then `router.back()` fails with "GO_BACK was not handled"; `goBack()` goes Home instead.

## Phases

### Phase 1 — Getting in (UI) ✅ done
Board screens 1–3.

- [x] Theme tokens (`src/theme`), Roboto via `@expo-google-fonts/roboto`; the splash screen stays up until fonts load
- [x] Appearance choice: System / Light / Dark (`src/theme/appearance.ts`, `useAppearancePref`, `setAppearancePref`). Saved in `expo-secure-store`, read synchronously at startup. Now an Appearance row on Settings (17) that opens a System / Light / Dark radio list (Phase 7). Use `useScheme()` / `useColors()`, never RN `useColorScheme()` directly
- [x] UI primitives: `Text`, `Button` (primary / secondary / disabled, large / compact), `TextField`, `Checkbox`, `Avatar`, `Logo` / `LogoMark` (SVG fish), `Screen`
- [x] `sign-in` (1), `onboarding` (3). Screen 2 (Not invited) was built, then dropped with invite-only
- [x] Route guards with `Stack.Protected` driven by an auth status
- [x] Username rules (`src/lib/username.ts`): `[A-Za-z0-9_.]`, 3–30 characters, kept as typed ("Kline" stays "Kline"), unique ignoring case (`users.usernameKey`, changed 2026-11-05; before that usernames were lowercased); live "✓ jamie is available" with a mock check of taken names
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
- [x] Store and hooks in `src/lib/posts.tsx` (`useFeed`, `usePost`, `usePostActions`, `useFollowing`, `useUploads`, `useUsers`, `useMe`…). ~~In-memory~~ Convex since Phase 9, same hook names
- [x] ~~Explore, Messages, Profile tabs are placeholders~~ Explore and Profile built in Phase 4, Messages in Phase 6

Open items for this area:
- Feed videos don't play yet (`expo-video` is installed for posters; playback UI not built). Your own video posts get a poster made on device (Phase 3).
- Share button uses the system share sheet with `withfriends.app/p/{shortId}` until the in-app share sheet (8a, Phase 5).
- Comment icon and "View all N comments" open `post/[id]` (the comment icon also focuses the comment field, via `?comment=1`); the comments sheet (7) replaces that in Phase 5. "Liked by…" isn't tappable yet (9, Phase 5).
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
- [x] `edit-profile` (not on the board): name and bio (150 max, counter), Save in the top bar. **Change photo** (2026-11-07): tap the avatar → square crop from the library → uploaded and saved at once (`users.setAvatar`, old upload deleted). **TEMPORARY**: saved in memory
- [x] ~~`settings` (**TEMPORARY**, until board 17 in Phase 7)~~ Replaced by board 17 in Phase 7
- [x] Sample data: bios, a follow graph between members (`mockFollowGraph`; maya has 10 followers / 9 following like the board), 16 older square photos so grids fill. Theo, Sam and Nina renamed to the board's Theo Reyes, Sam Ocampo, Nina Lim (so "reyes" finds 3 people, as in 10b)
- [x] Hooks in `src/lib/posts.tsx`: `useExplorePosts`, `useUserPosts`, `useFollowLists`, `useSearchPeople`, `useUpdateProfile`, `userExists`. Your follows update every count and list at once

Open items for this area:
- ~~Block / Report in the ⋯ menu show "isn't ready yet" until Phase 7.~~ Working since Phase 7.
- ~~Message opens the Messages tab, not a thread, until Phase 6.~~ Opens the thread since Phase 6.
- Profiles, follower lists and Settings open on the root stack, so the tab bar is hidden there (same as `post/[id]`). Board 12 shows the tab bar on maya's profile; keeping it needs a stack inside each tab. See decisions.
- Edit profile can't change photo or username yet (the unique `username` index exists since Phase 9; the UI doesn't). Name and bio save to Convex.
- Tapping a grid tile opens the single-post screen, not a scrollable feed of that profile's posts.

### Phase 5 — Comments, likes, share (UI)
Screens 7, 8a, 8b, 9, 20. `BottomSheet` component (built in Phase 7 for the report sheet; reuse it). Give comments a ⋯ / Report in the comments sheet, replacing the long-press on `post/[id]`.

- [x] **Commenting on `post/[id]`** (2026-11-05, ahead of the sheet): board 7's bottom bar (your 32 avatar, "Add a comment…" (500 max, scope A10, grows to ~5 lines), **Post** greyed until there's text). New comments go at the end and the list scrolls to them. Your own comments show a "Delete" text action (asks first). The comment icon on the post screen focuses the field. `addComment` / `deleteComment` in `usePostActions()`; **TEMPORARY** in memory, no Activity entry or push yet
- [ ] Comments sheet (7) over the feed: move the bar and rows from `post/[id]` into the sheet

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
- ~~Activity rows for a deleted post~~ Since Phase 9, deleting a post deletes its notifications.
- Sending a post to someone from the share sheet (8a / 8b) comes in Phase 5; the store already accepts `{ kind: "post", postId }`.

### Phase 7 — Settings and safety (UI) ✅ done
Screens 17–19, 21.

- [x] `settings` (17): ← "Settings". Account row (44 avatar, name, "Signed in with Google · email", provider from Clerk `externalAccounts`). Notifications ›, **Appearance** (value, ›), Blocked users (count when > 0) ›, Community rules ›, Terms and privacy ›, Sign out (asks first), Delete account. Footer "With Friends 1.0.0", plus "· Invite-only" when `INVITE_ONLY` in `src/lib/app-info.ts` is on (off now). The dev-only "Unfollow everyone" row was removed 2026-11-07 (your call), with `social.unfollowAll`
- [x] `notifications` (18): intro line + Likes / Comments / Follows / Messages, each with a one-line description and a `Switch` (all on by default). **TEMPORARY**: in memory; push and stored preferences are Phase 10
- [x] `appearance` (not on the board): System / Light / Dark as radio rows. Same saved setting as before
- [x] Report sheet (19): `BottomSheet` + `ReportSheet`, rendered once by `SafetyProvider`; open with `useReport()({ type, id, userId })`. "Report post" / "Report comment" / "Report account", "…won't know it was you", six reasons, Send report (disabled until a reason is picked). Then "Thanks for telling us" with **Block {username}** and Done. **TEMPORARY**: reports kept in memory. Opens from: post ⋯ (others' posts: Share · Report), profile ⋯, thread ⋯, long-press on someone else's comment in `post/[id]`
- [x] Blocking: `useBlocks()` in `src/lib/posts.tsx`, confirm dialogs in `useBlockActions()` (`src/lib/blocks.ts`). Block from profile ⋯ or thread ⋯, or after reporting. Blocking also unfollows. A blocked person is hidden from Home, Explore, search, "People you may know", follower lists, comments (and counts), Messages, New message, Activity and the unread dots. Their profile shows "You blocked maya" + Unblock; their thread shows "You blocked maya. They can't message you." + Unblock instead of the composer
- [x] `blocked` (not on the board): person rows with Unblock (asks first); empty state "No one blocked"
- [x] `delete-account` (21): title, explanation, "I understand this can't be undone" checkbox, Delete account (disabled until ticked, "Deleting…") + Cancel. **Really deletes the Clerk user** (`user.delete()`), which signs you out. Needs "Allow users to delete their accounts" on in Clerk (on by default); otherwise the error shows in an alert
- [x] `rules` and `terms` (not on the board): plain reading pages (`DocPage`). Open from Settings and from the onboarding checkbox text; guarded by "onboarding or signed in". Don't leave any route outside a `Stack.Protected`: when signed out, Expo Router redirects to the first unguarded route alphabetically, so an unguarded `rules` opened instead of `sign-in` (fixed 2026-11-05). Guards alone weren't enough either: right after Google sign-in the router could fall back to `rules` with nothing under it, and ← went to `/` (guarded) and bounced back. `RootStack` now redirects: onboarding → `/onboarding` unless a reading page sits on top of something; signed in on a reading page with nothing under it → `/`
- [x] Primitives: `Switch` (black track + white knob / outline + grey knob, no slide animation), `Radio` (black ring + dot). `SettingsRow`, `RadioRow`, `SettingsDivider`

Open items for this area:
- **Delete account copy follows the scope, not the board** (design.md §6 conflict 3): "Messages you sent stay… shown as from 'Deleted user'". If you'd rather delete messages for everyone, change the copy in `delete-account.tsx`, the Settings row and `terms.tsx`, and the Phase 9 cascade.
- ~~Account deletion only removes the Clerk user~~ Since Phase 9 it runs the Convex cascade first. The web page to request deletion is Phase 10.
- **Terms and privacy is a plain-language draft**, written to match the scope. Get real terms and a privacy policy before release (Play needs a privacy policy URL that matches the Data safety form). Community rules are a draft too.
- ~~Blocks, reports and notification settings reset on reload~~ Stored in Convex since Phase 9; blocking removes follows both ways.
- A post by someone you blocked still opens from a direct link or an old Activity row; scope only asks to hide them from lists.
- "Something else" has no free-text box (`reports` has only `reason`).
- The sheet appears without sliding and can't be dragged down; tap outside or Back closes it.

### Phase 8 — Auth (Clerk) ✅ code done, not yet tested on a device
Done out of order (before Phases 2–7) at your request.

- [x] `npx clerk init --app app_3LdKwR3ypW6XLfH4zMCKQgC2Fnr` (app "WithFriends"): `@clerk/expo` 4.15, keys in `.env` (git-ignored)
- [x] **Our board screens 1 and 2**, on Clerk's browser SSO (`useSSO`, `src/lib/social-sign-in.ts`). Tried Clerk's built-in `AuthView` first and dropped it: it couldn't match the board
- [x] Dev instance redirect allowlist: `withfriends://sso-callback`. `src/app/+native-intent.tsx` stops Expo Router from opening that callback as a screen ("Unmatched route")
- [x] ~~Invite-only removed for now (2026-11-04)~~ Replaced by **Waitlist** (2026-11-06, your call): new people can't create an account until you approve them. `src/lib/social-sign-in.ts` returns `noAccount` when Google / Apple finishes but Clerk gives no session (what the dev instance does for a non-approved person: no error, no account) or throws `sign_up_restricted_waitlist` / `sign_up_mode_restricted`; `sign-in` then opens `src/app/no-account.tsx` ("No account yet": request access first; Request access / Try a different account). Closing the browser is still a quiet cancel (`authSessionResult.type !== "success"`). New people can also go to `src/app/waitlist.tsx` (Request access: email → `useWaitlist().waitlist.join` → "You're on the list"). **Screen 1 redesigned** (2026-11-06, your call): one card "Have an account?" with username / email + password (`src/lib/password-sign-in.ts`, moved from the removed `sign-in-password.tsx`) and Google / Apple, then a "New here? Request access" link. The interim `continue.tsx` and `sign-in-password.tsx` screens were removed. **Approve with `npm run approve -- <email>`** (`scripts/approve.mjs`, `npm run approve -- list` shows who's waiting): it creates a Clerk invitation with the `waitlist_invitation` email. **The approval email has no button** (2026-11-06, your call): `scripts/emails/waitlist-invitation.html`, installed with `npm run approve -- set-email`, tells people to open the app and continue with Google / Apple using that email; the pending invitation is what lets the email sign up. Clerk requires `{{action_url}}` in the template, so it's in an HTML comment. The invitation still redirects to `withfriends://accept-invite` (→ `/sign-in` via `+native-intent.tsx`) as a fallback. **Not yet confirmed:** that Clerk lets Google / Apple sign up an email with a pending invitation without the link being clicked. Dashboard approvals send the same email once `set-email` has run, but their (hidden) link goes to Clerk's web page. Existing accounts are unaffected. Needs the instance's access mode set to **Waitlist** (Dashboard → Configure → Restrictions / Access mode), on dev and production
- [x] `src/lib/auth.tsx` derives `loading → signedOut → onboarding → signedIn` from Clerk; splash stays up while Clerk loads
- [x] Onboarding saves `onboarded`, `username`, `termsAcceptedAt` to Clerk `unsafeMetadata` (**TEMPORARY** until Convex) and a new photo via `user.setProfileImage`. Default avatar = Google/Apple photo
- [x] Dev instance: Google and Apple enabled
- [x] `expo-dev-client`, `expo-secure-store` (token cache), `expo-auth-session` + `expo-crypto` (SSO) installed
- [x] **Username / email + password sign-in** (2026-11-05, your request). Sign-up stays Google / Apple only; a password is added afterwards in Settings → **Password** (`src/app/password.tsx`, `user.updatePassword`). Sign in in the card on screen 1 (`src/lib/password-sign-in.ts`, `signIn.password({ identifier })`; was `sign-in-password.tsx` until 2026-11-06). Clerk's Device Trust asks for an emailed code the first time a password is used on a new device (`needs_client_trust` → `signIn.mfa.sendEmailCode`). Setting a password can need **reverification**: handled with `useReverification` + an emailed code (`session.startVerification`). No forgot-password flow: the screen tells you to use Google / Apple, then change it in Settings
- [x] **Username in Clerk**: Convex owns it; `src/lib/auth.tsx` mirrors it onto the Clerk user (`user.update({ username })`) so username sign-in works. Clerk compares usernames without case, like Convex
- [x] Dev instance config (via `clerk config patch`): password on (optional, min 8, breach check on), email usable for sign-in with `email_code` verification, username usable for sign-in (3–30, extended characters so `.` is allowed, numeric allowed: matches `src/lib/username.ts`). **Apply the same to the production instance**

Still to do before it runs:
- [x] Android package ID `com.klinegarcia.withfriends` in `app.json`; `eas.json` with `development` / `preview` / `production` profiles
- [x] EAS project linked (`@fskline/withfriends`)
- Rebuild the dev build (`npx eas-cli build --profile development --platform android`): `expo-crypto` is new native code
- Clerk Dashboard → **Native applications**: register the Android app (namespace `android_app`, package, SHA-256 of the EAS signing key). Needed for native Google sign-in later; browser SSO works without it
- Google's consent screen says "Clerk" because the dev instance uses Clerk's shared Google credentials. Before inviting friends, add your own Google Cloud OAuth credentials in Clerk so it says "With Friends"
- Test the waitlist on a device: join with a new Google account, approve it in the Dashboard, then confirm Continue with Google now creates the account. Apple "Hide My Email" gives a relay address that won't match the waitlisted email (scope risk 2)
- Invite yourself in Clerk Dashboard → Users → Invitations, sign in, finish onboarding, restart the app and check the session survives.
- Apple on Android goes through a browser; needs the Apple Services ID set up in Clerk for production (dev uses Clerk's shared credentials).

### Phase 9 — Backend (Convex) ✅ code done (2026-11-05), not yet tested on a device
All sample data is gone (`mock-data.ts` deleted); every hook in `src/lib/` keeps its name and reads Convex.

- [x] Schema (`convex/schema.ts`) from scope §5, plus `users.clerkImageUrl` (Google / Apple photo, the default avatar), `users.deletingAt`, `conversations.lastMessageSenderId` / `lastMessageKind`, `messages.width` / `height`, `reports.targetUserId`
- [x] Auth: `convex/auth.config.ts` (Clerk issuer from `CLERK_JWT_ISSUER_DOMAIN`), `ConvexProviderWithClerk` in `_layout.tsx`. Users are found by `clerkId` = token `subject`. `src/lib/auth.tsx` now derives `onboarding` / `signedIn` from `users.onboarded` (off Clerk `unsafeMetadata`), and calls `users.ensure` on first sign-in to create the row. Clerk\'s Convex token carries **no name or picture**, so the app passes the Clerk user\'s name and photo URL to `ensure` (on first sign-in and once per session to refresh); Convex only accepts photos from `img.clerk.com`, and fills in an empty name after onboarding. Before 2026-11-07 accounts lost the Google photo after onboarding. The splash stays up until you, the member directory and your follows have loaded
- [x] Onboarding: live check on the unique `username` index (`users.usernameAvailable`, 300 ms debounce); `users.completeOnboarding` sets username, `onboarded`, `termsAcceptedAt`, and an avatar uploaded to Convex storage (no longer Clerk `setProfileImage`)
- [x] Functions: `users` (me, directory, profile, members, suggested, search, updateProfile, notification prefs, deleteMe), `posts` (upload URL, feed, explore, byUser, get, create, updateCaption, remove, likers), `social` (likes, comments, follows, blocks, myGraph), `messages` (conversations, thread, send, markRead), `activity` (list, markAllRead, unread dots), `reports.create`. Every write checks permissions server-side: owner-only deletes, members only, block rules, length limits (A10), upload type and size (photo ≤ 15 MB, video ≤ 50 MB, ≤ 30 s)
- [x] Uploads: `src/lib/upload.ts` POSTs the file to a Convex upload URL with progress (XHR), then `posts.create`. Videos send the poster too. The Home upload row shows real progress and real failures
- [x] Optimistic updates (scope §6): likes, follows, block / unblock, comments, text and post messages, notification switches
- [x] Account deletion: `users.deleteMe` hides the account at once and schedules `account.deleteUserData`, which works through posts (+ files), likes, comments, follows, notifications, blocks, push tokens, then the user row, 50 rows per transaction. Messages stay ("Deleted user"). Then the app deletes the Clerk user
- [x] Clerk webhook `convex/http.ts` at `/clerk-webhook`: `user.created` / `user.updated` (name, photo), `user.deleted` (same cascade). Svix signature checked with Web Crypto
- [x] Tests: `convex/app.test.ts` (`npm test`, 9 tests): signed-out access, username uniqueness and format, onboarding gate, owner-only deletes, like counts + Activity, feed, blocks both ways, messages + read receipts, deletion cascade

Still to do:
- **Clerk Dashboard → Integrations → Convex: turn it on.** Without it Clerk issues no `aud: "convex"` token, Convex never authenticates, and the app stays on the splash after sign-in
- **Webhook**: Clerk Dashboard → Webhooks → add `https://incredible-sandpiper-787.convex.site/clerk-webhook` with `user.created`, `user.updated`, `user.deleted`; then `npx convex env set CLERK_WEBHOOK_SECRET whsec_…`. The app works without it (`users.ensure`, `users.deleteMe`), but a deletion from the Clerk dashboard won't cascade
- Existing test accounts saw onboarding in Clerk `unsafeMetadata`; they go through onboarding once more (Convex has no row for them)
- Restart the dev server so it picks up `.env.local`. No dev-build rebuild needed (Convex is JS only)
- With no sample data, the app is empty until people sign up and post. A second account (another Google account) is the easiest way to try follows, likes and messages
- Photo messages aren't optimistic (they upload first). Uploads don't survive an app restart. Feed and Explore are capped (50 / 90 posts, no paging yet)
- Stored `commentCount` includes comments from people you blocked; the post screen lists only the visible ones
- Share links are `withfriends://post/{id}` until the https site exists (A12); the old `withfriends.app/p/{shortId}` placeholder is gone

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
| ~~Sample photos from picsum.photos~~ Sample data removed in Phase 9 | — | — |
| Light/dark override via RN `Appearance.setColorScheme`, saved in `expo-secure-store` | Native views (glass tab bar, alerts, keyboard) switch too, not only our colours. Secure store is already in the dev build, so no rebuild; a theme setting isn't secret, but adding a key-value store just for this isn't worth a native rebuild | If another non-secret setting needs storing: move these to `expo-sqlite/kv-store` |
| `lucide-react-native` for icons | Line style matches the board; stroke width is adjustable | — |
| Roboto bundled on both platforms | design.md: Roboto everywhere | — |
| `Stack.Protected` route guards | Each auth state unlocks exactly one set of routes; Clerk slots in without changing routes | — |
| Board sign-in screens + Clerk `useSSO` (browser) for Google and Apple | Matches the board; works with Clerk's dev credentials. Clerk's `AuthView` was tried and removed because its layout and copy are Clerk's | Native Google sheet (`@clerk/expo-google-signin`) needs Google Cloud OAuth clients; consider before release |
| Profiles and follower lists on the root stack, no tab bar | Same as `post/[id]`; one stack, simple back behaviour. Stacks inside each tab would keep the bar (board 12) but double every pushed route | If losing the tab bar on profiles feels wrong on the phone |
| ~~Onboarding state in Clerk `unsafeMetadata`~~ Moved to Convex `users.onboarded` in Phase 9 | Users could edit `unsafeMetadata` | — |
| Member directory (`users.directory`) and your follow / block IDs (`social.myGraph`) loaded once in `PostsProvider` | Keeps `useUsers()`, `useFollowing()`, `useBlocks()` synchronous, so screens barely changed; ~10 users (scope §1) | Past a few hundred members: look people up per screen |
| Users found by `clerkId` (token `subject`), not `tokenIdentifier` | Matches the scope and the webhook payload; one Clerk issuer per deployment | If a second auth provider is added |
| Clerk webhook verified by hand (Web Crypto HMAC), not the `svix` package | No extra dependency; runs in the default Convex runtime | If Clerk changes its signing scheme |
| Someone who blocked you looks like a deleted account; someone you blocked stays visible on their profile and thread with Unblock | "Hides both ways" (scope §8) while still letting you undo a block | — |
