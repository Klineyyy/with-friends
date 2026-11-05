import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useCallback } from "react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

import { optimisticNow } from "./convex";
import { useMe, useUsers, type User } from "./posts";
import { uploadFile } from "./upload";

/**
 * Messages and Activity (board 14a–16b), backed by Convex `conversations`,
 * `messages` and `notifications` (scope §5). All live: new messages, "Seen"
 * and activity arrive without polling.
 */

export type Message = FunctionReturnType<typeof api.messages.thread>["messages"][number];
export type ActivityItem = FunctionReturnType<typeof api.activity.list>[number];

/** What you can send in a thread. */
export type MessageDraft =
  | { kind: "text"; body: string }
  | { kind: "image"; imageUri: string; width: number; height: number }
  | { kind: "post"; postId: string };

/** Message length cap (scope A10). */
export const MESSAGE_MAX_LENGTH = 1000;

export type ConversationSummary = {
  user: User;
  preview: string;
  lastMessageAt: number;
  unread: boolean;
};

/** Conversation list, most recent first (board 14a). `undefined` while loading. */
export function useConversations(): ConversationSummary[] | undefined {
  const rows = useQuery(api.messages.conversations);
  const userById = useUsers();
  return rows?.map((c) => ({
    user: c.user ?? userById(c.userId),
    preview: c.preview,
    lastMessageAt: c.lastMessageAt,
    unread: c.unread,
  }));
}

/** One thread with someone (board 15). Empty until the first message. */
export function useThread(userId: string) {
  const me = useMe();
  const data = useQuery(api.messages.thread, { userId });
  const generateUploadUrl = useMutation(api.posts.generateUploadUrl);
  const sendMutation = useMutation(api.messages.send).withOptimisticUpdate((store, args) => {
    const thread = store.getQuery(api.messages.thread, { userId });
    if (!thread || args.message.kind === "image") return;
    const now = optimisticNow();
    const m = args.message;
    store.setQuery(api.messages.thread, { userId }, {
      ...thread,
      messages: [
        ...thread.messages,
        {
          id: `optimistic_${now}` as Id<"messages">,
          senderId: me.id as Id<"users">,
          kind: m.kind,
          body: m.kind === "text" ? m.body.trim() : undefined,
          imageUri: undefined,
          width: undefined,
          height: undefined,
          postId: m.kind === "post" ? m.postId : undefined,
          createdAt: now,
        },
      ],
    });
  });
  const markReadMutation = useMutation(api.messages.markRead);

  const send = useCallback(
    async (draft: MessageDraft) => {
      const to = userId as Id<"users">;
      if (draft.kind === "image") {
        const storageId = (await uploadFile(await generateUploadUrl(), draft.imageUri)) as Id<"_storage">;
        await sendMutation({ userId: to, message: { kind: "image", storageId, width: draft.width, height: draft.height } });
      } else if (draft.kind === "post") {
        await sendMutation({ userId: to, message: { kind: "post", postId: draft.postId as Id<"posts"> } });
      } else {
        await sendMutation({ userId: to, message: { kind: "text", body: draft.body } });
      }
    },
    [userId, generateUploadUrl, sendMutation],
  );

  return {
    loading: data === undefined,
    messages: data?.messages ?? [],
    theirLastReadAt: data?.theirLastReadAt ?? 0,
    /** Either of you blocked the other: no composer. */
    blocked: data?.blocked ?? false,
    send: (draft: MessageDraft) => {
      send(draft).catch((error) => console.warn("Send failed", error));
    },
    markRead: useCallback(() => {
      markReadMutation({ userId: userId as Id<"users"> }).catch(() => {});
    }, [markReadMutation, userId]),
  };
}

/** Every member except you and anyone hidden by a block, for the empty Messages list (14b) and New message. */
export function useMembers(): User[] {
  return useQuery(api.users.members) ?? [];
}

/** Your activity, newest first (board 16a). `undefined` while loading. */
export function useActivity() {
  const items = useQuery(api.activity.list);
  const markAll = useMutation(api.activity.markAllRead);
  return {
    items,
    markAllRead: useCallback(() => {
      markAll().catch(() => {});
    }, [markAll]),
  };
}

/** Fern dots: the Home heart (activity) and the Messages tab. */
export function useUnread() {
  return useQuery(api.activity.unread) ?? { activity: false, messages: false };
}
