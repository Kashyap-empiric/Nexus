import { useQuery } from "@tanstack/react-query";
import * as usersApi from "../api/users.api";
import { queryKeys } from "@/shared/constants/queryKeys";

export const useUsersSearchQuery = (query: string, isOpen: boolean) => {
  return useQuery({
    queryKey: queryKeys.usersSearch(query),
    queryFn: () => usersApi.searchUsers(query),
    enabled: !!query.trim() && isOpen,
  });
};
