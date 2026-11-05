/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

/** A signed-in, onboarded member. */
async function member(t: ReturnType<typeof convexTest>, username: string) {
  const as = t.withIdentity({ subject: `clerk_${username}`, name: username });
  await as.mutation(api.users.ensure, {});
  await as.mutation(api.users.completeOnboarding, { username });
  const me = await as.query(api.users.me, {});
  return { as, id: me!.id };
}

async function storeImage(t: ReturnType<typeof convexTest>): Promise<Id<"_storage">> {
  return await t.run((ctx) => ctx.storage.store(new Blob(["fake"], { type: "image/jpeg" })));
}

async function post(t: ReturnType<typeof convexTest>, as: Awaited<ReturnType<typeof member>>["as"]) {
  return await as.mutation(api.posts.create, {
    mediaType: "image",
    mediaStorageId: await storeImage(t),
    width: 1080,
    height: 1080,
    caption: "hi",
  });
}

describe("onboarding and usernames", () => {
  test("signed-out callers can't act", async () => {
    const t = convexTest(schema, modules);
    expect(await t.query(api.users.me, {})).toBeNull();
    await expect(t.mutation(api.users.ensure, {})).rejects.toThrow("Not signed in");
  });

  test("usernames are unique and validated", async () => {
    const t = convexTest(schema, modules);
    await member(t, "maya");
    const tom = t.withIdentity({ subject: "clerk_tom" });
    await tom.mutation(api.users.ensure, {});
    expect(await tom.query(api.users.usernameAvailable, { username: "maya" })).toBe(false);
    expect(await tom.query(api.users.usernameAvailable, { username: "tom" })).toBe(true);
    expect(await tom.query(api.users.usernameAvailable, { username: "No Spaces" })).toBe(false);
    await expect(tom.mutation(api.users.completeOnboarding, { username: "maya" })).rejects.toThrow("taken");
    await expect(tom.mutation(api.users.completeOnboarding, { username: "ab" })).rejects.toThrow();
    await tom.mutation(api.users.completeOnboarding, { username: "tom" });
    expect((await tom.query(api.users.me, {}))?.onboarded).toBe(true);
  });

  test("usernames keep their case but are unique ignoring case", async () => {
    const t = convexTest(schema, modules);
    const { as: kline } = await member(t, "Kline");
    expect((await kline.query(api.users.me, {}))?.username).toBe("Kline");
    const other = t.withIdentity({ subject: "clerk_other" });
    await other.mutation(api.users.ensure, {});
    expect(await other.query(api.users.usernameAvailable, { username: "kline" })).toBe(false);
    expect(await other.query(api.users.usernameAvailable, { username: "KLINE" })).toBe(false);
    await expect(other.mutation(api.users.completeOnboarding, { username: "kLiNe" })).rejects.toThrow("taken");
    // Your own name in another case is fine (e.g. fixing "kline" to "Kline").
    expect(await kline.query(api.users.usernameAvailable, { username: "kline" })).toBe(true);
  });

  test("you can't post before onboarding", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity({ subject: "clerk_new" });
    await as.mutation(api.users.ensure, {});
    await expect(post(t, as)).rejects.toThrow("Finish setting up");
  });
});

describe("posts, likes, comments", () => {
  test("only the owner can delete a post or comment", async () => {
    const t = convexTest(schema, modules);
    const maya = await member(t, "maya");
    const tom = await member(t, "tom");
    const postId = await post(t, maya.as);
    await expect(tom.as.mutation(api.posts.remove, { postId })).rejects.toThrow("your own posts");

    const commentId = await tom.as.mutation(api.social.addComment, { postId, body: "nice" });
    await expect(maya.as.mutation(api.social.deleteComment, { commentId })).rejects.toThrow("your own comments");
    await tom.as.mutation(api.social.deleteComment, { commentId });
    expect((await maya.as.query(api.posts.get, { postId }))?.commentCount).toBe(0);

    await maya.as.mutation(api.posts.remove, { postId });
    expect(await maya.as.query(api.posts.get, { postId })).toBeNull();
    expect((await maya.as.query(api.users.me, {}))?.postCount).toBe(0);
  });

  test("likes are counted once and notify the author", async () => {
    const t = convexTest(schema, modules);
    const maya = await member(t, "maya");
    const tom = await member(t, "tom");
    const postId = await post(t, maya.as);
    await tom.as.mutation(api.social.setLiked, { postId, liked: true });
    await tom.as.mutation(api.social.setLiked, { postId, liked: true });
    const seen = await maya.as.query(api.posts.get, { postId });
    expect(seen?.likeCount).toBe(1);
    expect(seen?.firstLikerUsername).toBe("tom");
    expect(await maya.as.query(api.activity.unread, {})).toMatchObject({ activity: true });
    await tom.as.mutation(api.social.setLiked, { postId, liked: false });
    expect((await maya.as.query(api.posts.get, { postId }))?.likeCount).toBe(0);
    expect(await maya.as.query(api.activity.list, {})).toHaveLength(0);
  });

  test("feed shows people you follow, newest first", async () => {
    const t = convexTest(schema, modules);
    const maya = await member(t, "maya");
    const tom = await member(t, "tom");
    await post(t, tom.as);
    expect(await maya.as.query(api.posts.feed, {})).toHaveLength(0);
    await maya.as.mutation(api.social.setFollowing, { userId: tom.id, following: true });
    expect(await maya.as.query(api.posts.feed, {})).toHaveLength(1);
    expect((await tom.as.query(api.users.me, {}))?.followerCount).toBe(1);
  });
});

describe("blocks", () => {
  test("blocking hides both ways, ends follows, and stops messages", async () => {
    const t = convexTest(schema, modules);
    const maya = await member(t, "maya");
    const tom = await member(t, "tom");
    await maya.as.mutation(api.social.setFollowing, { userId: tom.id, following: true });
    await tom.as.mutation(api.social.setFollowing, { userId: maya.id, following: true });
    const postId = await post(t, tom.as);

    await maya.as.mutation(api.social.block, { userId: tom.id });

    expect((await maya.as.query(api.users.me, {}))?.followingCount).toBe(0);
    expect((await maya.as.query(api.users.me, {}))?.followerCount).toBe(0);
    expect(await maya.as.query(api.posts.explore, {})).toHaveLength(0);
    expect(await maya.as.query(api.users.search, { query: "tom" })).toHaveLength(0);
    expect(await tom.as.query(api.users.search, { query: "maya" })).toHaveLength(0);
    // To tom, maya looks gone.
    expect(await tom.as.query(api.users.profile, { userId: maya.id })).toBeNull();
    await expect(
      tom.as.mutation(api.messages.send, { userId: maya.id, message: { kind: "text", body: "hey" } }),
    ).rejects.toThrow("can't message");
    await expect(tom.as.mutation(api.social.setFollowing, { userId: maya.id, following: true })).rejects.toThrow();
    await expect(maya.as.mutation(api.social.setLiked, { postId, liked: true })).rejects.toThrow();

    await maya.as.mutation(api.social.unblock, { userId: tom.id });
    expect(await maya.as.query(api.posts.explore, {})).toHaveLength(1);
  });
});

describe("messages", () => {
  test("send, unread, read receipt", async () => {
    const t = convexTest(schema, modules);
    const maya = await member(t, "maya");
    const tom = await member(t, "tom");
    await maya.as.mutation(api.messages.send, { userId: tom.id, message: { kind: "text", body: "Hi tom" } });
    expect(await tom.as.query(api.activity.unread, {})).toMatchObject({ messages: true });
    const [conversation] = await tom.as.query(api.messages.conversations, {});
    expect(conversation).toMatchObject({ preview: "Hi tom", unread: true, userId: maya.id });
    await tom.as.mutation(api.messages.markRead, { userId: maya.id });
    expect(await tom.as.query(api.activity.unread, {})).toMatchObject({ messages: false });
    const thread = await maya.as.query(api.messages.thread, { userId: tom.id });
    expect(thread.theirLastReadAt).toBeGreaterThanOrEqual(thread.messages[0].createdAt);
  });
});

describe("account deletion", () => {
  test("removes posts, likes, comments, follows; keeps messages", async () => {
    const t = convexTest(schema, modules);
    const maya = await member(t, "maya");
    const tom = await member(t, "tom");
    const mayaPost = await post(t, maya.as);
    const tomPost = await post(t, tom.as);
    await tom.as.mutation(api.social.setFollowing, { userId: maya.id, following: true });
    await tom.as.mutation(api.social.setLiked, { postId: tomPost, liked: true });
    await tom.as.mutation(api.social.setLiked, { postId: mayaPost, liked: true });
    await tom.as.mutation(api.social.addComment, { postId: mayaPost, body: "nice" });
    await maya.as.mutation(api.social.setLiked, { postId: tomPost, liked: true });
    await maya.as.mutation(api.social.addComment, { postId: tomPost, body: "hello" });
    await maya.as.mutation(api.messages.send, { userId: tom.id, message: { kind: "text", body: "bye" } });

    await maya.as.mutation(api.users.deleteMe, {});
    await t.finishAllScheduledFunctions(() => {});

    expect(await maya.as.query(api.users.me, {})).toBeNull();
    expect(await tom.as.query(api.posts.get, { postId: mayaPost })).toBeNull();
    const tomsPost = await tom.as.query(api.posts.get, { postId: tomPost });
    expect(tomsPost).toMatchObject({ likeCount: 1, commentCount: 0 });
    expect((await tom.as.query(api.users.me, {}))?.followingCount).toBe(0);
    const counts = await t.run(async (ctx) => ({
      users: (await ctx.db.query("users").collect()).length,
      likes: (await ctx.db.query("likes").collect()).length,
      comments: (await ctx.db.query("comments").collect()).length,
      messages: (await ctx.db.query("messages").collect()).length,
      notifications: (await ctx.db.query("notifications").collect()).length,
    }));
    expect(counts).toEqual({ users: 1, likes: 1, comments: 0, messages: 1, notifications: 0 });
    // The message stays, from a "Deleted user".
    const [conversation] = await tom.as.query(api.messages.conversations, {});
    expect(conversation.user).toBeNull();
  });
});
