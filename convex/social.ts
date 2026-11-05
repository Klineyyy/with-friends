import { ConvexError, v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import {
  adjustCount,
  cleanText,
  getFollow,
  getLiveUser,
  getMe,
  hiddenUserIds,
  isBlockedEitherWay,
  LIMITS,
  removeFollow,
  requireMember,
  toUserView,
  userView,
} from "./lib/helpers";

/**
 * Likes, comments, follows and blocks. Each write keeps the stored counts in
 * step and writes the Activity row (`notifications`) in the same transaction.
 * Push for these rows is Phase 10.
 */

async function notify(
  ctx: MutationCtx,
  n: { recipientId: Id<"users">; actorId: Id<"users">; type: "like" | "comment" | "follow"; postId?: Id<"posts">; commentId?: Id<"comments"> },
) {
  if (n.recipientId === n.actorId) return;
  await ctx.db.insert("notifications", { ...n, read: false, createdAt: Date.now() });
}

/** Removes the Activity row for an undone like or follow. */
async function unnotify(
  ctx: MutationCtx,
  n: { recipientId: Id<"users">; actorId: Id<"users">; type: "like" | "follow"; postId?: Id<"posts"> },
) {
  const rows = await ctx.db
    .query("notifications")
    .withIndex("by_actorId", (q) => q.eq("actorId", n.actorId))
    .order("desc")
    .take(200);
  for (const row of rows) {
    if (row.recipientId === n.recipientId && row.type === n.type && row.postId === n.postId) {
      await ctx.db.delete("notifications", row._id);
    }
  }
}

async function getVisiblePost(ctx: MutationCtx, postId: Id<"posts">, meId: Id<"users">) {
  const post = await ctx.db.get("posts", postId);
  if (!post || !(await getLiveUser(ctx, post.authorId))) throw new ConvexError("This post was deleted.");
  if (post.authorId !== meId && (await isBlockedEitherWay(ctx, meId, post.authorId))) {
    throw new ConvexError("You can't interact with this post.");
  }
  return post;
}

// ─── Likes ───────────────────────────────────────────────────────────────────

export const setLiked = mutation({
  args: { postId: v.id("posts"), liked: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { postId, liked }) => {
    const me = await requireMember(ctx);
    const post = await getVisiblePost(ctx, postId, me._id);
    const existing = await ctx.db
      .query("likes")
      .withIndex("by_postId_and_userId", (q) => q.eq("postId", postId).eq("userId", me._id))
      .unique();
    if (liked && !existing) {
      await ctx.db.insert("likes", { postId, userId: me._id });
      await ctx.db.patch("posts", postId, { likeCount: post.likeCount + 1 });
      await notify(ctx, { recipientId: post.authorId, actorId: me._id, type: "like", postId });
    } else if (!liked && existing) {
      await ctx.db.delete("likes", existing._id);
      await ctx.db.patch("posts", postId, { likeCount: Math.max(0, post.likeCount - 1) });
      await unnotify(ctx, { recipientId: post.authorId, actorId: me._id, type: "like", postId });
    }
    return null;
  },
});

// ─── Comments ────────────────────────────────────────────────────────────────

const commentView = v.object({
  id: v.id("comments"),
  authorId: v.id("users"),
  author: v.union(userView, v.null()),
  body: v.string(),
  createdAt: v.number(),
});

/** A post's comments, oldest first, without people hidden by a block. */
export const comments = query({
  args: { postId: v.string() },
  returns: v.array(commentView),
  handler: async (ctx, args) => {
    const me = await getMe(ctx);
    const postId = ctx.db.normalizeId("posts", args.postId);
    if (!me || !postId) return [];
    const [rows, hidden] = await Promise.all([
      ctx.db
        .query("comments")
        .withIndex("by_postId_and_createdAt", (q) => q.eq("postId", postId))
        .take(500),
      hiddenUserIds(ctx, me._id),
    ]);
    const out = [];
    for (const c of rows) {
      if (hidden.has(c.authorId)) continue;
      const author = await getLiveUser(ctx, c.authorId);
      if (!author) continue;
      out.push({ id: c._id, authorId: c.authorId, author: await toUserView(ctx, author), body: c.body, createdAt: c.createdAt });
    }
    return out;
  },
});

export const addComment = mutation({
  args: { postId: v.id("posts"), body: v.string() },
  returns: v.id("comments"),
  handler: async (ctx, args) => {
    const me = await requireMember(ctx);
    const post = await getVisiblePost(ctx, args.postId, me._id);
    const body = cleanText(args.body, LIMITS.comment, "Comments");
    if (!body) throw new ConvexError("Write something first.");
    const id = await ctx.db.insert("comments", { postId: post._id, authorId: me._id, body, createdAt: Date.now() });
    await ctx.db.patch("posts", post._id, { commentCount: post.commentCount + 1 });
    await notify(ctx, { recipientId: post.authorId, actorId: me._id, type: "comment", postId: post._id, commentId: id });
    return id;
  },
});

/** Owner-only (scope: delete own comments). */
export const deleteComment = mutation({
  args: { commentId: v.id("comments") },
  returns: v.null(),
  handler: async (ctx, { commentId }) => {
    const me = await requireMember(ctx);
    const comment = await ctx.db.get("comments", commentId);
    if (!comment) return null;
    if (comment.authorId !== me._id) throw new ConvexError("You can only delete your own comments.");
    await deleteCommentNow(ctx, comment._id);
    return null;
  },
});

/** Deletes a comment, its Activity row, and fixes the post's count. Shared with account deletion. */
export async function deleteCommentNow(ctx: MutationCtx, commentId: Id<"comments">) {
  const comment = await ctx.db.get("comments", commentId);
  if (!comment) return;
  await ctx.db.delete("comments", commentId);
  const post = await ctx.db.get("posts", comment.postId);
  if (post) {
    await ctx.db.patch("posts", post._id, { commentCount: Math.max(0, post.commentCount - 1) });
    const rows = await ctx.db
      .query("notifications")
      .withIndex("by_postId", (q) => q.eq("postId", post._id))
      .take(500);
    for (const row of rows) if (row.commentId === commentId) await ctx.db.delete("notifications", row._id);
  }
}

// ─── Follows ─────────────────────────────────────────────────────────────────

export const setFollowing = mutation({
  args: { userId: v.id("users"), following: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { userId, following }) => {
    const me = await requireMember(ctx);
    if (userId === me._id) throw new ConvexError("You can't follow yourself.");
    if (!following) {
      if (await getFollow(ctx, me._id, userId)) {
        await removeFollow(ctx, me._id, userId);
        await unnotify(ctx, { recipientId: userId, actorId: me._id, type: "follow" });
      }
      return null;
    }
    const them = await getLiveUser(ctx, userId);
    if (!them || !them.onboarded) throw new ConvexError("This account isn't here anymore.");
    if (await isBlockedEitherWay(ctx, me._id, userId)) throw new ConvexError("You can't follow this account.");
    if (await getFollow(ctx, me._id, userId)) return null;
    await ctx.db.insert("follows", { followerId: me._id, followeeId: userId });
    await adjustCount(ctx, me._id, "followingCount", 1);
    await adjustCount(ctx, userId, "followerCount", 1);
    await notify(ctx, { recipientId: userId, actorId: me._id, type: "follow" });
    return null;
  },
});

/** Dev only (Settings): unfollow everyone, to see the empty Home. */
export const unfollowAll = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const me = await requireMember(ctx);
    const follows = await ctx.db
      .query("follows")
      .withIndex("by_followerId_and_followeeId", (q) => q.eq("followerId", me._id))
      .take(500);
    for (const f of follows) await removeFollow(ctx, me._id, f.followeeId);
    return null;
  },
});

const personView = v.object({ ...userView.fields, isFollowing: v.boolean() });

/** Followers and following for anyone (board 13), without people hidden by a block. */
export const followLists = query({
  args: { userId: v.string() },
  returns: v.object({ followers: v.array(personView), following: v.array(personView) }),
  handler: async (ctx, args) => {
    const me = await getMe(ctx);
    const userId = ctx.db.normalizeId("users", args.userId);
    if (!me || !userId) return { followers: [], following: [] };
    const hidden = await hiddenUserIds(ctx, me._id);
    if (hidden.has(userId)) return { followers: [], following: [] };
    const [followerRows, followingRows] = await Promise.all([
      ctx.db.query("follows").withIndex("by_followeeId", (q) => q.eq("followeeId", userId)).take(500),
      ctx.db
        .query("follows")
        .withIndex("by_followerId_and_followeeId", (q) => q.eq("followerId", userId))
        .take(500),
    ]);
    const toPeople = async (ids: Id<"users">[]) => {
      const out = [];
      for (const id of ids) {
        if (hidden.has(id)) continue;
        const user = await getLiveUser(ctx, id);
        if (!user) continue;
        out.push({ ...(await toUserView(ctx, user)), isFollowing: !!(await getFollow(ctx, me._id, id)) });
      }
      return out;
    };
    return {
      followers: await toPeople(followerRows.map((f) => f.followerId)),
      following: await toPeople(followingRows.map((f) => f.followeeId)),
    };
  },
});

// ─── Blocks ──────────────────────────────────────────────────────────────────

/** Block hides both ways, ends follows both ways, and stops DMs (scope §3, §8). */
export const block = mutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, { userId }) => {
    const me = await requireMember(ctx);
    if (userId === me._id) throw new ConvexError("You can't block yourself.");
    const existing = await ctx.db
      .query("blocks")
      .withIndex("by_blockerId_and_blockedId", (q) => q.eq("blockerId", me._id).eq("blockedId", userId))
      .unique();
    if (existing) return null;
    await ctx.db.insert("blocks", { blockerId: me._id, blockedId: userId });
    await removeFollow(ctx, me._id, userId);
    await removeFollow(ctx, userId, me._id);
    return null;
  },
});

export const unblock = mutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, { userId }) => {
    const me = await requireMember(ctx);
    const existing = await ctx.db
      .query("blocks")
      .withIndex("by_blockerId_and_blockedId", (q) => q.eq("blockerId", me._id).eq("blockedId", userId))
      .unique();
    if (existing) await ctx.db.delete("blocks", existing._id);
    return null;
  },
});

/** People you blocked (Blocked users screen). */
export const blocked = query({
  args: {},
  returns: v.array(userView),
  handler: async (ctx) => {
    const me = await getMe(ctx);
    if (!me) return [];
    const rows = await ctx.db
      .query("blocks")
      .withIndex("by_blockerId_and_blockedId", (q) => q.eq("blockerId", me._id))
      .take(500);
    const out = [];
    for (const row of rows) {
      const user = await getLiveUser(ctx, row.blockedId);
      if (user) out.push(await toUserView(ctx, user));
    }
    return out;
  },
});

/** Who you follow and who you blocked, as IDs. Drives every Follow / Following button. */
export const myGraph = query({
  args: {},
  returns: v.object({ following: v.array(v.id("users")), blocked: v.array(v.id("users")) }),
  handler: async (ctx) => {
    const me = await getMe(ctx);
    if (!me) return { following: [], blocked: [] };
    const [follows, blocks] = await Promise.all([
      ctx.db
        .query("follows")
        .withIndex("by_followerId_and_followeeId", (q) => q.eq("followerId", me._id))
        .take(500),
      ctx.db
        .query("blocks")
        .withIndex("by_blockerId_and_blockedId", (q) => q.eq("blockerId", me._id))
        .take(500),
    ]);
    return { following: follows.map((f) => f.followeeId), blocked: blocks.map((b) => b.blockedId) };
  },
});
