"use client";

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/constants/queryKeys";
import * as notificationsApi from "../api/notifications.api";
import type { NotificationPreference } from "../types/notification";

export const useNotifications = (type?: string) => {
  return useInfiniteQuery({
    queryKey: [...queryKeys.notifications, type].filter(Boolean),
    queryFn: ({ pageParam }) => notificationsApi.getNotifications(pageParam as string | undefined, type),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
  });
};

export const useUnreadCount = () => {
  return useQuery({
    queryKey: queryKeys.unreadCount,
    queryFn: () => notificationsApi.getUnreadCount().then((r) => r.count),
    refetchInterval: 30000, // Poll every 30s as fallback
  });
};

export const useMarkAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onMutate: async (id: string) => {
      // Cancel any in-flight unread count refetches so they don't overwrite
      await queryClient.cancelQueries({ queryKey: queryKeys.unreadCount });

      // Snapshot the previous value for rollback
      const previousCount = queryClient.getQueryData<number>(queryKeys.unreadCount);

      // Optimistically decrement the unread count (floor at 0)
      queryClient.setQueryData<number>(
        queryKeys.unreadCount,
        (old) => Math.max((old ?? 1) - 1, 0)
      );

      return { previousCount };
    },
    onError: (_err, _id, context) => {
      // Roll back to the previous count on failure
      if (context?.previousCount !== undefined) {
        queryClient.setQueryData(queryKeys.unreadCount, context.previousCount);
      }
    },
    onSettled: () => {
      // Refetch to sync with server state
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
      queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount });
    },
  });
};

export const useMarkAllAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onMutate: async () => {
      // Cancel any in-flight unread count refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.unreadCount });

      // Snapshot the previous value for rollback
      const previousCount = queryClient.getQueryData<number>(queryKeys.unreadCount);

      // Optimistically set unread count to 0
      queryClient.setQueryData<number>(queryKeys.unreadCount, 0);

      return { previousCount };
    },
    onError: (_err, _vars, context) => {
      // Roll back to the previous count on failure
      if (context?.previousCount !== undefined) {
        queryClient.setQueryData(queryKeys.unreadCount, context.previousCount);
      }
    },
    onSettled: () => {
      // Refetch to sync with server state
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
      queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount });
    },
  });
};

export const useNotificationPreferences = () => {
  const queryClient = useQueryClient();

  const preferencesQuery = useQuery({
    queryKey: queryKeys.notificationPreferences,
    queryFn: () => notificationsApi.getPreferences(),
  });

  const updateMutation = useMutation({
    mutationFn: (prefs: Partial<NotificationPreference>) => notificationsApi.updatePreferences(prefs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notificationPreferences });
    },
  });

  return {
    preferences: preferencesQuery.data,
    isLoading: preferencesQuery.isLoading,
    update: updateMutation.mutate,
    updateAsync: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
};
