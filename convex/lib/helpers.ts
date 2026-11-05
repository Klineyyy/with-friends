import { ConvexError, v, type Infer } from "convex/values";

import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

/** Text limits (scope A10). */
export const LIMITS = {
  caption: 2200,
  comment: 500,
  message: 1000,
  bio: 150,
  displayName: 50,
  videoMs: 30_000,
  videoBytes: 50 * 1024 * 1024,
  imageBytes: 15 * 1024 * 1024,
} as const;

/** The signed-in user's row, or null (signed out, or not created yet). Deleted accounts count as null. */
export async function getMe(ctx: QueryCtx): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  const me = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();
  return me && !me.deletingAt ? me : null;
}

/** Like `getMe`, but throws. Use in every mutation that acts as the user. */
export async function requireMe(ctx: QueryCtx): Promise<Doc<"users">> {
  const me = await getMe(ctx);
  if (!me) throw new ConvexError("Not signed in");
  return me;
}

/** Signed in and finished onboarding: required for anything social. */
export async function requireMember(ctx: QueryCtx): Promise<Doc<"users">> {
  const me = await requireMe(ctx);
  if (!me.onboarded) throw new ConvexError("Finish setting up your account first");
  return me;
}

/** A user who is still around (not deleted, not mid-deletion). */
export async function getLiveUser(ctx: QueryCtx, id: Id<"users">): Promise<Doc<"users"> | null> {
  const user = await ctx.db.get("users", id);
  return user && !user.deletingAt ? user : null;
}

/**
 * Everyone hidden from `me`: people I blocked and people who blocked me
 * (blocks hide both ways, scope §8). Small at this scale.
 */
export async function hiddenUserIds(ctx: QueryCtx, meId: Id<"users">): Promise<Set<Id<"users">>> {
  const [mine, theirs] = await Promise.all([
    ctx.db
      .query("blocks")
      .withIndex("by_blockerId_and_blockedId", (q) => q.eq("blockerId", meId))
      .take(500),
    ctx.db
      .query("blocks")
      .withIndex("by_blockedId", (q) => q.eq("blockedId", meId))
      .take(500),
  ]);
  return new Set([...mine.map((b) => b.blockedId), ...theirs.map((b) => b.blockerId)]);
}

export async function isBlockedEitherWay(ctx: QueryCtx, a: Id<"users">, b: Id<"users">): Promise<boolean> {
  const [ab, ba] = await Promise.all([
    ctx.db
      .query("blocks")
      .withIndex("by_blockerId_and_blockedId", (q) => q.eq("blockerId", a).eq("blockedId", b))
      .unique(),
    ctx.db
      .query("blocks")
      .withIndex("by_blockerId_and_blockedId", (q) => q.eq("blockerId", b).eq("blockedId", a))
      .unique(),
  ]);
  return !!ab || !!ba;
}

export async function getFollow(ctx: QueryCtx, followerId: Id<"users">, followeeId: Id<"users">) {
  return await ctx.db
    .query("follows")
    .withIndex("by_followerId_and_followeeId", (q) =>
      q.eq("followerId", followerId).eq("followeeId", followeeId),
    )
    .unique();
}

/** Removes a follow and fixes both counts. No-op if there isn't one. */
export async function removeFollow(ctx: MutationCtx, followerId: Id<"users">, followeeId: Id<"users">) {
  const follow = await getFollow(ctx, followerId, followeeId);
  if (!follow) return;
  await ctx.db.delete("follows", follow._id);
  await adjustCount(ctx, followerId, "followingCount", -1);
  await adjustCount(ctx, followeeId, "followerCount", -1);
}

export async function adjustCount(
  ctx: MutationCtx,
  userId: Id<"users">,
  field: "followerCount" | "followingCount" | "postCount",
  delta: number,
) {
  const user = await ctx.db.get("users", userId);
  if (!user) return;
  await ctx.db.patch("users", userId, { [field]: Math.max(0, user[field] + delta) });
}

// ─── Views returned to the app ───────────────────────────────────────────────

export const userView = v.object({
  id: v.id("users"),
  username: v.string(),
  displayName: v.string(),
  avatarUri: v.union(v.string(), v.null()),
  bio: v.optional(v.string()),
});
export type UserView = Infer<typeof userView>;

export async function toUserView(ctx: QueryCtx, user: Doc<"users">): Promise<UserView> {
  const avatarUri = user.avatarStorageId
    ? await ctx.storage.getUrl(user.avatarStorageId)
    : (user.clerkImageUrl ?? null);
  return {
    id: user._id,
    username: user.username ?? "",
    displayName: user.displayName,
    avatarUri,
    bio: user.bio,
  };
}

/** Looks up a user for display; a deleted account comes back as `null`. */
export async function userViewById(ctx: QueryCtx, id: Id<"users">): Promise<UserView | null> {
  const user = await getLiveUser(ctx, id);
  return user ? await toUserView(ctx, user) : null;
}

export const postView = v.object({
  id: v.id("posts"),
  authorId: v.id("users"),
  author: v.union(userView, v.null()),
  mediaType: v.union(v.literal("image"), v.literal("video")),
  mediaUri: v.string(),
  posterUri: v.optional(v.string()),
  width: v.number(),
  height: v.number(),
  durationMs: v.optional(v.number()),
  caption: v.optional(v.string()),
  likeCount: v.number(),
  likedByMe: v.boolean(),
  /** For "Liked by maya and 3 others". `null` when nobody visible liked it. */
  firstLikerUsername: v.union(v.string(), v.null()),
  commentCount: v.number(),
  createdAt: v.number(),
});
export type PostView = Infer<typeof postView>;

export async function toPostView(ctx: QueryCtx, post: Doc<"posts">, meId: Id<"users">): Promise<PostView> {
  const [author, mediaUri, posterUri, myLike, firstLikes] = await Promise.all([
    userViewById(ctx, post.authorId),
    ctx.storage.getUrl(post.mediaStorageId),
    post.posterStorageId ? ctx.storage.getUrl(post.posterStorageId) : Promise.resolve(null),
    ctx.db
      .query("likes")
      .withIndex("by_postId_and_userId", (q) => q.eq("postId", post._id).eq("userId", meId))
      .unique(),
    ctx.db
      .query("likes")
      .withIndex("by_postId_and_userId", (q) => q.eq("postId", post._id))
      .take(3),
  ]);
  // "Liked by you" reads oddly next to your own heart; prefer someone else.
  let firstLikerUsername: string | null = null;
  for (const like of firstLikes) {
    if (like.userId === meId) continue;
    const liker = await getLiveUser(ctx, like.userId);
    if (liker?.username) {
      firstLikerUsername = liker.username;
      break;
    }
  }
  if (!firstLikerUsername && myLike) firstLikerUsername = "you";
  return {
    id: post._id,
    authorId: post.authorId,
    author,
    mediaType: post.mediaType,
    mediaUri: mediaUri ?? "",
    posterUri: posterUri ?? undefined,
    width: post.width,
    height: post.height,
    durationMs: post.durationMs,
    caption: post.caption,
    likeCount: post.likeCount,
    likedByMe: !!myLike,
    firstLikerUsername,
    commentCount: post.commentCount,
    createdAt: post.createdAt,
  };
}

/** Checks an uploaded file is what the client says it is, and within limits. */
export async function checkUpload(
  ctx: QueryCtx,
  storageId: Id<"_storage">,
  kind: "image" | "video",
): Promise<void> {
  const meta = await ctx.db.system.get("_storage", storageId);
  if (!meta) throw new ConvexError("Upload not found. Try again.");
  const type = meta.contentType ?? "";
  if (!type.startsWith(`${kind}/`)) throw new ConvexError(`That file isn't a ${kind === "image" ? "photo" : "video"}.`);
  const max = kind === "video" ? LIMITS.videoBytes : LIMITS.imageBytes;
  if (meta.size > max) throw new ConvexError(`That file is too big (max ${Math.round(max / 1024 / 1024)} MB).`);
}

export function cleanText(text: string | undefined, max: number, what: string): string | undefined {
  const trimmed = text?.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > max) throw new ConvexError(`${what} can be up to ${max} characters.`);
  return trimmed;
}
