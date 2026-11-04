# Design — With Friends

## Source of truth

**The design lives in [`design/`](design/).** Before building or changing any screen:

1. Open the files in `design/` and find the screen by its number (e.g. "4 · Home feed").
2. Match layout, spacing, copy, and states exactly. Copy on the board is final wording.
3. If the board and this file disagree, **the board wins** — then update this file.
4. If the board and [project-scope.md](project-scope.md) disagree, don't guess: check the conflicts list in §6 and ask.
5. If a new file appears in `design/`, re-read it and update this file.

| File | Contents |
|---|---|
| `design/with-friends-design-system-and-screens-v2.jpg` | Design system + 33 screens (light), 3 dark-mode screens |

The board is a flat image (3720×7832). Zoom in by cropping regions; small text is unreadable at full-board scale.

## 1. Design system

### Colour

| Token | Light | Dark | Use |
|---|---|---|---|
| `background` | `#FFFFFF` | `#000000` | Screens |
| `text` | `#000000` | `#FFFFFF` | Main text, primary buttons (fill) |
| `text-secondary` | `#6B6F76` | `#A1A1AA` | Timestamps, counts, helper text, display names under usernames |
| `divider` | `#E4E4E7` | `#27272A` | Row separators, outlines, tab bar border |
| `fern` | `#5A9E1A` | `#A3E635` | **Only three things:** liked heart, unread dots, active tab |
| `surface` (inferred) | `#F2F2F3` | — | Search fields, comment/message inputs, incoming message bubbles. Sample exact value from the board |

"Photos bring the colour. The interface stays black, white, and grey."

### Type — Roboto

| Role | Size / weight |
|---|---|
| Screen title | 22 / Semibold |
| Username | 15 / Semibold |
| Body and captions | 15 / Regular |
| Times and counts | 13 / Regular |

Hierarchy comes from weight, not size. Sentence case everywhere, no all-caps labels.
Roboto is the Android system font; on iOS it must be bundled (`expo-font`) to match.

### Spacing and layout

| | |
|---|---|
| Screen edge | 16 px |
| Base grid | 8 px |
| Top bar | 56 px |
| Floating tab bar | 64 px tall, inset 16 px from screen edges, 12 px above gesture bar |
| Touch targets | ≥ 44 px |
| Button corners | 8 px |
| Photos and grid tiles | square corners |

### Icons
24 px line icons, 1.75 stroke. Set on the board: Home, Explore, Messages, Profile, Like, Comment, Share, Send, New post, More, Back, Close, Camera, Photo, Retry, Settings, Notifications, Report. Plus Block (circle-slash), Sign out, Delete (trash), Document, Lock, Envelope, Edit (pencil), Check.
Pick one icon library whose outline style matches (e.g. Lucide-style); confirm stroke width is adjustable.

### Buttons
- **Primary:** black fill, white text (Continue, Follow, Send, Share, Post, Delete account, Send report). Dark mode: inverted.
- **Secondary:** thin outline (Edit profile, Following, Message, Cancel, Use another account, Back to home).
- **Disabled / done:** grey fill, grey text (Sent).
- **Text button:** "Post" in the comment bar, "Next" in composer, "Delete" on own comment, underlined links (Change photo, Terms, More people…).
- Two sizes: full-width large (48 px tall) and compact pill (~32 px) in rows.

### Controls
Switch (on = black track, white knob; off = outline with grey knob), checkbox (black fill + white check), radio (black ring + dot), search field (grey fill, search icon, clear ×), text input (1 px black outline, 8 px corners).

### Avatars and rows
Avatar sizes: 24, 32, 44, 52, 80. Person row = 44 avatar + username (semibold) over display name (secondary) + trailing compact button.

### Logo
A small banded fish mark, always black-and-white, left of the name "With Friends". ~30 px wide in the app header. Needs exporting as an SVG/PNG asset (not yet in the repo).

### Tab bar
Floating pill, **order: Home · Explore · Messages · Profile**. Active tab = fern icon + label. Unread messages = fern dot on the Messages icon. Content scrolls underneath it.

**Changed from the board (2026-11-04, your call): iOS-style glass instead of flat.** The board's bar is flat (thin outline, no shadow, no blur). Built version: Liquid Glass on iOS 26+, system chrome blur on older iOS, real blur of the screen behind it on Android 12+ (frosted tint on older Android). Soft drop shadow, light inner edge, and a soft capsule behind the active tab. With iOS "Reduce transparency" on, the bar is solid.

### Photo shapes
Feed media edge to edge at its own aspect ratio, clamped **4:5 (tallest) to 1.91:1 (widest)**. No rounded corners, no cards, no shadows. Explore and profile grids: 3 columns, 1 px gaps, square crops; videos show a small ▶ in the tile corner. Feed videos show a duration badge ("0:24", top right) and a centred play button.

### Motion
**The only animation:** the like heart pops once in fern (scale 1 → 1.2 → 1, ~200 ms). No entrance animations, no page flourishes. Respect reduced-motion.

### Wording
| Action | Done state |
|---|---|
| Share | Shared |
| Send | Sent |
| Follow | Following |
| Error | Upload failed. Tap to retry. |
| Empty | Likes, comments, and follows show up here. |

## 2. Screen inventory

Numbers match the board.

### Getting in
| # | Screen | Key details |
|---|---|---|
| 1 | Sign in | Centred logo + "With Friends" + "Photos and videos, just for your circle." Buttons at bottom: Continue with Google (outline), Continue with Apple (black). Footnote: "With Friends is invite-only. Use the account your invite was sent to." *(footnote hidden while invite-only is off)* |
| 2 | Not invited *(dropped for now with invite-only; see implementation.md)* | Envelope icon, "Not invited yet", "You need an invitation to join. Ask the person who shared the app with you.", "Signed in as {email}", bottom: Use another account |
| 3 | Onboarding | "Welcome" / "Pick a username. It shows on everything you share." Profile photo (80) + Change photo link. Username input with live "✓ jamie is available". Checkbox "I agree to the Terms and Community rules". Bottom: Continue. No display-name field (taken from Google/Apple). |

### Home and posts
| # | Screen | Key details |
|---|---|---|
| 4 | Home feed | Header: logo + "With Friends", heart (Activity, fern dot when unread), ⊞ new post. Post: 32 avatar, username, time, ⋯; media; heart / comment / share icons; "Liked by **maya** and **3 others**"; "**tom** caption"; "View all 4 comments" (secondary). |
| 5 | Home, empty | "Follow people to see their posts here" / "Everyone in your circle is on Explore." Go to Explore button. "People you may know" list with Follow buttons. |
| 7 | Comments | Bottom sheet over dimmed feed, grab handle, "Comments" title. Rows: avatar, username, time, text; own comment shows "Delete" text action. Bottom bar: own avatar, "Add a comment…" field, Post. |
| 8a | Share sheet | In-app bottom sheet: post thumbnail + caption + link `withfriends.app/p/8kq2`. "Send in With Friends" row of 4 avatars + "More people…". "Share with apps": Copy, Nearby, Messages, Email. |
| 8b | Send to… | ✕ close, "Send to…", post preview row, search field, member list with Send → Sent (grey). |
| 9 | Liked by | ← back, "Liked by", "4 likes on tom's post", rows with Following / Follow; own row shows "You". |
| 20 | Deleted post | ← "Post", image icon, "This post was deleted." / "The person who shared it took it down.", Back to home (outline). |

### Create a post (flow 6)
| Step | Key details |
|---|---|
| 6.1 Pick | ✕ "New post" Next. Large preview (duration badge). "Recents ⌄" album picker. 3-col grid, first tile = Camera, selection circles, video duration on tile. |
| 6.2 Preview | ← "New post" [Share]. Preview; "✓ 0:24 of 0:30. Fits the 30 second limit."; avatar + caption field; hint "Videos can be up to 30 seconds. Longer ones need trimming first." |
| 6.3 Uploading | Home feed with a top row: thumbnail, "Sharing…", progress bar. |
| 6.4 Failed | Same row: "Upload failed. Tap to retry." + retry icon. |

### Explore and profiles
| # | Screen | Key details |
|---|---|---|
| 10a | Explore | Title "Explore", search field "Search people", 3-col edge-to-edge grid. |
| 10b | Explore, search | Query + clear ×, "3 people", rows with Following / Follow. |
| 11a | Your profile | Header: username, ⊞ new post, ≡ settings. 80 avatar, display name, @username, bio, "**18** posts **9** followers **10** following", Edit profile (full-width outline), grid. |
| 11b | Your profile, empty | Camera icon, "Share your first photo" / "Your photos and videos show up here for your circle.", New post button. |
| 12 | Someone else's profile | ← username ⋯ (menu: Block maya, Report maya). Following + Message buttons side by side. |
| 13 | Followers and following | ← username, two tabs "10 followers" / "9 following" with underline indicator, rows with Following / Follow. |

### Messages and activity
| # | Screen | Key details |
|---|---|---|
| 14a | Messages | Title + ✎ new message. Rows: 52 avatar, display name, preview · time ("Sent a photo", "Shared a post", "You: …"); fern unread dot on the right. |
| 14b | Messages, empty | Chat icon, "Start a conversation" / "Messages are one-to-one and only seen by the two of you." "Members" list with Message buttons. |
| 15 | Message thread | ← avatar, display name, @username, ⋯. Centred timestamp "Today 8:12 AM". Incoming: grey bubble, left. Outgoing: black bubble, right. Photo messages (rounded). Shared post card (avatar + username, media, caption, outlined). "Seen" under last outgoing. Bottom: photo icon, "Message…" field, send icon. |
| 16a | Activity | ← "Activity". Sections "Today" / "This week". Rows: avatar, "**maya** liked your post." + time, post thumbnail on right; follows show Follow / Following button; fern dot left of unread rows. |
| 16b | Activity, empty | Heart icon, "Nothing yet" / "Likes, comments, and follows show up here." |

### Settings and safety
| # | Screen | Key details |
|---|---|---|
| 17 | Settings | ← "Settings". Account row: avatar, name, "Signed in with Google · email". Notifications ›, Blocked users (count) ›, Community rules ›, Terms and privacy ›, Sign out, Delete account ("Removes your profile, posts, and messages"). Footer "With Friends 1.0 · Invite-only". |
| 18 | Notification settings | "Choose what your phone tells you about. Everything still shows in Activity." Switches: Likes, Comments, Follows, Messages, each with a one-line description. |
| 19 | Report sheet | Bottom sheet: "Report post" / "Why are you reporting this? tom won't know it was you." Radios: It's spam · Bullying or harassment · Nudity or sexual content · Violence or dangerous acts · False information · Something else. Send report. |
| 21 | Delete account | "Delete your account?" / explanation / "To come back later, you'll need a new invitation." Checkbox "I understand this can't be undone". Delete account (black) + Cancel. |

### Dark mode
Shown for 4 (Home feed), 11a (Your profile), 14a (Messages). Pure black background, white text, `#A3E635` fern, dark tab bar pill. Every other screen follows the same token swap.

**Appearance choice (2026-11-04, your call):** System (default) · Light · Dark, as a segmented control. It sits on the Profile placeholder until Settings (17) is built in Phase 7, where it becomes an "Appearance" row. Not on the board.

### Not on the board (design needed or derive from the system)
Edit profile · Blocked users list · Community rules / Terms pages · New-message picker (✎) · Post detail (from Activity or a link) · Message thread ⋯ menu · Report comment / user sheets (reuse 19) · Camera capture · Video playback controls · Offline / generic error states · Push permission prompt.

## 3. Mapping to NativeWind

Define the tokens once in the Tailwind theme with light/dark variants (CSS variables), so screens only use semantic classes:

```
bg-background  text-text  text-text-secondary  border-divider  text-fern  bg-surface
text-title (22/600)  text-username (15/600)  text-body (15/400)  text-meta (13/400)
px-4 (16 screen edge)  rounded-lg (8 buttons)  rounded-none (media)
```

Exact syntax depends on the NativeWind version chosen (v4 `tailwind.config.js` vs v5 CSS `@theme`) — see project-scope §11.

## 4. Component list (derived from the board)

`AppHeader` · `FloatingTabBar` · `Avatar` (24/32/44/52/80) · `Button` (primary / secondary / disabled / text; large / compact) · `PersonRow` · `PostItem` (header, media, actions, likes line, caption, comments link) · `MediaView` (image / video with duration badge and play) · `LikeButton` (pop animation) · `PhotoGrid` (3-col, 1 px gaps, video marker) · `SearchField` · `TextField` · `Switch` · `Checkbox` · `Radio` · `BottomSheet` (comments, share, report) · `EmptyState` (icon, title, body, optional button) · `UploadStatusRow` · `MessageBubble` (in / out / photo / post card) · `ConversationRow` · `ActivityRow` · `UnreadDot` · `SettingsRow` · `SegmentedTabs` (followers/following).

## 5. Changes this board makes to project-scope.md

- Accent is **fern green** (`#5A9E1A` / `#A3E635`), not the amber "Porchlight" draft. Scope §7 is superseded by this file.
- Font is **Roboto** on both platforms, not the platform system font.
- Create-post entry points: ⊞ in the Home header and ⊞ in the own-profile header.
- Upload progress and failure show as a row at the top of the Home feed.
- Share is an **in-app sheet** (send to members + share with apps), not straight to the system share sheet.
- Display name comes from the Google/Apple account; onboarding only asks for username and photo.

## 6. Conflicts to resolve before building

1. **Native tabs vs floating tab bar.** The board shows a floating, outlined pill bar inset from the edges. `expo-router/native-tabs` uses the platform's own bar (Material bottom navigation on Android) and can't be shaped like this. Options: (a) build a custom JS tab bar with Expo Router `Tabs` to match the board; (b) keep native tabs and accept the platform look, applying only colours. **Decided: (a) custom floating tab bar** (2026-11-04), styled as iOS-inspired glass (see §1 Tab bar). Native glass tabs were tried and reverted.
2. **Tab order.** Board: Home · Explore · Messages · Profile. Original brief: Home · Messages · Explore · Profile. Board order assumed unless you say otherwise.
3. **Account deletion and messages.** Board (17, 21) says deletion removes "messages for everyone". Scope says their messages stay, shown as "Deleted user". Pick one.
4. **Activity grouping.** Board 16a shows "tom and 2 others liked your post." Scope says one item per event, no grouping. Possible reading: Activity groups likes, push does not.
5. **In-app photo grid (6.1).** A custom gallery grid needs broad photo/video permissions (`READ_MEDIA_IMAGES` / `READ_MEDIA_VIDEO`). Google Play restricts these for apps that only need occasional access and expects the system photo picker instead. Options: use the system picker (look differs from 6.1), or justify broad access in the Play declaration. **Built with the system picker** in Phase 3 (recommended option).
6. **"Share with apps" row (8a).** Copy is easy; Nearby, Messages, Email can't be targeted individually from React Native — one "More…" button opening the system share sheet is the realistic version.
7. **Share link domain.** Board uses `withfriends.app/p/8kq2` (short IDs). Needs a domain and a short-ID field on posts.
8. **"Signed in as" on Not invited (2).** Moot for now: screen 2 is dropped while invite-only is off. With Clerk invite-only, an uninvited sign-up is rejected before a session exists; the email may only be available from the failed OAuth attempt. Copy may need to change to "Tried {email}".
