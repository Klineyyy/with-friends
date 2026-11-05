import { ConvexError, v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type QueryCtx } from "./_generated/server";
import {
  checkUpload,
  cleanText,
  getLiveUser,
  getMe,
  hiddenUserIds,
  isBlockedEitherWay,
  LIMITS,
  requireMember,
  toUserView,
  userView,
} from "./lib/helpers";

/**
 * One-to-one messages (board 14a–15). A conversation is keyed by the sorted
 * pair of user IDs; the app addresses a thread by the other person's ID.
 */

function pair(a: Id<"users">, b: Id<"users">): { userAId: Id<"users">; userBId: Id<"users"> } {
  return a < b ? { userAId: a, userBId: b } : { userAId: b, userBId: a };
}

async function findConversation(ctx: QueryCtx, me: Id<"users">, other: Id<"users">) {
  const { userAId, userBId } = pair(me, other);
  return await ctx.db
    .query("conversations")
    .withIndex("by_userAId_and_userBId", (q) => q.eq("userAId", userAId).eq("userBId", userBId))
    .unique();
}

const side = (c: Doc<"conversations">, me: Id<"users">) => (c.userAId === me ? "a" : "b");
const otherSide = (c: Doc<"conversations">, me: Id<"users">) => (c.userAId === me ? "b" : "a");

const conversationView = v.object({
  /** The other person; `null` = deleted account ("Deleted user"). */
  user: v.union(userView, v.null()),
  userId: v.id("users"),
  preview: v.string(),
  lastMessageAt: v.number(),
  unread: v.boolean(),
});

/** Conversation list, most recent first (board 14a). Blocked people are left out. */
export const conversations = query({
  args: {},
  returns: v.array(conversationView),
  handler: async (ctx) => {
    const me = await getMe(ctx);
    if (!me) return [];
    const [asA, asB, hidden] = await Promise.all([
      ctx.db.query("conversations").withIndex("by_userAId_and_lastMessageAt", (q) => q.eq("userAId", me._id)).order("desc").take(100),
      ctx.db.query("conversations").withIndex("by_userBId_and_lastMessageAt", (q) => q.eq("userBId", me._id)).order("desc").take(100),
      hiddenUserIds(ctx, me._id),
    ]);
    const all = [...asA, ...asB].sort((x, y) => y.lastMessageAt - x.lastMessageAt);
    const out = [];
    for (const c of all) {
      const otherId = c.userAId === me._id ? c.userBId : c.userAId;
      if (hidden.has(otherId)) continue;
      const other = await getLiveUser(ctx, otherId);
      const mine = c.lastMessageSenderId === me._id;
      const preview =
        c.lastMessageKind === "image"
          ? mine ? "You sent a photo" : "Sent a photo"
          : c.lastMessageKind === "post"
            ? mine ? "You shared a post" : "Shared a post"
            : mine ? `You: ${c.lastMessagePreview}` : c.lastMessagePreview;
      out.push({
        user: other ? await toUserView(ctx, other) : null,
        userId: otherId,
        preview,
        lastMessageAt: c.lastMessageAt,
        unread: !mine && c.lastMessageAt > c.lastReadAt[side(c, me._id)],
      });
    }
    return out;
  },
});

const messageView = v.object({
  id: v.id("messages"),
  senderId: v.id("users"),
  kind: v.union(v.literal("text"), v.literal("image"), v.literal("post")),
  body: v.optional(v.string()),
  imageUri: v.optional(v.string()),
  width: v.optional(v.number()),
  height: v.optional(v.number()),
  postId: v.optional(v.id("posts")),
  createdAt: v.number(),
});

const THREAD_SIZE = 200;

/** One thread with someone (board 15), oldest first. Empty until the first message. */
export const thread = query({
  args: { userId: v.string() },
  returns: v.object({
    messages: v.array(messageView),
    theirLastReadAt: v.number(),
    /** I blocked them, or they blocked me: no composer. */
    blocked: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const empty = { messages: [], theirLastReadAt: 0, blocked: false };
    const me = await getMe(ctx);
    const otherId = ctx.db.normalizeId("users", args.userId);
    if (!me || !otherId) return empty;
    const blocked = await isBlockedEitherWay(ctx, me._id, otherId);
    const c = await findConversation(ctx, me._id, otherId);
    if (!c) return { ...empty, blocked };
    const rows = await ctx.db
      .query("messages")
      .withIndex("by_conversationId_and_createdAt", (q) => q.eq("conversationId", c._id))
      .order("desc")
      .take(THREAD_SIZE);
    rows.reverse();
    const messages = await Promise.all(
      rows.map(async (m) => ({
        id: m._id,
        senderId: m.senderId,
        kind: m.kind,
        body: m.body,
        imageUri: m.storageId ? ((await ctx.storage.getUrl(m.storageId)) ?? undefined) : undefined,
        width: m.width,
        height: m.height,
        postId: m.postId,
        createdAt: m.createdAt,
      })),
    );
    return { messages, theirLastReadAt: c.lastReadAt[otherSide(c, me._id)], blocked };
  },
});

export const send = mutation({
  args: {
    userId: v.id("users"),
    message: v.union(
      v.object({ kind: v.literal("text"), body: v.string() }),
      v.object({ kind: v.literal("image"), storageId: v.id("_storage"), width: v.number(), height: v.number() }),
      v.object({ kind: v.literal("post"), postId: v.id("posts") }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, { userId, message }) => {
    const me = await requireMember(ctx);
    if (userId === me._id) throw new ConvexError("You can't message yourself.");
    const other = await getLiveUser(ctx, userId);
    if (!other || !other.onboarded) throw new ConvexError("This account isn't here anymore.");
    if (await isBlockedEitherWay(ctx, me._id, userId)) throw new ConvexError("You can't message this account.");

    const now = Date.now();
    let fields: Partial<Doc<"messages">> & { kind: Doc<"messages">["kind"] };
    let preview = "";
    if (message.kind === "text") {
      const body = cleanText(message.body, LIMITS.message, "Messages");
      if (!body) throw new ConvexError("Write something first.");
      fields = { kind: "text", body };
      preview = body.replace(/\s+/g, " ").slice(0, 120);
    } else if (message.kind === "image") {
      await checkUpload(ctx, message.storageId, "image");
      fields = { kind: "image", storageId: message.storageId, width: message.width, height: message.height };
    } else {
      if (!(await ctx.db.get("posts", message.postId))) throw new ConvexError("This post was deleted.");
      fields = { kind: "post", postId: message.postId };
    }

    let c = await findConversation(ctx, me._id, userId);
    if (!c) {
      const id = await ctx.db.insert("conversations", {
        ...pair(me._id, userId),
        lastMessageAt: now,
        lastMessagePreview: preview,
        lastMessageSenderId: me._id,
        lastMessageKind: fields.kind,
        lastReadAt: { a: 0, b: 0 },
      });
      c = (await ctx.db.get("conversations", id))!;
    }
    await ctx.db.insert("messages", { conversationId: c._id, senderId: me._id, createdAt: now, ...fields });
    await ctx.db.patch("conversations", c._id, {
      lastMessageAt: now,
      lastMessagePreview: preview,
      lastMessageSenderId: me._id,
      lastMessageKind: fields.kind,
      // Sending means you've read everything before it.
      lastReadAt: { ...c.lastReadAt, [side(c, me._id)]: now },
    });
    return null;
  },
});

/** Opening a thread marks it read, which shows "Seen" on their side. */
export const markRead = mutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, { userId }) => {
    const me = await requireMember(ctx);
    const c = await findConversation(ctx, me._id, userId);
    if (!c) return null;
    const s = side(c, me._id);
    if (c.lastReadAt[s] >= c.lastMessageAt) return null;
    await ctx.db.patch("conversations", c._id, { lastReadAt: { ...c.lastReadAt, [s]: Date.now() } });
    return null;
  },
});
