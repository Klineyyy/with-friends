import { useMutation, useQuery } from "convex/react";
import type { OptimisticLocalStore } from "convex/browser";
import type { FunctionReturnType } from "convex/server";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

import { optimisticNow } from "./convex";
import { setMyId } from "./open-profile";
import { uploadFile } from "./upload";

/**
 * Posts, people, follows, blocks and uploads, backed by Convex (Phase 9).
 *
 * The provider keeps four small live queries that most screens need
 * synchronously: you (`users.me`), the member directory (`users.directory`,
 * ~10 people, scope §1), and your follow and block IDs (`social.myGraph`).
 * Lists (feed, explore, profiles, comments) are their own queries. Likes,
 * follows and comments update optimistically (scope §6).
 */

export type User = FunctionReturnType<typeof api.users.directory>[number];
export type Post = NonNullable<FunctionReturnType<typeof api.posts.get>>;
export type Comment = FunctionReturnType<typeof api.social.comments>[number];

/** Comment length limit (scope A10). */
export const COMMENT_MAX_LENGTH = 500;

/** What the composer hands over when you tap Share. */
export type PostDraft = {
  mediaType: "image" | "video";
  uri: string;
  width: number;
  height: number;
  /** Poster frame made on device for videos (scope A13). */
  posterUri?: string;
  durationMs?: number;
  caption?: string;
};

/** A post being shared. Shown as a row at the top of Home (board 6.3 / 6.4). */
export type Upload = {
  id: string;
  draft: PostDraft;
  progress: number;
  status: "uploading" | "failed";
};

/** Your editable profile fields (board: Edit profile). */
export type ProfileEdits = { displayName: string; bio: string };

type Store = {
  me: User | null;
  directory: Map<string, User>;
  following: Set<string>;
  blocked: Set<string>;
  ready: boolean;
  uploads: Upload[];
  startUpload: (upload: Upload) => void;
};

const PostsContext = createContext<Store | null>(null);

const DELETED: Omit<User, "id"> = { username: "deleted", displayName: "Deleted user", avatarUri: null };

export function PostsProvider({ children }: { children: ReactNode }) {
  const meDoc = useQuery(api.users.me);
  const signedIn = !!meDoc?.onboarded;
  const directoryList = useQuery(api.users.directory, signedIn ? {} : "skip");
  const graph = useQuery(api.social.myGraph, signedIn ? {} : "skip");
  const [uploads, setUploads] = useState<Upload[]>([]);
  const generateUploadUrl = useMutation(api.posts.generateUploadUrl);
  const createPost = useMutation(api.posts.create);

  const me: User | null = useMemo(
    () =>
      meDoc
        ? { id: meDoc.id, username: meDoc.username, displayName: meDoc.displayName, avatarUri: meDoc.avatarUri, bio: meDoc.bio }
        : null,
    [meDoc],
  );
  setMyId(me?.id ?? null);

  const directory = useMemo(() => {
    const map = new Map<string, User>((directoryList ?? []).map((u) => [u.id, u]));
    if (me) map.set(me.id, me);
    return map;
  }, [directoryList, me]);
  const following = useMemo(() => new Set<string>(graph?.following ?? []), [graph]);
  const blocked = useMemo(() => new Set<string>(graph?.blocked ?? []), [graph]);

  // Uploads live here, not in a screen, so an upload keeps going after the composer closes.
  const startUpload = useCallback(
    (upload: Upload) => {
      const patch = (fields: Partial<Upload>) =>
        setUploads((all) => all.map((u) => (u.id === upload.id ? { ...u, ...fields } : u)));
      setUploads((all) => [{ ...upload, progress: 0, status: "uploading" }, ...all.filter((u) => u.id !== upload.id)]);
      (async () => {
        const { draft } = upload;
        const mediaStorageId = (await uploadFile(await generateUploadUrl(), draft.uri, (f) =>
          patch({ progress: f * 0.9 }),
        )) as Id<"_storage">;
        const posterStorageId = draft.posterUri
          ? ((await uploadFile(await generateUploadUrl(), draft.posterUri)) as Id<"_storage">)
          : undefined;
        patch({ progress: 0.95 });
        await createPost({
          mediaType: draft.mediaType,
          mediaStorageId,
          posterStorageId,
          width: draft.width,
          height: draft.height,
          durationMs: draft.durationMs,
          caption: draft.caption,
        });
        setUploads((all) => all.filter((u) => u.id !== upload.id));
      })().catch((error) => {
        console.warn("Upload failed", error);
        patch({ status: "failed" });
      });
    },
    [generateUploadUrl, createPost],
  );

  const ready = !signedIn || (directoryList !== undefined && graph !== undefined);
  const store = useMemo(
    () => ({ me, directory, following, blocked, ready, uploads, startUpload }),
    [me, directory, following, blocked, ready, uploads, startUpload],
  );
  return <PostsContext.Provider value={store}>{children}</PostsContext.Provider>;
}

function useStore(): Store {
  const store = useContext(PostsContext);
  if (!store) throw new Error("Posts hooks must be used inside <PostsProvider>");
  return store;
}

/** False while the directory and your follows are still loading (the splash stays up). */
export function usePostsReady(): boolean {
  return useStore().ready;
}

/** The signed-in user as a `User`. Only use on signed-in screens. */
export function useMe(): User {
  const { me } = useStore();
  return me ?? { id: "" as Id<"users">, ...DELETED };
}

/** Look up anyone (including you) by ID. Unknown IDs = deleted account (or someone who blocked you). */
export function useUsers() {
  const { directory } = useStore();
  return useCallback((id: string): User => directory.get(id) ?? { id: id as Id<"users">, ...DELETED }, [directory]);
}

/** Whether a user ID belongs to a member (or you). */
export function useUserExists() {
  const { directory } = useStore();
  return useCallback((id: string) => directory.has(id), [directory]);
}

// ─── Optimistic helpers ──────────────────────────────────────────────────────

const POST_LISTS = [api.posts.feed, api.posts.explore, api.posts.byUser] as const;

/** Applies `change` to a post wherever it's cached: feed, explore, profile grids, single post. */
function patchPostEverywhere(store: OptimisticLocalStore, postId: string, change: (p: Post) => Post | null) {
  for (const ref of POST_LISTS) {
    for (const { args, value } of store.getAllQueries(ref)) {
      if (!value) continue;
      const next = value.flatMap((p) => (p.id === postId ? (change(p) ?? []) : [p]));
      store.setQuery(ref, args, next);
    }
  }
  for (const { args, value } of store.getAllQueries(api.posts.get)) {
    if (value && value.id === postId) store.setQuery(api.posts.get, args, change(value));
  }
}

function patchGraph(store: OptimisticLocalStore, change: (g: { following: Id<"users">[]; blocked: Id<"users">[] }) => typeof g) {
  const g = store.getQuery(api.social.myGraph, {});
  if (g) store.setQuery(api.social.myGraph, {}, change(g));
}

// ─── Posts ───────────────────────────────────────────────────────────────────

/** Home feed: your posts and posts from people you follow, newest first. `undefined` while loading. */
export function useFeed(): Post[] | undefined {
  return useQuery(api.posts.feed);
}

/** One post: `undefined` while loading, `null` if deleted. */
export function usePost(id: string | undefined): Post | null | undefined {
  const post = useQuery(api.posts.get, id ? { postId: id } : "skip");
  return id ? post : null;
}

export function useFollowing() {
  const { following } = useStore();
  const setFollowing = useMutation(api.social.setFollowing).withOptimisticUpdate((store, { userId, following: on }) =>
    patchGraph(store, (g) => ({
      ...g,
      following: on ? [...g.following.filter((id) => id !== userId), userId] : g.following.filter((id) => id !== userId),
    })),
  );
  const unfollowAll = useMutation(api.social.unfollowAll).withOptimisticUpdate((store) =>
    patchGraph(store, (g) => ({ ...g, following: [] })),
  );
  return {
    count: following.size,
    isFollowing: (userId: string) => following.has(userId),
    follow: (userId: string) => void setFollowing({ userId: userId as Id<"users">, following: true }).catch(warn),
    unfollow: (userId: string) => void setFollowing({ userId: userId as Id<"users">, following: false }).catch(warn),
    /** Dev only: empties the follow list so the empty Home (board 5) shows. */
    clearAll: () => void unfollowAll().catch(warn),
  };
}

/** Members you don't follow yet, for "People you may know". */
export function useSuggestedPeople(limit = 5): User[] {
  const { following } = useStore();
  const people = useQuery(api.users.suggested, { limit: limit + 5 });
  // Filter by the live follow set too, so a just-tapped Follow stays put until the query catches up.
  return useMemo(() => (people ?? []).filter((u) => !following.has(u.id)).slice(0, limit), [people, following, limit]);
}

export function usePostActions() {
  const me = useMe();
  const setLikedMutation = useMutation(api.social.setLiked).withOptimisticUpdate((store, { postId, liked }) =>
    patchPostEverywhere(store, postId, (p) =>
      p.likedByMe === liked
        ? p
        : {
            ...p,
            likedByMe: liked,
            likeCount: Math.max(0, p.likeCount + (liked ? 1 : -1)),
            firstLikerUsername: p.firstLikerUsername ?? (liked ? "you" : null),
          },
    ),
  );
  const removePost = useMutation(api.posts.remove).withOptimisticUpdate((store, { postId }) =>
    patchPostEverywhere(store, postId, () => null),
  );
  const addCommentMutation = useMutation(api.social.addComment).withOptimisticUpdate((store, { postId, body }) => {
    const existing = store.getQuery(api.social.comments, { postId });
    if (existing) {
      const now = optimisticNow();
      store.setQuery(api.social.comments, { postId }, [
        ...existing,
        { id: `optimistic_${now}` as Id<"comments">, authorId: me.id as Id<"users">, author: me as Comment["author"], body: body.trim(), createdAt: now },
      ]);
    }
    patchPostEverywhere(store, postId, (p) => ({ ...p, commentCount: p.commentCount + 1 }));
  });
  const deleteCommentMutation = useMutation(api.social.deleteComment);

  return {
    setLiked: (postId: string, liked: boolean) =>
      void setLikedMutation({ postId: postId as Id<"posts">, liked }).catch(warn),
    deletePost: (postId: string) => void removePost({ postId: postId as Id<"posts"> }).catch(warn),
    addComment: (postId: string, body: string) => {
      const text = body.trim().slice(0, COMMENT_MAX_LENGTH);
      if (!text) return;
      void addCommentMutation({ postId: postId as Id<"posts">, body: text }).catch(warn);
    },
    /** Only your own comments (the server checks too). */
    deleteComment: (postId: string, commentId: string) => {
      void deleteCommentMutation
        .withOptimisticUpdate((store) => {
          const existing = store.getQuery(api.social.comments, { postId });
          if (existing) store.setQuery(api.social.comments, { postId }, existing.filter((c) => c.id !== commentId));
          patchPostEverywhere(store, postId, (p) => ({ ...p, commentCount: Math.max(0, p.commentCount - 1) }));
        })({ commentId: commentId as Id<"comments"> })
        .catch(warn);
    },
  };
}

/** Share a new post and watch its upload. */
export function useUploads() {
  const { uploads, startUpload } = useStore();
  return {
    uploads,
    share: (draft: PostDraft) =>
      startUpload({ id: Date.now().toString(36), draft, progress: 0, status: "uploading" }),
    retry: (upload: Upload) => startUpload(upload),
  };
}

/** Explore grid (board 10a): recent posts from everyone, newest first. */
export function useExplorePosts(): Post[] | undefined {
  return useQuery(api.posts.explore);
}

/** One person's posts, newest first (profile grid, board 11a / 12). */
export function useUserPosts(userId: string): Post[] | undefined {
  return useQuery(api.posts.byUser, userId ? { userId } : "skip");
}

/**
 * Someone's profile with stored counts (board 11a / 12). `undefined` while
 * loading, `null` for a deleted account or someone who blocked you.
 */
export function useProfile(userId: string) {
  return useQuery(api.users.profile, userId ? { userId } : "skip");
}

/** Followers and following for anyone (board 13). */
export function useFollowLists(userId: string): { followers: User[]; following: User[] } | undefined {
  return useQuery(api.social.followLists, userId ? { userId } : "skip");
}

/** People search (board 10b): username or display name contains the query. You're left out. */
export function useSearchPeople(query: string): User[] {
  const q = query.trim();
  return useQuery(api.users.search, q ? { query: q } : "skip") ?? [];
}

/** A post's comments, oldest first, without people hidden by a block. */
export function useComments(postId: string): Comment[] | undefined {
  return useQuery(api.social.comments, { postId });
}

/** Edit profile: display name and bio. Resolves when saved; throws a ConvexError with a message. */
export function useUpdateProfile() {
  const update = useMutation(api.users.updateProfile);
  return (profile: ProfileEdits) => update(profile);
}

/**
 * Blocking (scope §5, §8): someone you block is hidden from your feed, Explore,
 * search, comments, messages and activity, and can't message you. The server
 * filters every list; `isBlocked` is for the profile and thread screens.
 */
export function useBlocks() {
  const { blocked } = useStore();
  const blockMutation = useMutation(api.social.block).withOptimisticUpdate((store, { userId }) =>
    patchGraph(store, (g) => ({
      following: g.following.filter((id) => id !== userId),
      blocked: [...g.blocked.filter((id) => id !== userId), userId],
    })),
  );
  const unblockMutation = useMutation(api.social.unblock).withOptimisticUpdate((store, { userId }) =>
    patchGraph(store, (g) => ({ ...g, blocked: g.blocked.filter((id) => id !== userId) })),
  );
  return {
    blockedIds: [...blocked],
    isBlocked: useCallback((userId: string) => blocked.has(userId), [blocked]),
    block: (userId: string) => void blockMutation({ userId: userId as Id<"users"> }).catch(warn),
    unblock: (userId: string) => void unblockMutation({ userId: userId as Id<"users"> }).catch(warn),
  };
}

function warn(error: unknown) {
  console.warn(error);
}
