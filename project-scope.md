# Project Scope — With Friends

> Status: **Interview complete — spec ready for review.** Not yet an implementation plan.
> Last updated: 2026-11-04

## 1. Product

**With Friends** is a small, invite-only photo and video sharing app for a circle of friends and family. Members post photos and short videos, follow each other, like and comment, and message one-to-one. The UI is mobile-first, clean and minimal: the media is the focus and the interface stays out of the way.

| | |
|---|---|
| Purpose | Learning project |
| Users | ~10 invited friends and family |
| Platforms | Android first (Google Play internal testing). Code stays cross-platform; iOS tested later. No web. |
| Monetization | None |
| Budget | Free tiers of Convex, Clerk, and EAS |

### The one thing it must do well
Posting a photo or video and seeing what your friends posted — fast, reliable, and good-looking.

## 2. Fixed stack

| Concern | Choice | Verified notes |
|---|---|---|
| App framework | Expo SDK 58 (`expo ~58.0.23`), React Native 0.88.1, React 19.3, TypeScript | Scaffolded, `expo-doctor` 20/20 |
| Routing | Expo Router `~58.0.30`, routes in `src/app/` | |
| Tabs | Native tabs via `expo-router/native-tabs` (stable import in SDK 58; `unstable-native-tabs` was SDK 54–57) | Template already uses it |
| Styling | NativeWind | v5 is `@preview`, needs RN ≥ 0.81; v4.2.x is stable. Version decided at scaffold — see risks |
| Auth | Clerk — Google and Apple sign-in, **Invite-only access mode** | |
| Backend, DB, files, realtime | Convex | |
| Push | `expo-notifications` + Expo Push Service, sent from Convex actions | |
| Builds & updates | EAS Build (`development`, `preview`, `production`), EAS Update | |
| Crash reporting | EAS Observe (JS errors and native crashes) + Convex dashboard logs | |
| CI | Required (see §9) | |

App config: name `With Friends`, slug `with-friends`, deep-link scheme `withfriends://`.

## 3. Scope

### In scope for v1
- **Access:** invite-only. Admin (you) sends invitations from the Clerk dashboard; only invited people can create accounts.
- **Sign in** with Google or Apple.
- **Onboarding** on first sign-in: choose username, optionally change avatar, accept terms.
- **Profile:** display name, username, bio (≤150 chars), avatar. View and edit own; view anyone's. Follower/following lists. Usernames can be changed, so links use IDs, never usernames.
- **Posts:** one photo or one video (≤30 s, ≤50 MB) plus optional caption. Images compressed on device; videos played as uploaded. Caption editable later; media not. Delete own posts.
- **Social graph:** all accounts public inside the app; follow/unfollow is instant.
- **Home feed:** posts from people you follow, newest first.
- **Explore:** grid of recent posts from everyone + user search.
- **Likes:** like/unlike; see who liked a post.
- **Comments:** flat list; delete own comments.
- **Share:** native share sheet with a link to the post; send a post to someone by DM.
- **Messages:** one-to-one; text, photos, and shared-post cards; "Seen" read receipts; anyone can message anyone.
- **Activity:** in-app list opened from a heart icon in the Home header.
- **Push:** likes, comments, follows, messages; each type can be turned on/off. One notification per event. No message push while that conversation is open.
- **Safety:** block (hides both ways, blocks DMs) and report post/comment/user.
- **Account deletion** in-app (posts, comments, likes, follows removed; their messages stay, shown as "Deleted user"), plus a web page to request deletion (Google Play requirement).

### Out of scope for v1
Web app · private accounts / follow requests · multi-photo carousels · server-side video transcoding · ranked feed · group chats · typing indicators · reposts · comment replies and likes · notification grouping · automated content filtering · Sentry / analytics · monetization · App Store release.

## 4. Core user journeys

1. **First launch (not invited):** sign-in screen → Google/Apple → Clerk rejects sign-up → "You need an invitation to join. Ask the person who shared the app with you."
2. **First launch (invited):** sign-in → onboarding (username, avatar, accept terms) → Home empty state: "Follow people to see their posts here", with a button to Explore and a short list of members to follow.
3. **Returning user:** app opens straight to the Home feed.
4. **Post:** create button (Home header) → pick from library or capture → preview, length check (≤30 s), caption → **Share** → appears at the top of followers' feeds. While uploading, the post shows a progress state; on failure, "Upload failed. Tap to retry."
5. **Interact:** double-tap or tap heart to like; comment icon → comment sheet; share icon → share sheet or "Send to…" picker.
6. **Message:** Messages tab → conversation list (unread dot, last message) → thread → text/photo; "Seen" under your last message once read.
7. **Activity:** heart icon → likes, comments, follows on your stuff → tap to open the post or profile.
8. **Profile:** Profile tab → avatar, name, bio, counts, grid of posts → Edit profile / Settings (notifications, blocked users, delete account, sign out).

## 5. Data model (Convex)

All IDs are Convex document IDs. Counts are stored on the parent record and updated in the same mutation.

| Table | Key fields | Constraints / indexes |
|---|---|---|
| `users` | `clerkId`, `username`, `displayName`, `bio`, `avatarStorageId?`, `onboarded`, `termsAcceptedAt?`, `notificationPrefs {likes, comments, follows, messages}`, `followerCount`, `followingCount`, `postCount` | unique `clerkId`, unique `username` (lowercase, `[a-z0-9_.]`, 3–30) |
| `pushTokens` | `userId`, `token`, `platform` | unique `token`; by `userId` |
| `posts` | `authorId`, `mediaType` (`image`/`video`), `mediaStorageId`, `posterStorageId?` (video), `width`, `height`, `durationMs?`, `caption?` (≤2,200), `likeCount`, `commentCount`, `createdAt` | by `authorId + createdAt`; by `createdAt` (Explore) |
| `follows` | `followerId`, `followeeId` | unique pair; indexes both directions |
| `likes` | `postId`, `userId` | unique pair; by `postId` |
| `comments` | `postId`, `authorId`, `body` (≤500), `createdAt` | by `postId + createdAt` |
| `conversations` | `userAId`, `userBId` (sorted pair), `lastMessageAt`, `lastMessagePreview`, `lastReadAt {A, B}` | unique pair; by participant + `lastMessageAt` |
| `messages` | `conversationId`, `senderId`, `kind` (`text`/`image`/`post`), `body?` (≤1,000), `storageId?`, `postId?`, `createdAt` | by `conversationId + createdAt` |
| `notifications` | `recipientId`, `actorId`, `type` (`like`/`comment`/`follow`/`message`), `postId?`, `commentId?`, `read`, `createdAt` | by `recipientId + createdAt` |
| `blocks` | `blockerId`, `blockedId` | unique pair; both directions |
| `reports` | `reporterId`, `targetType`, `targetId`, `reason`, `status`, `createdAt` | reviewed in the Convex dashboard |

**Sources of truth:** Clerk owns identity and sessions. Convex owns everything else, including the profile. A deleted user's messages keep their `senderId`; the client renders a missing sender as "Deleted user".

## 6. Architecture

```
 Android / iOS app (Expo)
   │  Clerk Expo SDK ── Google / Apple OAuth
   │  ConvexProviderWithClerk (Clerk JWT → Convex auth)
   ▼
 Convex
   ├─ queries      reactive: feed, explore, profile, threads, activity (live, no polling)
   ├─ mutations    all writes + permission checks (owner-only delete, block rules)
   ├─ file storage upload URLs → photos, videos, posters, avatars
   ├─ actions      send Expo push (scheduled after mutations, retried)
   └─ HTTP actions Clerk webhook (user.created / updated / deleted, signature verified)
 Static web page   account-deletion request page (+ post link fallback, see A12)
```

- **Business logic lives in Convex functions.** The client never decides permissions.
- **Realtime:** Convex subscriptions keep feed, threads, "Seen", and activity live.
- **Optimistic updates:** likes, follows, comments, sending messages.
- **Feed:** computed on read from the follow list (fine at ~10 users).
- **Uploads:** compress (images) / check duration (videos) on device → `generateUploadUrl` → POST file → mutation creates the post.
- **Push:** a mutation writes a `notifications` row and schedules an action that checks preferences and "conversation open", then calls Expo Push. A push failure never fails the original action.
- **Account deletion:** in-app request or Clerk `user.deleted` webhook → scheduled, batched Convex deletion of posts, media, comments, likes, follows, notifications, push tokens.

## 7. Visual direction (frontend-design plan, draft)

**Subject:** a private photo album passed around a small group. **Audience:** friends and family, not creators. **Primary job:** show each other's moments clearly.

| Token | Light | Dark | Use |
|---|---|---|---|
| Paper | `#FFFFFF` | `#000000` | Backgrounds. True black in dark mode so photos glow on OLED |
| Ink | `#000000` | `#FFFFFF` | Usernames, body text |
| Graphite | `#6B6F76` | `#A1A1AA` | Timestamps, secondary text |
| Hairline | `#E4E4E7` | `#27272A` | Dividers, only where they separate content |
| Porchlight | `#D97706` | `#FBBF24` | **Only** liked hearts, unread dots, the active tab. The warm light of a family gathering; deliberately not the red heart every other app uses |

- **Type:** platform system font (Roboto / SF Pro). Hierarchy comes from weight, not size: usernames semibold 15, body regular 15, meta 13, screen titles semibold 22. Sentence case everywhere, no all-caps labels.
- **Layout:** media full-width at its own aspect ratio (clamped 4:5 to 1.91:1). No cards, no shadows, no rounded media in the feed. Everything left-aligned. Explore and profile grids: 3 columns, 1 px gaps, square crops.

```
Feed item                      Profile
┌───────────────────────┐      ┌───────────────────────┐
│ (o) anna_k     2h  ⋯ │      │ (O)  Anna Kovač        │
├───────────────────────┤      │      anna_k            │
│                       │      │ Bio line…              │
│        media          │      │ 12 posts  8 followers  │
│                       │      │ [Edit profile]         │
├───────────────────────┤      ├───────┬───────┬───────┤
│ ♥  💬  ↗              │      │       │       │       │
│ Liked by tom and 3    │      ├───────┼───────┼───────┤
│ anna_k Lake day       │      │       │       │       │
└───────────────────────┘      └───────┴───────┴───────┘
```

- **Principles:** the photos supply all the colour; the UI is black, white, and grey. Boldness goes in one place: the Porchlight heart and its single like animation. Motion only answers actions (like, send, "Seen"); no entrance animations. Copy is plain and direct ("Share" → "Shared"; "Upload failed. Tap to retry.").
- **Checked against the brief:** the generic default is a white Instagram clone with a red heart and rounded cards. Changed: the accent is a warm amber tied to the friends-and-family subject; cards and shadows removed; true-black dark mode. To be finalised before UI work.

## 8. Edge cases and failure behaviour

- **Empty states:** Home (no follows) → Explore + suggested members; own profile with no posts → "Share your first photo"; Messages → "Start a conversation" with member list; Activity → "Likes, comments, and follows show up here."
- **Slow or failed upload:** visible progress; retry on failure; the post isn't created until the file is stored.
- **Offline:** last-loaded data stays on screen; writes show an error and can be retried. No offline queue in v1.
- **Deleted content:** opening a deleted post from a notification or DM card shows "This post was deleted."
- **Blocked users:** hidden from feed, Explore, search, comments, and activity; can't message you.
- **Abuse:** invite-only with ~10 users; no rate limits on comments/messages in v1.
- **Media limits:** videos over 30 s or 50 MB are rejected before upload with a clear message.

## 9. Delivery and quality

- **Environments:** one Convex dev deployment and one Clerk development instance while building. Before inviting friends: a Convex production deployment and a Clerk production instance, each with its own webhook.
- **EAS profiles:** `development` (dev client), `preview` (installable APK), `production` (Play internal testing). OTA fixes via `eas update`.
- **Distribution:** Google Play **internal testing** track (up to 100 testers, invited by email).
- **CI (required):** on every push and pull request — lint (`npx expo lint`), typecheck (`npx tsc --noEmit`), Convex function tests. *(Tooling: assumption A7.)*
- **Tests:** automated tests for Convex functions — permissions, owner-only deletes, block rules, username uniqueness, account-deletion cascade. Manual checklist on your Android phone. No end-to-end UI tests.
- **Monitoring:** Convex dashboard logs; EAS Observe for crashes. No analytics.
- **iOS:** not tested until you have an Apple Developer account; code kept cross-platform.
- **Definition of done for v1:** CI green, and you plus invited friends can complete every journey in §4 on Android via the internal testing build.

## 10. Assumptions (not firmly confirmed — correct any that are wrong)

- **A1.** EAS development builds are fine (Expo Go can't run Clerk native sign-in or push).
- **A2.** One media item per post.
- **A3.** New users with no follows see a Home empty state pointing to Explore and suggested members.
- **A4.** No typing indicators; read receipts yes.
- **A5.** Moderation = block + report, reviewed manually in the Convex dashboard (required by Google Play's UGC policy).
- **A6.** Light/dark mode follows the system setting.
- **A7.** CI runs on **GitHub Actions**. The repo has no remote yet, so this needs a GitHub repo. EAS Workflows is the alternative.
- **A8.** Clerk **Invite-only** access mode; you send invites from the Clerk dashboard.
- **A9.** Feed is computed on read; no fan-out tables.
- **A10.** Text limits: caption 2,200, comment 500, message 1,000, bio 150 characters.
- **A11.** Terms of use are accepted during onboarding (Google Play UGC requirement).
- **A12.** Share links use an `https://` URL on a small static site that opens the app (Android App Links) and otherwise shows a "Get the app" page; the same site hosts the deletion-request page. Until it exists, links use `withfriends://`.
- **A13.** Video poster frames are generated on device at upload.
- **A14.** Android package ID will be `com.<your-name>.withfriends` — needs your choice before the first build.
- **A15.** Counts (followers, likes, comments, posts) are stored on records rather than counted on read.

## 11. Open risks and unknowns

1. **NativeWind version.** v5 is a preview release; v4 is stable but may not support RN 0.88 / Reanimated 4.7. Test both at scaffold time — could cost a day.
2. **Invite-only + OAuth.** Confirm invited users can finish sign-up with Google/Apple in the Expo flow (invitation ticket handling). **Apple "Hide My Email"** produces a relay address that won't match the invited email — may need the invitation-link flow, or Google only for invitees.
3. **Apple sign-in on Android** goes through a browser flow; confirm Clerk's Expo SDK handles it smoothly.
4. **Convex free-tier limits** on file storage and bandwidth with video — check current quotas; the 30 s cap helps.
5. **Push on Android** needs Firebase (FCM v1) credentials uploaded to EAS; first-time setup is fiddly.
6. **Google Play requirements:** deletion-request web page, Data safety form, terms acceptance, reporting and blocking. Internal testing has lighter review, but policies still apply.
7. **Share links need a domain** for `https` App Links; custom-scheme links aren't tappable in many messaging apps.
8. **iOS is untested** until you have an Apple Developer account; platform differences may surface late.
9. **Account-deletion cascade** must be batched to stay within Convex mutation limits (small at this scale, but design for it).
10. **Two Clerk instances and two Convex deployments** mean duplicated webhook and env config — easy to misconfigure.
11. **Folder name** is still `FindingNemo` (the app itself is renamed). Harmless.
