import { api } from "@/shared/lib/api";
import { API_ROUTES } from "@/constants/api_routes";
export interface UserResult {
  id: string;
  username: string;
  avatarUrl: string | null;
}
export const searchUsers = async (query: string) => {
  const response = await api.get<{ data: UserResult[] }>(API_ROUTES.USERS.SEARCH(query));
  return response.data.data;
};
