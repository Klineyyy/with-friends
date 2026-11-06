import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { internalMutation, mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import {
  cleanText,
  checkUpload,
  getFollow,
  getLiveUser,
  getMe,
  hiddenUserIds,
  LIMITS,
  requireMe,
  requireMember,
  toUserView,
  userView,
} from "./lib/helpers";
import { notificationPrefs } from "./schema";

const DEFAULT_PREFS = { likes: true, comments: true, follows: true, messages: true };

/** Username rules (scope §5). Mirrors `src/lib/username.ts`. */
function usernameError(username: string): string | null {
  if (username.length < 3) return "Use at least 3 characters.";
  if (username.length > 30) return "Use 30 characters or fewer.";
  if (!/^[A-Za-z0-9_.]+$/.test(username)) return "Use letters, numbers, periods, and underscores.";
  return null;
}

/**
 * Who has this username, ignoring case. Accounts made before usernames kept
 * their case have no `usernameKey`, but their `username` is already lowercase.
 */
async function usernameOwner(ctx: QueryCtx, username: string) {
  const key = username.toLowerCase();
  return (
    (await ctx.db.query("users").withIndex("by_usernameKey", (q) => q.eq("usernameKey", key)).first()) ??
    (await ctx.db.query("users").withIndex("by_username", (q) => q.eq("username", key)).first())
  );
}

const meView = v.object({
  ...userView.fields,
  onboarded: v.boolean(),
  followerCount: v.number(),
  followingCount: v.number(),
  postCount: v.number(),
  notificationPrefs,
});

/**
 * The signed-in user, or `null` if signed out or the row doesn't exist yet
 * (the app then calls `ensure`).
 */
export const me = query({
  args: {},
  returns: v.union(meView, v.null()),
  handler: async (ctx) => {
    const me = await getMe(ctx);
    if (!me) return null;
    return {
      ...(await toUserView(ctx, me)),
      onboarded: me.onboarded,
      followerCount: me.followerCount,
      followingCount: me.followingCount,
      postCount: me.postCount,
      notificationPrefs: me.notificationPrefs,
    };
  },
});

/** Creates or refreshes a user row from Clerk details. Shared by `ensure` and the webhook. */
export async function upsertFromClerk(
  ctx: MutationCtx,
  clerk: { clerkId: string; name?: string; imageUrl?: string },
): Promise<Doc<"users">> {
  const existing = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", clerk.clerkId))
    .unique();
  if (existing) {
    const patch: Partial<Doc<"users">> = {};
    if (clerk.imageUrl && clerk.imageUrl !== existing.clerkImageUrl) patch.clerkImageUrl = clerk.imageUrl;
    // Before onboarding the name still follows Clerk; after that it's theirs to
    // edit (unless it was never filled in).
    if ((!existing.onboarded || !existing.displayName) && clerk.name && clerk.name !== existing.displayName) {
      patch.displayName = clerk.name.slice(0, LIMITS.displayName);
    }
    if (Object.keys(patch).length) await ctx.db.patch("users", existing._id, patch);
    return { ...existing, ...patch };
  }
  const id = await ctx.db.insert("users", {
    clerkId: clerk.clerkId,
    displayName: clerk.name?.slice(0, LIMITS.displayName) ?? "",
    clerkImageUrl: clerk.imageUrl,
    onboarded: false,
    notificationPrefs: DEFAULT_PREFS,
    followerCount: 0,
    followingCount: 0,
    postCount: 0,
  });
  return (await ctx.db.get("users", id))!;
}

/** Clerk serves profile photos (incl. the Google / Apple one) from here. */
const CLERK_IMAGE_HOST = "https://img.clerk.com/";

/**
 * Called by the app right after sign-in, so a user row exists without waiting
 * for the webhook, and again each session to refresh the Clerk name and photo.
 * Clerk's Convex token carries no name or picture, so the app passes them
 * (from the signed-in Clerk user). Only Clerk-hosted photo URLs are accepted.
 */
export const ensure = mutation({
  args: { name: v.optional(v.string()), imageUrl: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not signed in");
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (existing?.deletingAt) throw new ConvexError("This account is being deleted.");
    const imageUrl = identity.pictureUrl ?? args.imageUrl;
    await upsertFromClerk(ctx, {
      clerkId: identity.subject,
      name: identity.name ?? (args.name?.trim() || undefined),
      imageUrl: imageUrl?.startsWith(CLERK_IMAGE_HOST) ? imageUrl : undefined,
    });
    return null;
  },
});

/** Live "✓ jamie is available" during onboarding (board 3). Your own name counts as available. */
export const usernameAvailable = query({
  args: { username: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const username = args.username.trim();
    if (usernameError(username)) return false;
    const me = await getMe(ctx);
    const taken = await usernameOwner(ctx, username);
    return !taken || taken._id === me?._id;
  },
});

/** Onboarding (board 3): username, optional new photo, terms accepted. */
export const completeOnboarding = mutation({
  args: { username: v.string(), avatarStorageId: v.optional(v.id("_storage")) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const username = args.username.trim();
    const error = usernameError(username);
    if (error) throw new ConvexError(error);
    const taken = await usernameOwner(ctx, username);
    if (taken && taken._id !== me._id) throw new ConvexError(`${username} is taken.`);
    if (args.avatarStorageId) await checkUpload(ctx, args.avatarStorageId, "image");
    const oldAvatar = me.avatarStorageId;
    await ctx.db.patch("users", me._id, {
      username,
      usernameKey: username.toLowerCase(),
      onboarded: true,
      termsAcceptedAt: me.termsAcceptedAt ?? Date.now(),
      ...(args.avatarStorageId ? { avatarStorageId: args.avatarStorageId } : {}),
    });
    if (args.avatarStorageId && oldAvatar && oldAvatar !== args.avatarStorageId) {
      await ctx.storage.delete(oldAvatar);
    }
    return null;
  },
});

/** Edit profile: a new photo, already uploaded. Replaces (and deletes) the old upload. */
export const setAvatar = mutation({
  args: { avatarStorageId: v.id("_storage") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const me = await requireMember(ctx);
    await checkUpload(ctx, args.avatarStorageId, "image");
    const oldAvatar = me.avatarStorageId;
    await ctx.db.patch("users", me._id, { avatarStorageId: args.avatarStorageId });
    if (oldAvatar && oldAvatar !== args.avatarStorageId) await ctx.storage.delete(oldAvatar);
    return null;
  },
});

/** Edit profile: display name and bio. */
export const updateProfile = mutation({
  args: { displayName: v.string(), bio: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const me = await requireMember(ctx);
    const displayName = cleanText(args.displayName, LIMITS.displayName, "Name");
    if (!displayName) throw new ConvexError("Add a name.");
    await ctx.db.patch("users", me._id, {
      displayName,
      bio: cleanText(args.bio, LIMITS.bio, "Bio"),
    });
    return null;
  },
});

/** Board 18: which pushes your phone gets. */
export const setNotificationPref = mutation({
  args: {
    key: v.union(v.literal("likes"), v.literal("comments"), v.literal("follows"), v.literal("messages")),
    on: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, { key, on }) => {
    const me = await requireMe(ctx);
    await ctx.db.patch("users", me._id, { notificationPrefs: { ...me.notificationPrefs, [key]: on } });
    return null;
  },
});

const profileView = v.object({
  user: userView,
  followerCount: v.number(),
  followingCount: v.number(),
  postCount: v.number(),
  isMe: v.boolean(),
  isFollowing: v.boolean(),
  /** I blocked them. */
  blockedByMe: v.boolean(),
});

/**
 * Someone's profile (board 12). `null` = deleted account, or they blocked
 * you (it looks the same to you, scope §8). If you blocked them, you still
 * get the profile so you can unblock.
 */
export const profile = query({
  args: { userId: v.string() },
  returns: v.union(profileView, v.null()),
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const userId = ctx.db.normalizeId("users", args.userId);
    if (!userId) return null;
    const user = await getLiveUser(ctx, userId);
    if (!user || !user.onboarded) return null;
    const [blockedByMe, blockedMe, follow] = await Promise.all([
      ctx.db
        .query("blocks")
        .withIndex("by_blockerId_and_blockedId", (q) => q.eq("blockerId", me._id).eq("blockedId", userId))
        .unique(),
      ctx.db
        .query("blocks")
        .withIndex("by_blockerId_and_blockedId", (q) => q.eq("blockerId", userId).eq("blockedId", me._id))
        .unique(),
      getFollow(ctx, me._id, userId),
    ]);
    if (blockedMe) return null;
    return {
      user: await toUserView(ctx, user),
      followerCount: user.followerCount,
      followingCount: user.followingCount,
      postCount: user.postCount,
      isMe: user._id === me._id,
      isFollowing: !!follow,
      blockedByMe: !!blockedByMe,
    };
  },
});

const MEMBERS_CAP = 200;

/** Every member except you and anyone hidden by a block. Fine at ~10 users; a search index later. */
async function visibleMembers(ctx: QueryCtx, meId: Doc<"users">["_id"]) {
  const [members, hidden] = await Promise.all([
    ctx.db
      .query("users")
      .withIndex("by_onboarded", (q) => q.eq("onboarded", true))
      .take(MEMBERS_CAP),
    hiddenUserIds(ctx, meId),
  ]);
  return members.filter((u) => u._id !== meId && !u.deletingAt && !hidden.has(u._id));
}

const personView = v.object({ ...userView.fields, isFollowing: v.boolean() });

async function withFollowing(ctx: QueryCtx, meId: Doc<"users">["_id"], users: Doc<"users">[]) {
  return await Promise.all(
    users.map(async (u) => ({
      ...(await toUserView(ctx, u)),
      isFollowing: !!(await getFollow(ctx, meId, u._id)),
    })),
  );
}

/** Members list: empty Messages (14b), New message. Alphabetical by display name. */
export const members = query({
  args: {},
  returns: v.array(personView),
  handler: async (ctx) => {
    const me = await getMe(ctx);
    if (!me) return [];
    const users = await visibleMembers(ctx, me._id);
    users.sort((a, b) => a.displayName.localeCompare(b.displayName));
    return await withFollowing(ctx, me._id, users);
  },
});

/** "People you may know" (Home empty state): members you don't follow yet. */
export const suggested = query({
  args: { limit: v.number() },
  returns: v.array(personView),
  handler: async (ctx, { limit }) => {
    const me = await getMe(ctx);
    if (!me) return [];
    const users = await visibleMembers(ctx, me._id);
    const notFollowed = [];
    for (const u of users) {
      if (notFollowed.length >= limit) break;
      if (!(await getFollow(ctx, me._id, u._id))) notFollowed.push(u);
    }
    return await withFollowing(ctx, me._id, notFollowed);
  },
});

/** People search (board 10b): username or display name contains the query. */
export const search = query({
  args: { query: v.string() },
  returns: v.array(personView),
  handler: async (ctx, args) => {
    const me = await getMe(ctx);
    const q = args.query.trim().toLowerCase().replace(/^@/, "");
    if (!me || !q) return [];
    const users = (await visibleMembers(ctx, me._id)).filter(
      (u) => (u.username ?? "").toLowerCase().includes(q) || u.displayName.toLowerCase().includes(q),
    );
    return await withFollowing(ctx, me._id, users.slice(0, 50));
  },
});

/**
 * Board 21. Hides the account at once and starts the batched cascade
 * (`account.ts`). The app then deletes the Clerk user; the webhook's
 * `user.deleted` finds the work already started.
 */
export const deleteMe = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    await ctx.db.patch("users", me._id, { deletingAt: Date.now() });
    await ctx.scheduler.runAfter(0, internal.account.deleteUserData, { userId: me._id, stage: "posts" });
    return null;
  },
});

/** Webhook `user.created` / `user.updated`. */
export const upsertFromWebhook = internalMutation({
  args: { clerkId: v.string(), name: v.optional(v.string()), imageUrl: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    await upsertFromClerk(ctx, args);
    return null;
  },
});

/** Webhook `user.deleted`. */
export const deleteFromWebhook = internalMutation({
  args: { clerkId: v.string() },
  returns: v.null(),
  handler: async (ctx, { clerkId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .unique();
    if (!user || user.deletingAt) return null;
    await ctx.db.patch("users", user._id, { deletingAt: Date.now() });
    await ctx.scheduler.runAfter(0, internal.account.deleteUserData, { userId: user._id, stage: "posts" });
    return null;
  },
});

/**
 * Everyone the app may need to show by ID: you and every member, except
 * people who blocked you (to you they look deleted). People you blocked stay,
 * so their profile can offer Unblock. Fine at ~10 users (scope §1).
 */
export const directory = query({
  args: {},
  returns: v.array(userView),
  handler: async (ctx) => {
    const me = await getMe(ctx);
    if (!me) return [];
    const [members, blockedMe] = await Promise.all([
      ctx.db
        .query("users")
        .withIndex("by_onboarded", (q) => q.eq("onboarded", true))
        .take(MEMBERS_CAP),
      ctx.db
        .query("blocks")
        .withIndex("by_blockedId", (q) => q.eq("blockedId", me._id))
        .take(500),
    ]);
    const hidden = new Set(blockedMe.map((b) => b.blockerId));
    const visible = members.filter((u) => !u.deletingAt && !hidden.has(u._id));
    if (!visible.some((u) => u._id === me._id)) visible.push(me);
    return await Promise.all(visible.map((u) => toUserView(ctx, u)));
  },
});
