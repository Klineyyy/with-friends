/**
 * TEMPORARY sample data for the UI phases. Replaced by Convex queries in
 * Phase 9 (see implementation.md). Delete this file once nothing imports it.
 *
 * People match the board (maya, tom, lola.ines, bencruz, ana…). Photos come
 * from picsum.photos by fixed ID, so they're the same on every launch.
 */

export type MockUser = {
  id: string;
  username: string;
  displayName: string;
  avatarUri: string | null;
  /** Up to 150 characters (scope A10). */
  bio?: string;
};

export type MockComment = {
  id: string;
  authorId: string;
  body: string;
  createdAt: number;
};

export type MockPost = {
  id: string;
  /** Short ID for share links: withfriends.app/p/{shortId}. */
  shortId: string;
  authorId: string;
  mediaType: "image" | "video";
  /** Photo, or the video file. */
  mediaUri: string;
  /** Video poster frame. */
  posterUri?: string;
  width: number;
  height: number;
  durationMs?: number;
  caption?: string;
  likedBy: string[];
  comments: MockComment[];
  createdAt: number;
};

/** The signed-in user. Their name and photo come from the Clerk account. */
export const ME_ID = "me";

const photo = (id: number, w: number, h: number) => `https://picsum.photos/id/${id}/${w}/${h}`;
const avatar = (id: number) => photo(id, 200, 200);

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const now = Date.now();
const ago = (ms: number) => now - ms;

export const mockUsers: MockUser[] = [
  { id: "u_maya", username: "maya", displayName: "Maya Reyes", avatarUri: avatar(1027), bio: "Lake days and too many photos of my kids." },
  { id: "u_tom", username: "tom", displayName: "Tom Reyes", avatarUri: avatar(91), bio: "Mostly outdoors." },
  { id: "u_lola", username: "lola.ines", displayName: "Lola Ines", avatarUri: avatar(64), bio: "Grandma. Baker. Sunday lunch organiser." },
  { id: "u_ben", username: "bencruz", displayName: "Ben Cruz", avatarUri: avatar(237), bio: "Bruno's person." },
  { id: "u_ana", username: "ana", displayName: "Ana Cruz", avatarUri: avatar(823) },
  { id: "u_jules", username: "jules", displayName: "Jules Tan", avatarUri: avatar(65), bio: "On the road again." },
  { id: "u_priya", username: "priya", displayName: "Priya Nair", avatarUri: avatar(836) },
  { id: "u_theo", username: "theo", displayName: "Theo Reyes", avatarUri: avatar(338) },
  { id: "u_sam", username: "sam.o", displayName: "Sam Ocampo", avatarUri: avatar(1025) },
  { id: "u_nina", username: "nina", displayName: "Nina Lim", avatarUri: null },
];

/** Who the signed-in user follows at first. theo, sam.o and nina are "people you may know". */
export const mockFollowing: string[] = [
  "u_tom",
  "u_maya",
  "u_lola",
  "u_ben",
  "u_ana",
  "u_jules",
  "u_priya",
];

export const mockPosts: MockPost[] = [
  {
    id: "p_lake",
    shortId: "8kq2",
    authorId: "u_tom",
    mediaType: "image",
    mediaUri: photo(1011, 1080, 720),
    width: 1080,
    height: 720,
    caption: "Lake day with the cousins. Water was freezing.",
    likedBy: ["u_maya", "u_lola", "u_ben", "u_ana"],
    comments: [
      { id: "c1", authorId: "u_maya", body: "The water looks so calm. Jealous!", createdAt: ago(100 * MINUTE) },
      { id: "c2", authorId: "u_lola", body: "So proud of you all. Bring them to lunch on Sunday.", createdAt: ago(90 * MINUTE) },
      { id: "c3", authorId: "u_ben", body: "Next time I'm coming too.", createdAt: ago(60 * MINUTE) },
      { id: "c4", authorId: "u_ana", body: "Who took this one?", createdAt: ago(20 * MINUTE) },
    ],
    createdAt: ago(2 * HOUR),
  },
  {
    id: "p_cookies",
    shortId: "3fz7",
    authorId: "u_lola",
    mediaType: "video",
    // Sample clip. Playback needs expo-video (not installed yet); the feed shows the poster.
    mediaUri: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    posterUri: photo(835, 1080, 1350),
    width: 1080,
    height: 1350,
    durationMs: 24_000,
    caption: "Cookie Sunday, as always.",
    likedBy: ["u_tom", "u_maya"],
    comments: [
      { id: "c5", authorId: "u_tom", body: "Save me one!", createdAt: ago(4 * HOUR) },
    ],
    createdAt: ago(5 * HOUR),
  },
  {
    id: "p_valley",
    shortId: "q91m",
    authorId: "u_maya",
    mediaType: "image",
    mediaUri: photo(1043, 1080, 1350),
    width: 1080,
    height: 1350,
    caption: "Made it to the top before the clouds rolled in.",
    likedBy: ["u_tom", "u_ana", "u_jules", "u_priya", "u_ben", "u_lola"],
    comments: [
      { id: "c6", authorId: "u_jules", body: "Which trail is this?", createdAt: ago(8 * HOUR) },
      { id: "c7", authorId: "u_maya", body: "The long one past the lake. Worth it.", createdAt: ago(7 * HOUR) },
    ],
    createdAt: ago(9 * HOUR),
  },
  {
    id: "p_bruno",
    shortId: "b7ru",
    authorId: "u_ben",
    mediaType: "image",
    mediaUri: photo(237, 1080, 1080),
    width: 1080,
    height: 1080,
    caption: "Meet Bruno. He already owns the couch.",
    likedBy: ["u_maya", "u_tom", "u_lola", "u_ana", "u_priya", "u_jules", "u_theo"],
    comments: [
      { id: "c8", authorId: "u_ana", body: "BRUNO", createdAt: ago(DAY) },
      { id: "c9", authorId: "u_priya", body: "Bring him to the park on Saturday?", createdAt: ago(20 * HOUR) },
      { id: "c10", authorId: "u_lola", body: "Those eyes.", createdAt: ago(18 * HOUR) },
    ],
    createdAt: ago(DAY + 3 * HOUR),
  },
  {
    id: "p_coffee",
    shortId: "c0f3",
    authorId: "u_ana",
    mediaType: "image",
    mediaUri: photo(1060, 1080, 1350),
    width: 1080,
    height: 1350,
    caption: "Slow morning.",
    likedBy: ["u_ben"],
    comments: [],
    createdAt: ago(2 * DAY),
  },
  {
    id: "p_strawberries",
    shortId: "st4b",
    authorId: "u_priya",
    mediaType: "image",
    mediaUri: photo(1080, 1080, 1080),
    width: 1080,
    height: 1080,
    caption: "First pick of the season. Jam next weekend, who's in?",
    likedBy: ["u_lola", "u_maya", "u_ana"],
    comments: [
      { id: "c11", authorId: "u_lola", body: "Me!", createdAt: ago(3 * DAY) },
    ],
    createdAt: ago(3 * DAY),
  },
  {
    id: "p_coast",
    shortId: "r0ad",
    authorId: "u_jules",
    mediaType: "image",
    mediaUri: photo(1050, 1910, 1000),
    width: 1910,
    height: 1000,
    caption: "Road trip, day 3.",
    likedBy: ["u_tom", "u_maya"],
    comments: [],
    createdAt: ago(4 * DAY),
  },
  {
    id: "p_waterfall",
    shortId: "w4tr",
    authorId: "u_theo",
    mediaType: "video",
    mediaUri: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    posterUri: photo(1039, 1080, 1350),
    width: 1080,
    height: 1350,
    durationMs: 12_000,
    caption: "Louder in person.",
    likedBy: ["u_ben"],
    comments: [],
    createdAt: ago(5 * DAY),
  },
  {
    id: "p_camp",
    shortId: "sn0w",
    authorId: "u_tom",
    mediaType: "image",
    mediaUri: photo(1036, 1080, 720),
    width: 1080,
    height: 720,
    caption: "Cold, but worth it.",
    likedBy: ["u_maya", "u_jules", "u_ben"],
    comments: [
      { id: "c12", authorId: "u_jules", body: "Did you sleep at all?", createdAt: ago(6 * DAY) },
    ],
    createdAt: ago(6 * DAY),
  },
];

/** Your own posts, so Activity (board 16a) has something to point at. */
mockPosts.push(
  {
    id: "p_me_dog",
    shortId: "d0g5",
    authorId: ME_ID,
    mediaType: "image",
    mediaUri: photo(1012, 1080, 1350),
    width: 1080,
    height: 1350,
    caption: "Bruno came for a walk.",
    likedBy: ["u_maya"],
    comments: [
      { id: "c_me1", authorId: "u_lola", body: "Bring Bruno on Sunday!", createdAt: ago(HOUR) },
    ],
    createdAt: ago(3 * HOUR),
  },
  {
    id: "p_me_cafe",
    shortId: "caf3",
    authorId: ME_ID,
    mediaType: "image",
    mediaUri: photo(431, 1080, 1080),
    width: 1080,
    height: 1080,
    caption: "Found a new place.",
    likedBy: ["u_tom", "u_priya", "u_ana"],
    comments: [
      { id: "c_me2", authorId: "u_ben", body: "Where is this café?", createdAt: ago(3 * DAY) },
    ],
    createdAt: ago(3 * DAY + 2 * HOUR),
  },
  {
    id: "p_me_field",
    shortId: "f1ld",
    authorId: ME_ID,
    mediaType: "image",
    mediaUri: photo(1001, 1080, 720),
    width: 1080,
    height: 720,
    likedBy: ["u_jules"],
    comments: [],
    createdAt: ago(6 * DAY),
  },
);

/** Older photos so Explore and profile grids look lived-in. No likes or comments. */
const olderPhotos: [authorId: string, picsumId: number, daysAgo: number, caption?: string][] = [
  ["u_maya", 1015, 7, "River walk."],
  ["u_maya", 1018, 8],
  ["u_maya", 1019, 10, "Weekend view."],
  ["u_maya", 1024, 12],
  ["u_lola", 1081, 9, "Jam is done."],
  ["u_lola", 292, 13],
  ["u_tom", 1016, 9, "Canyon."],
  ["u_tom", 1035, 15],
  ["u_ben", 1026, 11],
  ["u_jules", 1040, 12],
  ["u_jules", 1044, 14, "Last stop."],
  ["u_priya", 312, 16],
  ["u_sam", 1047, 8, "City nights."],
  ["u_sam", 1031, 17],
  ["u_theo", 1029, 18],
  ["u_nina", 1062, 19, "Hello!"],
];

mockPosts.push(
  ...olderPhotos.map(([authorId, picsumId, days, caption]): MockPost => ({
    id: `p_old_${picsumId}`,
    shortId: picsumId.toString(36).padStart(4, "0"),
    authorId,
    mediaType: "image",
    mediaUri: photo(picsumId, 1080, 1080),
    width: 1080,
    height: 1080,
    caption,
    likedBy: [],
    comments: [],
    createdAt: ago(days * DAY),
  })),
);

/**
 * Who each other member follows (`ME_ID` = they follow you). Your own follows
 * are `mockFollowing` above and change as you tap Follow.
 */
export const mockFollowGraph: Record<string, string[]> = {
  u_maya: ["u_tom", "u_lola", "u_ben", "u_ana", "u_jules", "u_priya", "u_theo", "u_nina", ME_ID],
  u_tom: ["u_maya", "u_lola", "u_ben", "u_ana", "u_jules", ME_ID],
  u_lola: ["u_maya", "u_tom", "u_ana", "u_priya", ME_ID],
  u_ben: ["u_maya", "u_tom", "u_ana", "u_theo"],
  u_ana: ["u_maya", "u_ben", "u_lola", "u_jules", ME_ID],
  u_jules: ["u_maya", "u_tom", "u_priya", "u_sam"],
  u_priya: ["u_maya", "u_lola", "u_jules", ME_ID],
  u_theo: ["u_maya", "u_ben", "u_sam"],
  u_sam: ["u_maya", "u_jules", "u_theo"],
  u_nina: ["u_maya", "u_lola", ME_ID],
};

// ─── Messages (board 14a, 15) ────────────────────────────────────────────────

export type MockMessage = {
  id: string;
  senderId: string;
  kind: "text" | "image" | "post";
  /** Text messages, up to 1,000 characters (scope A10). */
  body?: string;
  /** Photo messages. */
  imageUri?: string;
  width?: number;
  height?: number;
  /** Shared-post cards. */
  postId?: string;
  createdAt: number;
};

/** One-to-one, so a conversation is keyed by the other person. */
export type MockConversation = {
  userId: string;
  /** Oldest first. */
  messages: MockMessage[];
  /** When you last read it. Their messages after this are unread. */
  lastReadAt: number;
  /** When they last read it. Your last message shows "Seen" once this passes it. */
  theirLastReadAt: number;
};

let msgSeq = 0;
const msg = (senderId: string, at: number, m: Omit<MockMessage, "id" | "senderId" | "createdAt">): MockMessage => ({
  id: `m${++msgSeq}`,
  senderId,
  createdAt: ago(at),
  ...m,
});
const text = (senderId: string, at: number, body: string) => msg(senderId, at, { kind: "text", body });

export const mockConversations: MockConversation[] = [
  {
    userId: "u_maya",
    messages: [
      text("u_maya", 70 * MINUTE, "Did you all get home ok?"),
      text(ME_ID, 68 * MINUTE, "Yes, the kids slept the whole drive."),
      msg(ME_ID, 40 * MINUTE, { kind: "post", postId: "p_lake" }),
      text(ME_ID, 40 * MINUTE, "Did you see tom's photo? Sending it to lola too."),
      text("u_maya", 3 * MINUTE, "Bruno says hi"),
      msg("u_maya", 2 * MINUTE, { kind: "image", imageUri: photo(237, 800, 1000), width: 800, height: 1000 }),
    ],
    lastReadAt: ago(30 * MINUTE),
    theirLastReadAt: ago(3 * MINUTE),
  },
  {
    userId: "u_lola",
    messages: [
      text(ME_ID, 5 * HOUR, "Are we still on for Sunday?"),
      text("u_lola", HOUR, "Sunday lunch at 12, bring the kids"),
    ],
    lastReadAt: ago(5 * HOUR),
    theirLastReadAt: ago(HOUR),
  },
  {
    userId: "u_tom",
    messages: [
      text("u_tom", 4 * HOUR, "It wasn't that cold."),
      text(ME_ID, 3 * HOUR, "Ha, the water really was cold"),
    ],
    lastReadAt: ago(3 * HOUR),
    theirLastReadAt: ago(2 * HOUR),
  },
  {
    userId: "u_ben",
    messages: [msg("u_ben", 4 * DAY, { kind: "post", postId: "p_bruno" })],
    lastReadAt: ago(3 * DAY),
    theirLastReadAt: ago(4 * DAY),
  },
  {
    userId: "u_ana",
    messages: [
      msg(ME_ID, 5 * DAY + HOUR, { kind: "image", imageUri: photo(1011, 1080, 720), width: 1080, height: 720 }),
      text("u_ana", 5 * DAY, "Thanks for the photos!"),
    ],
    lastReadAt: ago(5 * DAY),
    theirLastReadAt: ago(5 * DAY),
  },
  {
    userId: "u_jules",
    messages: [
      text("u_jules", 8 * DAY + HOUR, "Party's at 7 on Saturday."),
      text(ME_ID, 8 * DAY, "See you at the party"),
    ],
    lastReadAt: ago(8 * DAY),
    theirLastReadAt: ago(7 * DAY),
  },
  {
    userId: "u_priya",
    messages: [text("u_priya", 16 * DAY, "That cake looked amazing")],
    lastReadAt: ago(15 * DAY),
    theirLastReadAt: ago(16 * DAY),
  },
];

// ─── Activity (board 16a) ────────────────────────────────────────────────────

export type MockActivity = {
  id: string;
  actorId: string;
  type: "like" | "comment" | "follow";
  postId?: string;
  /** Comment text, for "commented: “…”". */
  body?: string;
  read: boolean;
  createdAt: number;
};

export const mockActivity: MockActivity[] = [
  { id: "a1", actorId: "u_maya", type: "like", postId: "p_me_dog", read: false, createdAt: ago(12 * MINUTE) },
  { id: "a2", actorId: "u_lola", type: "comment", postId: "p_me_dog", body: "Bring Bruno on Sunday!", read: false, createdAt: ago(HOUR) },
  { id: "a3", actorId: "u_nina", type: "follow", read: true, createdAt: ago(3 * HOUR) },
  { id: "a4", actorId: "u_tom", type: "like", postId: "p_me_cafe", read: true, createdAt: ago(2 * DAY) },
  { id: "a5", actorId: "u_priya", type: "like", postId: "p_me_cafe", read: true, createdAt: ago(2 * DAY + 2 * HOUR) },
  { id: "a6", actorId: "u_ana", type: "like", postId: "p_me_cafe", read: true, createdAt: ago(2 * DAY + 5 * HOUR) },
  { id: "a7", actorId: "u_ben", type: "comment", postId: "p_me_cafe", body: "Where is this café?", read: true, createdAt: ago(3 * DAY) },
  { id: "a8", actorId: "u_ana", type: "follow", read: true, createdAt: ago(4 * DAY) },
  { id: "a9", actorId: "u_jules", type: "like", postId: "p_me_field", read: true, createdAt: ago(5 * DAY) },
];
