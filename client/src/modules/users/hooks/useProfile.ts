import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { updateAvatarUrl, updateStatus } from "../api/users.api";

type ProfileResponse = {
  data: {
    id: string;
    email: string;
    username: string;
    fullName: string | null;
    avatarUrl: string | null;
    bio: string | null;
    status: "AVAILABLE" | "AWAY" | "DND" | "INVISIBLE";
    statusText: string | null;
    isOnboarded: boolean;
  };
};

import { useUser } from "@/modules/auth/store/useAuthStore";

export const useProfile = () => {
  const user = useUser();
  return useQuery({
    queryKey: ["users", "me"],
    queryFn: async () => {
      const { data } = await api.get<ProfileResponse>("/users/me");
      return data.data;
    },
    enabled: !!user,
  });
};

type UpdateProfileData = {
  username?: string;
  fullName?: string | null;
  bio?: string | null;
  isOnboarded?: boolean;
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateProfileData) => {
      const { data } = await api.patch<ProfileResponse>("/users/me", payload);
      return data.data;
    },
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(["users", "me"], updatedProfile);
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
};

export const useUpdateAvatar = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (avatarUrl: string | null) => {
      return updateAvatarUrl(avatarUrl);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
};

export const useUpdateStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { status: "AVAILABLE" | "AWAY" | "DND" | "INVISIBLE", statusText: string | null }) => {
      return updateStatus(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
};
