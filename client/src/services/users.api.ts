import { api } from "./api";
import { API_ROUTES } from "@/constants/paths";
export interface UserResult {
  id: string;
  username: string;
  avatarUrl: string | null;
}
export const searchUsers = async (query: string) => {
  const response = await api.get<{ data: UserResult[] }>(API_ROUTES.USERS.SEARCH(query));
  return response.data.data;
};
