import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalMutation, type MutationCtx } from "./_generated/server";
import { removeFollow } from "./lib/helpers";
import { deletePostNow } from "./posts";
import { deleteCommentNow } from "./social";

/**
 * Account deletion cascade (scope §6), started by `users.deleteMe` or the
 * Clerk `user.deleted` webhook. Runs in stages, a batch per transaction, and
 * reschedules itself until each stage is empty. Messages stay; the app shows
 * a missing sender as "Deleted user".
 */

const stages = [
  "posts",
  "likes",
  "comments",
  "followsOut",
  "followsIn",
  "notifications",
  "blocks",
  "pushTokens",
  "user",
] as const;
type Stage = (typeof stages)[number];

const BATCH = 50;

/** Runs one batch of a stage. Returns true when the stage has nothing left. */
async function runStage(ctx: MutationCtx, userId: Id<"users">, stage: Stage): Promise<boolean> {
  switch (stage) {
    case "posts": {
      const rows = await ctx.db
        .query("posts")
        .withIndex("by_authorId_and_createdAt", (q) => q.eq("authorId", userId))
        .take(BATCH);
      for (const post of rows) await deletePostNow(ctx, post);
      return rows.length < BATCH;
    }
    case "likes": {
      const rows = await ctx.db.query("likes").withIndex("by_userId", (q) => q.eq("userId", userId)).take(BATCH);
      for (const like of rows) {
        await ctx.db.delete("likes", like._id);
        const post = await ctx.db.get("posts", like.postId);
        if (post) await ctx.db.patch("posts", post._id, { likeCount: Math.max(0, post.likeCount - 1) });
      }
      return rows.length < BATCH;
    }
    case "comments": {
      const rows = await ctx.db.query("comments").withIndex("by_authorId", (q) => q.eq("authorId", userId)).take(BATCH);
      for (const c of rows) await deleteCommentNow(ctx, c._id);
      return rows.length < BATCH;
    }
    case "followsOut": {
      const rows = await ctx.db
        .query("follows")
        .withIndex("by_followerId_and_followeeId", (q) => q.eq("followerId", userId))
        .take(BATCH);
      for (const f of rows) await removeFollow(ctx, f.followerId, f.followeeId);
      return rows.length < BATCH;
    }
    case "followsIn": {
      const rows = await ctx.db.query("follows").withIndex("by_followeeId", (q) => q.eq("followeeId", userId)).take(BATCH);
      for (const f of rows) await removeFollow(ctx, f.followerId, f.followeeId);
      return rows.length < BATCH;
    }
    case "notifications": {
      const [received, sent] = await Promise.all([
        ctx.db.query("notifications").withIndex("by_recipientId_and_createdAt", (q) => q.eq("recipientId", userId)).take(BATCH),
        ctx.db.query("notifications").withIndex("by_actorId", (q) => q.eq("actorId", userId)).take(BATCH),
      ]);
      for (const n of [...received, ...sent]) await ctx.db.delete("notifications", n._id);
      return received.length < BATCH && sent.length < BATCH;
    }
    case "blocks": {
      const [mine, theirs] = await Promise.all([
        ctx.db.query("blocks").withIndex("by_blockerId_and_blockedId", (q) => q.eq("blockerId", userId)).take(BATCH),
        ctx.db.query("blocks").withIndex("by_blockedId", (q) => q.eq("blockedId", userId)).take(BATCH),
      ]);
      for (const b of [...mine, ...theirs]) await ctx.db.delete("blocks", b._id);
      return mine.length < BATCH && theirs.length < BATCH;
    }
    case "pushTokens": {
      const rows = await ctx.db.query("pushTokens").withIndex("by_userId", (q) => q.eq("userId", userId)).take(BATCH);
      for (const t of rows) await ctx.db.delete("pushTokens", t._id);
      return rows.length < BATCH;
    }
    case "user": {
      const user = await ctx.db.get("users", userId);
      if (user) {
        if (user.avatarStorageId) await ctx.storage.delete(user.avatarStorageId);
        await ctx.db.delete("users", userId);
      }
      return true;
    }
  }
}

export const deleteUserData = internalMutation({
  args: {
    userId: v.id("users"),
    stage: v.union(...stages.map((s) => v.literal(s))),
  },
  returns: v.null(),
  handler: async (ctx, { userId, stage }) => {
    const done = await runStage(ctx, userId, stage);
    const next = done ? stages[stages.indexOf(stage) + 1] : stage;
    if (next) await ctx.scheduler.runAfter(0, internal.account.deleteUserData, { userId, stage: next });
    return null;
  },
});
