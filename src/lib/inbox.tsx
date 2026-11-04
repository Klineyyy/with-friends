import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from "react";

import {
  ME_ID,
  mockActivity,
  mockConversations,
  mockUsers,
  type MockActivity,
  type MockConversation,
  type MockMessage,
} from "./mock-data";
import { useUsers, type User } from "./posts";

/**
 * Messages and Activity for the UI phases (board 14a–16b).
 *
 * TEMPORARY: in-memory sample data from `mock-data.ts`; resets on reload. In
 * Phase 9 these hooks keep their shape and read the Convex `conversations`,
 * `messages` and `notifications` tables (scope §5).
 */

export type Message = MockMessage;
export type Conversation = MockConversation;
export type ActivityItem = MockActivity;

/** What you can send in a thread. */
export type MessageDraft =
  | { kind: "text"; body: string }
  | { kind: "image"; imageUri: string; width: number; height: number }
  | { kind: "post"; postId: string };

/** Message length cap (scope A10). */
export const MESSAGE_MAX_LENGTH = 1000;

type State = { conversations: Conversation[]; activity: ActivityItem[] };

type Action =
  | { type: "send"; userId: string; message: Message }
  | { type: "markThreadRead"; userId: string; at: number }
  | { type: "theyRead"; userId: string; at: number }
  | { type: "markActivityRead" }
  | { type: "clearConversations" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "send": {
      const existing = state.conversations.find((c) => c.userId === action.userId);
      const conversation: Conversation = existing
        ? { ...existing, messages: [...existing.messages, action.message], lastReadAt: action.message.createdAt }
        : {
            userId: action.userId,
            messages: [action.message],
            lastReadAt: action.message.createdAt,
            theirLastReadAt: 0,
          };
      return {
        ...state,
        conversations: [conversation, ...state.conversations.filter((c) => c.userId !== action.userId)],
      };
    }
    case "markThreadRead":
      return {
        ...state,
        conversations: state.conversations.map((c) =>
          c.userId === action.userId && c.lastReadAt < action.at ? { ...c, lastReadAt: action.at } : c,
        ),
      };
    case "theyRead":
      return {
        ...state,
        conversations: state.conversations.map((c) =>
          c.userId === action.userId ? { ...c, theirLastReadAt: action.at } : c,
        ),
      };
    case "markActivityRead":
      return state.activity.some((a) => !a.read)
        ? { ...state, activity: state.activity.map((a) => (a.read ? a : { ...a, read: true })) }
        : state;
    case "clearConversations":
      return { ...state, conversations: [] };
  }
}

type Store = { state: State; dispatch: (action: Action) => void; send: (userId: string, draft: MessageDraft) => void };

const InboxContext = createContext<Store | null>(null);

export function InboxProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    conversations: mockConversations,
    activity: mockActivity,
  }));

  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  useEffect(() => {
    const running = timers.current;
    return () => running.forEach((t) => clearTimeout(t));
  }, []);

  const send = useCallback((userId: string, draft: MessageDraft) => {
    const createdAt = Date.now();
    const message: Message = { id: `m_${createdAt.toString(36)}`, senderId: ME_ID, createdAt, ...draft };
    dispatch({ type: "send", userId, message });
    // TEMPORARY: pretend they read it a moment later, so "Seen" can be tried out.
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      dispatch({ type: "theyRead", userId, at: Date.now() });
    }, 2500);
    timers.current.add(timer);
  }, []);

  const store = useMemo(() => ({ state, dispatch, send }), [state, send]);
  return <InboxContext.Provider value={store}>{children}</InboxContext.Provider>;
}

function useStore(): Store {
  const store = useContext(InboxContext);
  if (!store) throw new Error("Inbox hooks must be used inside <InboxProvider>");
  return store;
}

const lastOf = (c: Conversation): Message | undefined => c.messages[c.messages.length - 1];

function isUnread(c: Conversation): boolean {
  const last = lastOf(c);
  return !!last && last.senderId !== ME_ID && last.createdAt > c.lastReadAt;
}

/** One-line summary of a message for the conversation list (board 14a). */
function previewOf(m: Message): string {
  const mine = m.senderId === ME_ID;
  if (m.kind === "image") return mine ? "You sent a photo" : "Sent a photo";
  if (m.kind === "post") return mine ? "You shared a post" : "Shared a post";
  const body = (m.body ?? "").replace(/\s+/g, " ").trim();
  return mine ? `You: ${body}` : body;
}

export type ConversationSummary = {
  user: User;
  preview: string;
  lastMessageAt: number;
  unread: boolean;
};

/** Conversation list, most recent first (board 14a). */
export function useConversations(): ConversationSummary[] {
  const { state } = useStore();
  const userById = useUsers();
  return useMemo(
    () =>
      state.conversations
        .flatMap((c) => {
          const last = lastOf(c);
          if (!last) return [];
          return [{ user: userById(c.userId), preview: previewOf(last), lastMessageAt: last.createdAt, unread: isUnread(c) }];
        })
        .sort((a, b) => b.lastMessageAt - a.lastMessageAt),
    [state.conversations, userById],
  );
}

/** One thread with someone (board 15). Empty until the first message. */
export function useThread(userId: string) {
  const { state, dispatch, send } = useStore();
  const conversation = state.conversations.find((c) => c.userId === userId);
  return {
    messages: conversation?.messages ?? [],
    theirLastReadAt: conversation?.theirLastReadAt ?? 0,
    send: (draft: MessageDraft) => send(userId, draft),
    markRead: useCallback(() => dispatch({ type: "markThreadRead", userId, at: Date.now() }), [dispatch, userId]),
  };
}

/** Every member except you, for the empty Messages list (14b) and New message. */
export function useMembers(): User[] {
  return mockUsers;
}

/** Your activity, newest first (board 16a). */
export function useActivity() {
  const { state, dispatch } = useStore();
  const items = useMemo(() => [...state.activity].sort((a, b) => b.createdAt - a.createdAt), [state.activity]);
  return {
    items,
    markAllRead: useCallback(() => dispatch({ type: "markActivityRead" }), [dispatch]),
  };
}

/** Fern dots: the Home heart (activity) and the Messages tab. */
export function useUnread() {
  const { state } = useStore();
  return useMemo(
    () => ({
      activity: state.activity.some((a) => !a.read),
      messages: state.conversations.some(isUnread),
    }),
    [state],
  );
}

/** Dev only: empties Messages so board 14b shows. */
export function useClearConversations() {
  const { dispatch } = useStore();
  return () => dispatch({ type: "clearConversations" });
}
