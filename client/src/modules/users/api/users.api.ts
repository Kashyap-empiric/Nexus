import { api } from "@/shared/lib/api";
import { API_ROUTES } from "@/config/url";

export interface UserResult {
  id: string;
  username: string;
  fullName: string | null;
  email: string;
  avatarUrl: string | null;
  bio?: string | null;
  status?: "AVAILABLE" | "AWAY" | "DND" | "INVISIBLE";
  statusText?: string | null;
  createdAt?: string;
}

export const searchUsers = async (query: string) => {
  const response = await api.get<{ data: UserResult[] }>(API_ROUTES.USERS.SEARCH(query));
  return response.data.data;
};

export const getPublicProfile = async (id: string) => {
  const response = await api.get<{ data: UserResult }>(API_ROUTES.USERS.PROFILE(id));
  return response.data.data;
};

export const updateAvatarUrl = async (avatarUrl: string | null) => {
  const response = await api.patch<{ data: UserResult }>(API_ROUTES.USERS.AVATAR, { avatarUrl });
  return response.data.data;
};

export const updateStatus = async (data: { status: "AVAILABLE" | "AWAY" | "DND" | "INVISIBLE", statusText: string | null }) => {
  const response = await api.patch<{ data: UserResult }>(API_ROUTES.USERS.STATUS, data);
  return response.data.data;
};
