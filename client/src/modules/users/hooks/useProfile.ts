import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";

type ProfileResponse = {
  data: {
    id: string;
    email: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    isOnboarded: boolean;
  };
};

export const useProfile = () => {
  return useQuery({
    queryKey: ["users", "me"],
    queryFn: async () => {
      const { data } = await api.get<ProfileResponse>("/users/me");
      return data.data;
    },
  });
};

type UpdateProfileData = {
  username?: string;
  displayName?: string | null;
  avatarUrl?: string | null;
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
      queryClient.invalidateQueries({ queryKey: ["users", "me"] });
    },
  });
};
