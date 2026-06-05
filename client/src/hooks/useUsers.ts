import { useQuery } from "@tanstack/react-query";
import * as usersApi from "@/services/users.api";
import { queryKeys } from "@/constants/queryKeys";

export const useUsersSearchQuery = (query: string, isOpen: boolean) => {
  return useQuery({
    queryKey: queryKeys.usersSearch(query),
    queryFn: () => usersApi.searchUsers(query),
    enabled: !!query.trim() && isOpen,
  });
};
