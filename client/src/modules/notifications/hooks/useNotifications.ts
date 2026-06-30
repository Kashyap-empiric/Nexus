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
  });
};

export const useMarkAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (markId: string) => notificationsApi.markAsRead(markId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.unreadCount });

      const previousCount = queryClient.getQueryData<number>(queryKeys.unreadCount);

      queryClient.setQueryData<number>(
        queryKeys.unreadCount,
        (old) => Math.max((old ?? 1) - 1, 0)
      );

      return { previousCount };
    },
    onError: (_err, _markId, context) => {
      if (context?.previousCount !== undefined) {
        queryClient.setQueryData(queryKeys.unreadCount, context.previousCount);
      }
    },
    onSettled: () => {
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
      await queryClient.cancelQueries({ queryKey: queryKeys.unreadCount });

      const previousCount = queryClient.getQueryData<number>(queryKeys.unreadCount);

      queryClient.setQueryData<number>(queryKeys.unreadCount, 0);

      return { previousCount };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousCount !== undefined) {
        queryClient.setQueryData(queryKeys.unreadCount, context.previousCount);
      }
    },
    onSettled: () => {
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
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const hasCachedData = queryClient.getQueryData(queryKeys.notificationPreferences) !== undefined;

  const updateMutation = useMutation({
    mutationFn: (prefs: Partial<NotificationPreference>) => notificationsApi.updatePreferences(prefs),
    onMutate: async (newPrefs) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notificationPreferences });

      const previousPrefs = queryClient.getQueryData<NotificationPreference>(queryKeys.notificationPreferences);

      queryClient.setQueryData<NotificationPreference>(
        queryKeys.notificationPreferences,
        (old) => old ? { ...old, ...newPrefs } : old
      );

      return { previousPrefs };
    },
    onError: (_err, _newPrefs, context) => {
      if (context?.previousPrefs) {
        queryClient.setQueryData(queryKeys.notificationPreferences, context.previousPrefs);
      }
    },
  });

  return {
    preferences: preferencesQuery.data,
    isLoading: preferencesQuery.isPending && !hasCachedData,
    update: updateMutation.mutate,
    updateAsync: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
};
