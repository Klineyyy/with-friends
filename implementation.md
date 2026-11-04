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
  app/              routes only (Expo Router)
  components/ui/    design-system primitives: Text, Button, TextField, Checkbox, Avatar, Logo, Screen
  lib/              app logic: auth state, username rules, later Convex hooks
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
- [x] `sign-in` (1), `not-invited` (2), `onboarding` (3)
- [x] Route guards with `Stack.Protected` driven by an auth status: `signedOut → notInvited → onboarding → signedIn`
- [x] Mock auth (`src/lib/auth.tsx`): **Google acts as an invited account, Apple as an uninvited one**, so both paths can be tested
- [x] Username rules (`src/lib/username.ts`): lowercase, `[a-z0-9_.]`, 3–30 characters; live "✓ jamie is available" with a mock check of taken names
- [x] "Change photo" uses the system photo picker (`expo-image-picker`), square crop
- [x] `index` is a placeholder Home with Sign out

Open items for this area:
- Terms and Community rules links don't go anywhere yet (those pages aren't on the board).
- Splash background (`#208AEF`) and app icons are still the Expo template's. Replace them with the fish mark on white.
- The logo is redrawn as SVG from the board; check it against the board at large size.

### Phase 2 — App shell and Home (UI)
Board screens 4, 5, 6.3–6.4.
- Decide design.md §6.1: custom floating tab bar (matches board) vs native tabs. **Recommended: custom tab bar** with Expo Router `Tabs`.
- Tabs: Home · Explore · Messages · Profile. Header with logo, Activity heart, new-post ⊞.
- `PostItem`, `MediaView`, `LikeButton` (the one pop animation), empty Home with "People you may know".
- Mock data module with the board's people (maya, tom, lola.ines…) and photos.

### Phase 3 — Posting (UI)
Flow 6. System photo picker (design.md §6.5), preview, 30 s check, caption, upload-row states.

### Phase 4 — Explore, profiles, follows (UI)
Screens 10a–13.

### Phase 5 — Comments, likes, share (UI)
Screens 7, 8a, 8b, 9, 20. `BottomSheet` component.

### Phase 6 — Messages and Activity (UI)
Screens 14a–16b.

### Phase 7 — Settings and safety (UI)
Screens 17–19, 21.

### Phase 8 — Auth for real (Clerk)
- Install Clerk Expo SDK; Google + Apple OAuth; invite-only mode in the Clerk dashboard.
- Replace `src/lib/auth.tsx` internals. Keep the `status` values and the guards in `_layout.tsx` as they are.
- Map Clerk's "not invited" sign-up error to `notInvited` (see design.md §6.8 on the email shown).
- Needs a development build (`eas build --profile development`); Expo Go won't work from here on.

### Phase 9 — Backend (Convex)
- Schema from project-scope §5; `ConvexProviderWithClerk`; Clerk webhook.
- Swap each mock for queries and mutations, area by area, in the same order as the UI phases.
- Username availability → query on the unique `username` index; onboarding → mutation that sets `onboarded`, `termsAcceptedAt`, avatar.
- Convex function tests (permissions, owner-only deletes, blocks, username uniqueness, deletion cascade).

### Phase 10 — Push, CI, release
- `expo-notifications` + FCM credentials in EAS; per-type preferences.
- GitHub Actions: lint, typecheck, Convex tests.
- `eas.json` profiles; production Convex + Clerk; account-deletion web page; Play internal testing.

## Decisions taken while building

| Decision | Why | Revisit when |
|---|---|---|
| Styling with `StyleSheet` + typed tokens in `src/theme`, **not NativeWind yet** | NativeWind v4/v5 compatibility with RN 0.88 is an open risk (scope §11.1). Tokens keep screens semantic, so moving to NativeWind classes later is mechanical. | Before Phase 2 if you want NativeWind. Ask for a short spike. |
| `lucide-react-native` for icons | Line style matches the board; stroke width is adjustable | — |
| Roboto bundled on both platforms | design.md: Roboto everywhere | — |
| `Stack.Protected` route guards | Each auth state unlocks exactly one set of routes; Clerk slots in without changing routes | — |
