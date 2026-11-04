# Implementation Plan — With Friends

> How we build what [project-scope.md](project-scope.md) describes, in order.
> Visuals and copy come from [design.md](design.md) and the board in [`design/`](design/).
> Last updated: 2026-11-04

## Approach

**UI first, backend second.** Each area is built as real screens running on mock data, so the flow can be clicked through on a phone early. Then Clerk and Convex replace the mocks behind the same interfaces. Mock code is marked `TEMPORARY` and lives in `src/lib/`, so it's easy to find and delete.

Every phase ends with `npx tsc --noEmit` and `npx expo lint` passing.

## Code layout

```
src/
  app/              routes only (Expo Router). (tabs)/ = Home · Explore · Messages · Profile
  components/ui/    design-system primitives: Text, Button, IconButton, TextField, Checkbox, Avatar, UnreadDot, Logo, Screen
  components/       app components: TopBar, FloatingTabBar, PersonRow, EmptyState
  components/post/  PostItem, MediaView, LikeButton, UploadStatusRow
  lib/              app logic: auth state, posts store + hooks, mock data, formatting, later Convex hooks
  theme/            tokens: colours (light/dark), Roboto type scale, spacing, radius
```

- Screens use `useColors()` and `<Text variant>`. No hard-coded hex values or font sizes in screens.
- Fonts are picked by `fontFamily` per weight (`Roboto_600SemiBold`), never by `fontWeight`, since Android needs one family per weight.
- Icons: `lucide-react-native`, 24 px, `strokeWidth={1.75}`.

## Phases

### Phase 1 — Getting in (UI) ✅ done
Board screens 1–3.

- [x] Theme tokens (`src/theme`), Roboto via `@expo-google-fonts/roboto`; the splash screen stays up until fonts load
- [x] UI primitives: `Text`, `Button` (primary / secondary / disabled, large / compact), `TextField`, `Checkbox`, `Avatar`, `Logo` / `LogoMark` (SVG fish), `Screen`
- [x] `sign-in` (1), `onboarding` (3). Screen 2 (Not invited) was built, then dropped with invite-only
- [x] Route guards with `Stack.Protected` driven by an auth status
- [x] Username rules (`src/lib/username.ts`): lowercase, `[a-z0-9_.]`, 3–30 characters; live "✓ jamie is available" with a mock check of taken names
- [x] "Change photo" uses the system photo picker (`expo-image-picker`), square crop
- [x] ~~`index` is a placeholder Home with Sign out~~ replaced by the tab shell in Phase 2

Open items for this area:
- Terms and Community rules links don't go anywhere yet (those pages aren't on the board).
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
- [x] Explore, Messages, Profile tabs are placeholders. Profile has Sign out and, in dev builds only, "Unfollow everyone" to see the empty Home

Open items for this area:
- Feed videos don't play: needs `expo-video` (native, so a dev-build rebuild). Your own video posts show a dark tile instead of a poster until `expo-video-thumbnails` makes one on device (scope A13).
- Share button uses the system share sheet with `withfriends.app/p/{shortId}` until the in-app share sheet (8a, Phase 5).
- Comment icon and "View all N comments" open `post/[id]`; the comments sheet (7) replaces that in Phase 5. "Liked by…" isn't tappable yet (9, Phase 5).
- Pull to refresh only shows the spinner (nothing to refetch with mock data).

### Phase 3 — Posting (UI) ✅ mostly done
Flow 6.

- [x] ⊞ opens the **system photo picker** (photos and videos), not the 6.1 in-app grid (design.md §6.5, Play media-permission rules): `src/lib/pick-media.ts`
- [x] `new-post` (6.2): ← "New post" [Share], preview, "✓ 0:24 of 0:30. Fits the 30 second limit." (or an over-limit message that disables Share; also 50 MB), avatar + caption (2,200 max), video hint
- [x] Share → back to Home with the upload row. **TEMPORARY** fake upload: ~2.5 s, about 1 in 5 attempts fails so the retry row can be seen
- [ ] Camera capture (6.1's Camera tile) — not built; the system picker has no camera option on Android
- [ ] Image compression beyond the picker's `quality: 0.8` (e.g. resize long edge) — decide with Phase 9 uploads

### Phase 4 — Explore, profiles, follows (UI)
Screens 10a–13.

### Phase 5 — Comments, likes, share (UI)
Screens 7, 8a, 8b, 9, 20. `BottomSheet` component.

### Phase 6 — Messages and Activity (UI)
Screens 14a–16b.

### Phase 7 — Settings and safety (UI)
Screens 17–19, 21.

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
| Sample photos from picsum.photos by fixed ID | No binary assets in the repo for throwaway data; same images every launch | Phase 9 (real uploads) |
| `lucide-react-native` for icons | Line style matches the board; stroke width is adjustable | — |
| Roboto bundled on both platforms | design.md: Roboto everywhere | — |
| `Stack.Protected` route guards | Each auth state unlocks exactly one set of routes; Clerk slots in without changing routes | — |
| Board sign-in screens + Clerk `useSSO` (browser) for Google and Apple | Matches the board; works with Clerk's dev credentials. Clerk's `AuthView` was tried and removed because its layout and copy are Clerk's | Native Google sheet (`@clerk/expo-google-signin`) needs Google Cloud OAuth clients; consider before release |
| Onboarding state in Clerk `unsafeMetadata` | Lets onboarding work before Convex exists | Phase 9 |
