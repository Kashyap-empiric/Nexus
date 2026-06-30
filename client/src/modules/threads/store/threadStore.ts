import { create } from "zustand";
import type { Message } from "@/modules/messages/types/message";

export interface ThreadData {
  root: Message;
  replies: Message[];
  participant: { isFollowing: boolean; notificationLevel: "ALL" | "MENTIONS" | "MUTED" } | null;
}

interface ThreadState {
  activeThreadRootId: string | null;
  threadData: ThreadData | null;
  threadPanelOpen: boolean;

  openThread: (rootMessageId: string) => void;
  closeThread: () => void;
  setThreadData: (data: ThreadData) => void;
  appendReply: (reply: Message) => void;
  updateRootMetadata: (rootId: string, replyCount: number, lastReplyAt: string) => void;
}

export const useThreadStore = create<ThreadState>((set, get) => ({
  activeThreadRootId: null,
  threadData: null,
  threadPanelOpen: false,

  openThread: (rootMessageId: string) => {
    const current = get().activeThreadRootId;
    if (current === rootMessageId) {
      set({ threadPanelOpen: true });
    } else {
      set({ activeThreadRootId: rootMessageId, threadPanelOpen: true, threadData: null });
    }
  },

  closeThread: () => {
    set({ activeThreadRootId: null, threadData: null, threadPanelOpen: false });
  },

  setThreadData: (data: ThreadData) => {
    set({ threadData: data });
  },

  appendReply: (reply: Message) => {
    const { threadData } = get();
    if (!threadData) return;
    const exists = threadData.replies.some((r) => r.id === reply.id);
    if (exists) return;
    const pendingIdx = threadData.replies.findIndex(
      (r) => r.pending && r.userId === reply.userId
    );
    if (pendingIdx !== -1) {
      const newReplies = [...threadData.replies];
      newReplies[pendingIdx] = reply;
      set({ threadData: { ...threadData, replies: newReplies } });
    } else {
      set({
        threadData: {
          ...threadData,
          replies: [...threadData.replies, reply],
        },
      });
    }
  },

  updateRootMetadata: (rootId: string, replyCount: number, lastReplyAt: string) => {
    const { threadData } = get();
    if (!threadData || threadData.root.id !== rootId) return;
    set({
      threadData: {
        ...threadData,
        root: {
          ...threadData.root,
          threadReplyCount: replyCount,
          lastThreadReplyAt: lastReplyAt,
        },
      },
    });
  },
}));
