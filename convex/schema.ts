import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Data model from project-scope.md §5. Counts are stored on the parent record
 * and updated in the same mutation as the row they count (scope A15).
 */

export const notificationPrefs = v.object({
  likes: v.boolean(),
  comments: v.boolean(),
  follows: v.boolean(),
  messages: v.boolean(),
});

export const reportReason = v.union(
  v.literal("spam"),
  v.literal("harassment"),
  v.literal("nudity"),
  v.literal("violence"),
  v.literal("false_information"),
  v.literal("other"),
);

export default defineSchema({
  users: defineTable({
    /** Clerk user ID (`identity.subject`, webhook `data.id`). */
    clerkId: v.string(),
    /** Set during onboarding, shown as typed ("Kline"). [A-Za-z0-9_.], 3–30. */
    username: v.optional(v.string()),
    /** Lowercase `username`: uniqueness ignores case, so "Kline" and "kline" can't both exist. */
    usernameKey: v.optional(v.string()),
    displayName: v.string(),
    bio: v.optional(v.string()),
    /** A photo uploaded in the app. Wins over `clerkImageUrl`. */
    avatarStorageId: v.optional(v.id("_storage")),
    /** The Google / Apple photo Clerk has. Default avatar. */
    clerkImageUrl: v.optional(v.string()),
    onboarded: v.boolean(),
    termsAcceptedAt: v.optional(v.number()),
    notificationPrefs,
    followerCount: v.number(),
    followingCount: v.number(),
    postCount: v.number(),
    /** Set when account deletion starts; the user is hidden from then on. */
    deletingAt: v.optional(v.number()),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_username", ["username"])
    .index("by_usernameKey", ["usernameKey"])
    .index("by_onboarded", ["onboarded"]),

  pushTokens: defineTable({
    userId: v.id("users"),
    token: v.string(),
    platform: v.union(v.literal("ios"), v.literal("android")),
  })
    .index("by_token", ["token"])
    .index("by_userId", ["userId"]),

  posts: defineTable({
    authorId: v.id("users"),
    mediaType: v.union(v.literal("image"), v.literal("video")),
    mediaStorageId: v.id("_storage"),
    posterStorageId: v.optional(v.id("_storage")),
    width: v.number(),
    height: v.number(),
    durationMs: v.optional(v.number()),
    caption: v.optional(v.string()),
    likeCount: v.number(),
    commentCount: v.number(),
    createdAt: v.number(),
  })
    .index("by_authorId_and_createdAt", ["authorId", "createdAt"])
    .index("by_createdAt", ["createdAt"]),

  follows: defineTable({
    followerId: v.id("users"),
    followeeId: v.id("users"),
  })
    .index("by_followerId_and_followeeId", ["followerId", "followeeId"])
    .index("by_followeeId", ["followeeId"]),

  likes: defineTable({
    postId: v.id("posts"),
    userId: v.id("users"),
  })
    .index("by_postId_and_userId", ["postId", "userId"])
    .index("by_userId", ["userId"]),

  comments: defineTable({
    postId: v.id("posts"),
    authorId: v.id("users"),
    body: v.string(),
    createdAt: v.number(),
  })
    .index("by_postId_and_createdAt", ["postId", "createdAt"])
    .index("by_authorId", ["authorId"]),

  conversations: defineTable({
    /** Sorted pair: `userAId < userBId`. */
    userAId: v.id("users"),
    userBId: v.id("users"),
    lastMessageAt: v.number(),
    lastMessagePreview: v.string(),
    lastMessageSenderId: v.id("users"),
    lastMessageKind: v.union(v.literal("text"), v.literal("image"), v.literal("post")),
    lastReadAt: v.object({ a: v.number(), b: v.number() }),
  })
    .index("by_userAId_and_userBId", ["userAId", "userBId"])
    .index("by_userAId_and_lastMessageAt", ["userAId", "lastMessageAt"])
    .index("by_userBId_and_lastMessageAt", ["userBId", "lastMessageAt"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    kind: v.union(v.literal("text"), v.literal("image"), v.literal("post")),
    body: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    postId: v.optional(v.id("posts")),
    createdAt: v.number(),
  }).index("by_conversationId_and_createdAt", ["conversationId", "createdAt"]),

  notifications: defineTable({
    recipientId: v.id("users"),
    actorId: v.id("users"),
    type: v.union(v.literal("like"), v.literal("comment"), v.literal("follow"), v.literal("message")),
    postId: v.optional(v.id("posts")),
    commentId: v.optional(v.id("comments")),
    read: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_recipientId_and_createdAt", ["recipientId", "createdAt"])
    .index("by_recipientId_and_read", ["recipientId", "read"])
    .index("by_actorId", ["actorId"])
    .index("by_postId", ["postId"]),

  blocks: defineTable({
    blockerId: v.id("users"),
    blockedId: v.id("users"),
  })
    .index("by_blockerId_and_blockedId", ["blockerId", "blockedId"])
    .index("by_blockedId", ["blockedId"]),

  reports: defineTable({
    reporterId: v.id("users"),
    targetType: v.union(v.literal("post"), v.literal("comment"), v.literal("user")),
    targetId: v.string(),
    /** Whose content it is, so a reviewer can find the account. */
    targetUserId: v.optional(v.id("users")),
    reason: reportReason,
    status: v.union(v.literal("open"), v.literal("reviewed")),
    createdAt: v.number(),
  })
    .index("by_status_and_createdAt", ["status", "createdAt"])
    .index("by_reporterId", ["reporterId"]),
});
