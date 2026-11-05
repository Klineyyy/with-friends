import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { getLiveUser, getMe, hiddenUserIds, requireMe, toUserView, userView } from "./lib/helpers";

/** Activity (board 16a) and the two fern dots (Home heart, Messages tab). */

const activityView = v.object({
  id: v.id("notifications"),
  actorId: v.id("users"),
  actor: userView,
  type: v.union(v.literal("like"), v.literal("comment"), v.literal("follow")),
  /** Thumbnail target; `null` when the post is gone. */
  post: v.union(
    v.object({
      id: v.id("posts"),
      mediaType: v.union(v.literal("image"), v.literal("video")),
      thumbUri: v.union(v.string(), v.null()),
    }),
    v.null(),
  ),
  /** Comment text, for "commented: “…”". */
  body: v.optional(v.string()),
  read: v.boolean(),
  createdAt: v.number(),
});

/** Your activity, newest first. People hidden by a block and deleted accounts are left out. */
export const list = query({
  args: {},
  returns: v.array(activityView),
  handler: async (ctx) => {
    const me = await getMe(ctx);
    if (!me) return [];
    const [rows, hidden] = await Promise.all([
      ctx.db
        .query("notifications")
        .withIndex("by_recipientId_and_createdAt", (q) => q.eq("recipientId", me._id))
        .order("desc")
        .take(150),
      hiddenUserIds(ctx, me._id),
    ]);
    const out = [];
    for (const n of rows) {
      if (n.type === "message" || hidden.has(n.actorId)) continue;
      const actor = await getLiveUser(ctx, n.actorId);
      if (!actor) continue;
      const post = n.postId ? await ctx.db.get("posts", n.postId) : null;
      if (n.postId && !post) continue; // deleted post: cleanup is on its way
      const comment = n.commentId ? await ctx.db.get("comments", n.commentId) : null;
      out.push({
        id: n._id,
        actorId: n.actorId,
        actor: await toUserView(ctx, actor),
        type: n.type,
        post: post
          ? {
              id: post._id,
              mediaType: post.mediaType,
              thumbUri: await ctx.storage.getUrl(post.posterStorageId ?? post.mediaStorageId),
            }
          : null,
        body: comment?.body,
        read: n.read,
        createdAt: n.createdAt,
      });
    }
    return out;
  },
});

/** Opening Activity clears the Home heart dot. */
export const markAllRead = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_recipientId_and_read", (q) => q.eq("recipientId", me._id).eq("read", false))
      .take(500);
    for (const n of unread) await ctx.db.patch("notifications", n._id, { read: true });
    return null;
  },
});

/** Fern dots: unread activity (Home heart) and unread messages (Messages tab). */
export const unread = query({
  args: {},
  returns: v.object({ activity: v.boolean(), messages: v.boolean() }),
  handler: async (ctx) => {
    const me = await getMe(ctx);
    if (!me) return { activity: false, messages: false };
    const hidden = await hiddenUserIds(ctx, me._id);
    const unreadRows = await ctx.db
      .query("notifications")
      .withIndex("by_recipientId_and_read", (q) => q.eq("recipientId", me._id).eq("read", false))
      .take(50);
    const activity = unreadRows.some((n) => n.type !== "message" && !hidden.has(n.actorId));
    const [asA, asB] = await Promise.all([
      ctx.db.query("conversations").withIndex("by_userAId_and_lastMessageAt", (q) => q.eq("userAId", me._id)).order("desc").take(50),
      ctx.db.query("conversations").withIndex("by_userBId_and_lastMessageAt", (q) => q.eq("userBId", me._id)).order("desc").take(50),
    ]);
    const messages = [...asA, ...asB].some((c) => {
      const otherId = c.userAId === me._id ? c.userBId : c.userAId;
      const myRead = c.userAId === me._id ? c.lastReadAt.a : c.lastReadAt.b;
      return !hidden.has(otherId) && c.lastMessageSenderId !== me._id && c.lastMessageAt > myRead;
    });
    return { activity, messages };
  },
});
