import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, mutation, query, type MutationCtx } from "./_generated/server";
import {
  adjustCount,
  checkUpload,
  cleanText,
  getLiveUser,
  getMe,
  hiddenUserIds,
  LIMITS,
  postView,
  requireMe,
  requireMember,
  toPostView,
  userViewById,
  userView,
} from "./lib/helpers";

/** Upload URL for any file the app sends: post media, posters, avatars, photo messages. */
export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await requireMe(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

const FEED_SIZE = 50;
const PER_AUTHOR = 20;

/**
 * Home feed: your posts and posts from people you follow, newest first.
 * Computed on read from the follow list (scope A9; fine at ~10 users).
 */
export const feed = query({
  args: {},
  returns: v.array(postView),
  handler: async (ctx) => {
    const me = await getMe(ctx);
    if (!me) return [];
    const [follows, hidden] = await Promise.all([
      ctx.db
        .query("follows")
        .withIndex("by_followerId_and_followeeId", (q) => q.eq("followerId", me._id))
        .take(500),
      hiddenUserIds(ctx, me._id),
    ]);
    const authorIds = [me._id, ...follows.map((f) => f.followeeId).filter((id) => !hidden.has(id))];
    const perAuthor = await Promise.all(
      authorIds.map((authorId) =>
        ctx.db
          .query("posts")
          .withIndex("by_authorId_and_createdAt", (q) => q.eq("authorId", authorId))
          .order("desc")
          .take(PER_AUTHOR),
      ),
    );
    const posts = perAuthor
      .flat()
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, FEED_SIZE);
    return await Promise.all(posts.map((p) => toPostView(ctx, p, me._id)));
  },
});

/** Explore grid (board 10a): recent posts from everyone, newest first. */
export const explore = query({
  args: {},
  returns: v.array(postView),
  handler: async (ctx) => {
    const me = await getMe(ctx);
    if (!me) return [];
    const [recent, hidden] = await Promise.all([
      ctx.db.query("posts").withIndex("by_createdAt").order("desc").take(90),
      hiddenUserIds(ctx, me._id),
    ]);
    const visible = recent.filter((p) => !hidden.has(p.authorId));
    return await Promise.all(visible.map((p) => toPostView(ctx, p, me._id)));
  },
});

/** One person's posts, newest first (profile grid). Empty if hidden by a block. */
export const byUser = query({
  args: { userId: v.string() },
  returns: v.array(postView),
  handler: async (ctx, args) => {
    const me = await getMe(ctx);
    const userId = ctx.db.normalizeId("users", args.userId);
    if (!me || !userId) return [];
    if (userId !== me._id && (await hiddenUserIds(ctx, me._id)).has(userId)) return [];
    const posts = await ctx.db
      .query("posts")
      .withIndex("by_authorId_and_createdAt", (q) => q.eq("authorId", userId))
      .order("desc")
      .take(120);
    return await Promise.all(posts.map((p) => toPostView(ctx, p, me._id)));
  },
});

/** One post; `null` = deleted (board 20 "This post was deleted."). */
export const get = query({
  args: { postId: v.string() },
  returns: v.union(postView, v.null()),
  handler: async (ctx, args) => {
    const me = await getMe(ctx);
    const postId = ctx.db.normalizeId("posts", args.postId);
    if (!me || !postId) return null;
    const post = await ctx.db.get("posts", postId);
    if (!post || !(await getLiveUser(ctx, post.authorId))) return null;
    return await toPostView(ctx, post, me._id);
  },
});

/** Called after the file (and poster) are stored. The post isn't created until then (scope §8). */
export const create = mutation({
  args: {
    mediaType: v.union(v.literal("image"), v.literal("video")),
    mediaStorageId: v.id("_storage"),
    posterStorageId: v.optional(v.id("_storage")),
    width: v.number(),
    height: v.number(),
    durationMs: v.optional(v.number()),
    caption: v.optional(v.string()),
  },
  returns: v.id("posts"),
  handler: async (ctx, args) => {
    const me = await requireMember(ctx);
    await checkUpload(ctx, args.mediaStorageId, args.mediaType);
    if (args.posterStorageId) await checkUpload(ctx, args.posterStorageId, "image");
    if (args.mediaType === "video") {
      if (args.durationMs === undefined) throw new ConvexError("Missing video length.");
      // A little slack: camera apps round up.
      if (args.durationMs > LIMITS.videoMs + 500) throw new ConvexError("Videos can be up to 30 seconds.");
    }
    if (!(args.width > 0 && args.height > 0)) throw new ConvexError("Missing photo size.");
    const id = await ctx.db.insert("posts", {
      authorId: me._id,
      mediaType: args.mediaType,
      mediaStorageId: args.mediaStorageId,
      posterStorageId: args.posterStorageId,
      width: args.width,
      height: args.height,
      durationMs: args.mediaType === "video" ? args.durationMs : undefined,
      caption: cleanText(args.caption, LIMITS.caption, "Caption"),
      likeCount: 0,
      commentCount: 0,
      createdAt: Date.now(),
    });
    await adjustCount(ctx, me._id, "postCount", 1);
    return id;
  },
});

/** Captions can be edited later; media can't (scope §3). */
export const updateCaption = mutation({
  args: { postId: v.id("posts"), caption: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const me = await requireMember(ctx);
    const post = await ctx.db.get("posts", args.postId);
    if (!post || post.authorId !== me._id) throw new ConvexError("You can only edit your own posts.");
    await ctx.db.patch("posts", post._id, { caption: cleanText(args.caption, LIMITS.caption, "Caption") });
    return null;
  },
});

/** Owner-only. Removes the post now; its likes, comments, notifications and files go in batches. */
export const remove = mutation({
  args: { postId: v.id("posts") },
  returns: v.null(),
  handler: async (ctx, { postId }) => {
    const me = await requireMe(ctx);
    const post = await ctx.db.get("posts", postId);
    if (!post) return null;
    if (post.authorId !== me._id) throw new ConvexError("You can only delete your own posts.");
    await deletePostNow(ctx, post);
    return null;
  },
});

/** Deletes the post doc and schedules the cleanup. Shared with account deletion. */
export async function deletePostNow(ctx: MutationCtx, post: Doc<"posts">) {
  await ctx.db.delete("posts", post._id);
  await adjustCount(ctx, post.authorId, "postCount", -1);
  await ctx.storage.delete(post.mediaStorageId);
  if (post.posterStorageId) await ctx.storage.delete(post.posterStorageId);
  await ctx.scheduler.runAfter(0, internal.posts.cleanupDeletedPost, { postId: post._id });
}

const CLEANUP_BATCH = 200;

/** Batched: likes, comments and notifications of a deleted post. Reschedules itself until done. */
export const cleanupDeletedPost = internalMutation({
  args: { postId: v.id("posts") },
  returns: v.null(),
  handler: async (ctx, { postId }) => {
    let left = CLEANUP_BATCH;
    for (const table of ["likes", "comments", "notifications"] as const) {
      const rows =
        table === "likes"
          ? await ctx.db.query("likes").withIndex("by_postId_and_userId", (q) => q.eq("postId", postId)).take(left)
          : table === "comments"
            ? await ctx.db.query("comments").withIndex("by_postId_and_createdAt", (q) => q.eq("postId", postId)).take(left)
            : await ctx.db.query("notifications").withIndex("by_postId", (q) => q.eq("postId", postId)).take(left);
      for (const row of rows) await ctx.db.delete(table, row._id as Id<typeof table>);
      left -= rows.length;
      if (left <= 0) {
        await ctx.scheduler.runAfter(0, internal.posts.cleanupDeletedPost, { postId });
        return null;
      }
    }
    return null;
  },
});

/** "Liked by…" list (board 9). People hidden by a block are left out. */
export const likers = query({
  args: { postId: v.id("posts") },
  returns: v.array(userView),
  handler: async (ctx, { postId }) => {
    const me = await getMe(ctx);
    if (!me) return [];
    const [likes, hidden] = await Promise.all([
      ctx.db.query("likes").withIndex("by_postId_and_userId", (q) => q.eq("postId", postId)).take(200),
      hiddenUserIds(ctx, me._id),
    ]);
    const users = await Promise.all(
      likes.filter((l) => !hidden.has(l.userId)).map((l) => userViewById(ctx, l.userId)),
    );
    return users.filter((u) => u !== null);
  },
});
