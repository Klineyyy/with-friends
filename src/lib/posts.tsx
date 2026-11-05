import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from "react";

import { useAuth } from "./auth";
import {
  ME_ID,
  mockFollowGraph,
  mockFollowing,
  mockPosts,
  mockUsers,
  type MockComment,
  type MockPost,
  type MockUser,
} from "./mock-data";

/**
 * Posts, people, follows and uploads for the UI phases.
 *
 * TEMPORARY: everything here is in-memory sample data from `mock-data.ts` and
 * resets on reload. In Phase 9 these hooks keep their shape but read from
 * Convex queries and call Convex mutations (see implementation.md).
 */

export type User = MockUser;
export type Post = MockPost;
export type Comment = MockComment;

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

type State = {
  posts: Post[];
  following: string[];
  /** TEMPORARY: your edits, in memory until Convex owns the profile. `null` = not edited yet. */
  profile: ProfileEdits | null;
  uploads: Upload[];
  /** People you blocked (scope §5 `blocks`). Hidden both ways. */
  blocked: string[];
};

type Action =
  | { type: "toggleLike"; postId: string; liked: boolean }
  | { type: "toggleFollow"; userId: string; following: boolean }
  | { type: "deletePost"; postId: string }
  | { type: "addComment"; postId: string; comment: Comment }
  | { type: "deleteComment"; postId: string; commentId: string }
  | { type: "uploadStart"; upload: Upload }
  | { type: "uploadProgress"; id: string; progress: number }
  | { type: "uploadFail"; id: string }
  | { type: "uploadDone"; id: string; post: Post }
  | { type: "clearFollowing" }
  | { type: "updateProfile"; profile: ProfileEdits }
  | { type: "block"; userId: string }
  | { type: "unblock"; userId: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "toggleLike":
      return {
        ...state,
        posts: state.posts.map((p) =>
          p.id !== action.postId
            ? p
            : {
                ...p,
                likedBy: action.liked
                  ? [ME_ID, ...p.likedBy.filter((id) => id !== ME_ID)]
                  : p.likedBy.filter((id) => id !== ME_ID),
              },
        ),
      };
    case "toggleFollow":
      return {
        ...state,
        following: action.following
          ? [...state.following.filter((id) => id !== action.userId), action.userId]
          : state.following.filter((id) => id !== action.userId),
      };
    case "deletePost":
      return { ...state, posts: state.posts.filter((p) => p.id !== action.postId) };
    case "addComment":
      return {
        ...state,
        posts: state.posts.map((p) =>
          p.id === action.postId ? { ...p, comments: [...p.comments, action.comment] } : p,
        ),
      };
    case "deleteComment":
      return {
        ...state,
        posts: state.posts.map((p) =>
          p.id === action.postId
            ? {
                ...p,
                // Only your own comment can go.
                comments: p.comments.filter((c) => c.id !== action.commentId || c.authorId !== ME_ID),
              }
            : p,
        ),
      };
    case "uploadStart":
      return {
        ...state,
        uploads: [action.upload, ...state.uploads.filter((u) => u.id !== action.upload.id)],
      };
    case "uploadProgress":
      return {
        ...state,
        uploads: state.uploads.map((u) =>
          u.id === action.id ? { ...u, progress: action.progress } : u,
        ),
      };
    case "uploadFail":
      return {
        ...state,
        uploads: state.uploads.map((u) => (u.id === action.id ? { ...u, status: "failed" } : u)),
      };
    case "uploadDone":
      return {
        ...state,
        uploads: state.uploads.filter((u) => u.id !== action.id),
        posts: [action.post, ...state.posts],
      };
    case "clearFollowing":
      return { ...state, following: [] };
    case "updateProfile":
      return { ...state, profile: action.profile };
    case "block":
      // Blocking also ends the follow (Phase 9: both directions, in the mutation).
      return {
        ...state,
        blocked: [...state.blocked.filter((id) => id !== action.userId), action.userId],
        following: state.following.filter((id) => id !== action.userId),
      };
    case "unblock":
      return { ...state, blocked: state.blocked.filter((id) => id !== action.userId) };
  }
}

function draftToPost({ id, draft }: Upload): Post {
  return {
    id: `p_${id}`,
    shortId: id.slice(-4),
    authorId: ME_ID,
    mediaType: draft.mediaType,
    mediaUri: draft.uri,
    // Made on device in the composer; missing on a dev build without expo-video.
    posterUri: draft.posterUri,
    width: draft.width,
    height: draft.height,
    durationMs: draft.durationMs,
    caption: draft.caption?.trim() || undefined,
    likedBy: [],
    comments: [],
    createdAt: Date.now(),
  };
}

type Store = {
  state: State;
  dispatch: (action: Action) => void;
  me: User;
  startUpload: (upload: Upload) => void;
};

const PostsContext = createContext<Store | null>(null);

export function PostsProvider({ children }: { children: ReactNode }) {
  const { account } = useAuth();
  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    posts: mockPosts,
    following: mockFollowing,
    profile: null,
    uploads: [],
    blocked: [],
  }));

  const me: User = useMemo(
    () => ({
      id: ME_ID,
      username: account?.username ?? "you",
      displayName: state.profile?.displayName ?? account?.displayName ?? "",
      avatarUri: account?.avatarUri ?? null,
      bio: state.profile?.bio,
    }),
    [account?.username, account?.displayName, account?.avatarUri, state.profile],
  );

  // Upload timers live here, not in a screen, so an upload keeps going after
  // the composer closes.
  const timers = useRef(new Map<string, ReturnType<typeof setInterval>>());
  useEffect(() => {
    const running = timers.current;
    return () => running.forEach((t) => clearInterval(t));
  }, []);

  /**
   * TEMPORARY: fakes an upload over ~2.5 s. About 1 in 5 attempts fails
   * partway, so the "Upload failed. Tap to retry." row can be seen. Phase 9
   * replaces this with a Convex upload URL + createPost mutation.
   */
  const startUpload = useCallback((upload: Upload) => {
    const running = timers.current;
    clearInterval(running.get(upload.id));
    dispatch({ type: "uploadStart", upload: { ...upload, progress: 0, status: "uploading" } });
    const willFail = Math.random() < 0.2;
    let progress = 0;
    const timer = setInterval(() => {
      progress = Math.min(1, progress + 0.04);
      if (willFail && progress >= 0.6) {
        clearInterval(timer);
        running.delete(upload.id);
        dispatch({ type: "uploadFail", id: upload.id });
        return;
      }
      if (progress >= 1) {
        clearInterval(timer);
        running.delete(upload.id);
        dispatch({ type: "uploadDone", id: upload.id, post: draftToPost(upload) });
        return;
      }
      dispatch({ type: "uploadProgress", id: upload.id, progress });
    }, 100);
    running.set(upload.id, timer);
  }, []);

  const store = useMemo(() => ({ state, dispatch, me, startUpload }), [state, me, startUpload]);
  return <PostsContext.Provider value={store}>{children}</PostsContext.Provider>;
}

function useStore(): Store {
  const store = useContext(PostsContext);
  if (!store) throw new Error("Posts hooks must be used inside <PostsProvider>");
  return store;
}

/** The signed-in user as a `User`. */
export function useMe(): User {
  return useStore().me;
}

/** Look up anyone (including you) by ID. */
export function useUsers() {
  const { me } = useStore();
  return useMemo(() => {
    const byId = new Map<string, User>(mockUsers.map((u) => [u.id, u]));
    byId.set(ME_ID, me);
    return (id: string): User =>
      byId.get(id) ?? { id, username: "deleted", displayName: "Deleted user", avatarUri: null };
  }, [me]);
}

/** Home feed: your posts and posts from people you follow, newest first. */
export function useFeed() {
  const { state } = useStore();
  return useMemo(() => {
    const visible = new Set([ME_ID, ...state.following.filter((id) => !state.blocked.includes(id))]);
    return state.posts
      .filter((p) => visible.has(p.authorId))
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [state.posts, state.following, state.blocked]);
}

/** One post, or `null` if it doesn't exist (deleted). */
export function usePost(id: string | undefined): Post | null {
  const { state } = useStore();
  return state.posts.find((p) => p.id === id) ?? null;
}

/** Look up posts by ID; `null` = deleted. For lists that show many posts (Activity). */
export function usePosts() {
  const { state } = useStore();
  return useMemo(() => {
    const byId = new Map(state.posts.map((p) => [p.id, p]));
    return (id: string | undefined): Post | null => (id ? (byId.get(id) ?? null) : null);
  }, [state.posts]);
}

export function useFollowing() {
  const { state, dispatch } = useStore();
  const following = state.following;
  return {
    count: following.length,
    isFollowing: (userId: string) => following.includes(userId),
    follow: (userId: string) => dispatch({ type: "toggleFollow", userId, following: true }),
    unfollow: (userId: string) => dispatch({ type: "toggleFollow", userId, following: false }),
    /** Dev only: empties the follow list so the empty Home (board 5) shows. */
    clearAll: () => dispatch({ type: "clearFollowing" }),
  };
}

/** Members you don't follow yet, for "People you may know". */
export function useSuggestedPeople(limit = 5): User[] {
  const { state } = useStore();
  return useMemo(
    () =>
      mockUsers
        .filter((u) => !state.following.includes(u.id) && !state.blocked.includes(u.id))
        .slice(0, limit),
    [state.following, state.blocked, limit],
  );
}

export function usePostActions() {
  const { dispatch } = useStore();
  return {
    setLiked: (postId: string, liked: boolean) => dispatch({ type: "toggleLike", postId, liked }),
    deletePost: (postId: string) => dispatch({ type: "deletePost", postId }),
    /** TEMPORARY in memory; a Convex mutation (optimistic) in Phase 9. Oldest first, so it lands at the end. */
    addComment: (postId: string, body: string) => {
      const text = body.trim().slice(0, COMMENT_MAX_LENGTH);
      if (!text) return;
      const id = `c_${Date.now().toString(36)}`;
      dispatch({ type: "addComment", postId, comment: { id, authorId: ME_ID, body: text, createdAt: Date.now() } });
    },
    /** Only your own comments (scope: delete own comments). */
    deleteComment: (postId: string, commentId: string) =>
      dispatch({ type: "deleteComment", postId, commentId }),
  };
}

/** Share a new post and watch its upload. */
export function useUploads() {
  const { state, startUpload } = useStore();
  return {
    uploads: state.uploads,
    share: (draft: PostDraft) =>
      startUpload({ id: Date.now().toString(36), draft, progress: 0, status: "uploading" }),
    retry: (upload: Upload) => startUpload(upload),
  };
}

const newestFirst = (a: Post, b: Post) => b.createdAt - a.createdAt;

/** Explore grid (board 10a): recent posts from everyone, newest first. */
export function useExplorePosts(): Post[] {
  const { state } = useStore();
  return useMemo(
    () => state.posts.filter((p) => !state.blocked.includes(p.authorId)).sort(newestFirst),
    [state.posts, state.blocked],
  );
}

/** One person's posts, newest first (profile grid, board 11a / 12). */
export function useUserPosts(userId: string): Post[] {
  const { state } = useStore();
  return useMemo(
    () => state.posts.filter((p) => p.authorId === userId).sort(newestFirst),
    [state.posts, userId],
  );
}

/** Whether a user ID belongs to a member (or you). Unknown IDs = deleted account. */
export function userExists(userId: string): boolean {
  return userId === ME_ID || mockUsers.some((u) => u.id === userId);
}

/**
 * Followers and following for anyone (board 13). Your own follows come from the
 * store, so tapping Follow anywhere updates every list and count.
 */
export function useFollowLists(userId: string): { followers: User[]; following: User[] } {
  const { state } = useStore();
  const userById = useUsers();
  return useMemo(() => {
    const followerIds = mockUsers
      .filter((u) => mockFollowGraph[u.id]?.includes(userId))
      .map((u) => u.id);
    if (userId !== ME_ID && state.following.includes(userId)) followerIds.unshift(ME_ID);
    const followingIds = userId === ME_ID ? state.following : (mockFollowGraph[userId] ?? []);
    const shown = (id: string) => !state.blocked.includes(id);
    return {
      followers: followerIds.filter(shown).map(userById),
      following: followingIds.filter(shown).map(userById),
    };
  }, [state.following, state.blocked, userId, userById]);
}

/** People search (board 10b): username or display name contains the query. You're left out. */
export function useSearchPeople(query: string): User[] {
  const { state } = useStore();
  return useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^@/, "");
    if (!q) return [];
    return mockUsers.filter(
      (u) =>
        !state.blocked.includes(u.id) &&
        (u.username.includes(q) || u.displayName.toLowerCase().includes(q)),
    );
  }, [query, state.blocked]);
}

/** Edit profile: display name and bio. TEMPORARY in memory; a Convex mutation in Phase 9. */
export function useUpdateProfile() {
  const { dispatch } = useStore();
  return (profile: ProfileEdits) => dispatch({ type: "updateProfile", profile });
}

/**
 * Blocking (scope §5, §8): someone you block is hidden from your feed, Explore,
 * search, comments, messages and activity, and can't message you. TEMPORARY in
 * memory; Convex `blocks` + permission checks in Phase 9.
 */
export function useBlocks() {
  const { state, dispatch } = useStore();
  const blocked = state.blocked;
  return {
    blockedIds: blocked,
    isBlocked: useCallback((userId: string) => blocked.includes(userId), [blocked]),
    block: (userId: string) => dispatch({ type: "block", userId }),
    unblock: (userId: string) => dispatch({ type: "unblock", userId }),
  };
}

/** A post's comments without those from people you blocked. */
export function useVisibleComments(post: Post): Comment[] {
  const { isBlocked } = useBlocks();
  return useMemo(() => post.comments.filter((c) => !isBlocked(c.authorId)), [post.comments, isBlocked]);
}
