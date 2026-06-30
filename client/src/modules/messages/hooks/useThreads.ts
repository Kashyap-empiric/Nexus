import { useQuery, useMutation } from "@tanstack/react-query";
import { getChannelThreads, getWorkspaceThreads, followThread, unfollowThread, updateThreadNotifications } from "../api/messages.api";

export const THREADS_KEYS = {
  all: ["threads"] as const,
  channel: (conversationId: string) => [...THREADS_KEYS.all, "channel", conversationId] as const,
  workspace: (workspaceId: string) => [...THREADS_KEYS.all, "workspace", workspaceId] as const,
};

export const useChannelThreads = (conversationId: string | null) => {
  return useQuery({
    queryKey: conversationId ? THREADS_KEYS.channel(conversationId) : [],
    queryFn: () => getChannelThreads(conversationId!),
    enabled: !!conversationId,
  });
};

export const useWorkspaceThreads = (workspaceId: string | null) => {
  return useQuery({
    queryKey: workspaceId ? THREADS_KEYS.workspace(workspaceId) : [],
    queryFn: () => getWorkspaceThreads(workspaceId!),
    enabled: !!workspaceId,
  });
};

export const useFollowThread = () => {
  return useMutation({
    mutationFn: ({ conversationId, messageId }: { conversationId: string; messageId: string }) =>
      followThread(conversationId, messageId),
  });
};

export const useUnfollowThread = () => {
  return useMutation({
    mutationFn: ({ conversationId, messageId }: { conversationId: string; messageId: string }) =>
      unfollowThread(conversationId, messageId),
  });
};

export const useUpdateThreadNotifications = () => {
  return useMutation({
    mutationFn: ({ conversationId, messageId, level }: { conversationId: string; messageId: string; level: "ALL" | "MENTIONS" | "MUTED" }) =>
      updateThreadNotifications(conversationId, messageId, level),
  });
};
