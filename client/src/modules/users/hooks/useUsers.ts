import { useQuery } from "@tanstack/react-query";
import * as usersApi from "../api/users.api";
import { queryKeys } from "@/shared/constants/queryKeys";

export const useUsersSearchQuery = (query: string, isOpen: boolean) => {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.usersSearch(query),
    queryFn: () => usersApi.searchUsers(query),
    enabled: isOpen,
    retry: false,
  });
  return { data, isLoading, isError, error };
};
