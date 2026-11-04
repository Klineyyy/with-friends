import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from "react";

import { useAuth } from "./auth";
import {
  ME_ID,
  mockFollowing,
  mockPosts,
  mockUnread,
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

type State = {
  posts: Post[];
  following: string[];
  uploads: Upload[];
  unread: { activity: boolean; messages: boolean };
};

type Action =
  | { type: "toggleLike"; postId: string; liked: boolean }
  | { type: "toggleFollow"; userId: string; following: boolean }
  | { type: "deletePost"; postId: string }
  | { type: "uploadStart"; upload: Upload }
  | { type: "uploadProgress"; id: string; progress: number }
  | { type: "uploadFail"; id: string }
  | { type: "uploadDone"; id: string; post: Post }
  | { type: "clearFollowing" };

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
    uploads: [],
    unread: mockUnread,
  }));

  const me: User = useMemo(
    () => ({
      id: ME_ID,
      username: account?.username ?? "you",
      displayName: account?.displayName ?? "",
      avatarUri: account?.avatarUri ?? null,
    }),
    [account?.username, account?.displayName, account?.avatarUri],
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
    const visible = new Set([ME_ID, ...state.following]);
    return state.posts
      .filter((p) => visible.has(p.authorId))
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [state.posts, state.following]);
}

/** One post, or `null` if it doesn't exist (deleted). */
export function usePost(id: string | undefined): Post | null {
  const { state } = useStore();
  return state.posts.find((p) => p.id === id) ?? null;
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
    () => mockUsers.filter((u) => !state.following.includes(u.id)).slice(0, limit),
    [state.following, limit],
  );
}

export function usePostActions() {
  const { dispatch } = useStore();
  return {
    setLiked: (postId: string, liked: boolean) => dispatch({ type: "toggleLike", postId, liked }),
    deletePost: (postId: string) => dispatch({ type: "deletePost", postId }),
  };
}

export function useUnread() {
  return useStore().state.unread;
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
