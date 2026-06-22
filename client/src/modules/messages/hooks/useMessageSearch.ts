import { useQuery } from "@tanstack/react-query";
import * as messagesApi from "../api/messages.api";
import { queryKeys } from "@/shared/constants/queryKeys";

export const useMessageSearchQuery = (query: string, isOpen: boolean) => {
  return useQuery({
    queryKey: queryKeys.messagesSearch(query),
    queryFn: () => messagesApi.searchMessages(query),
    enabled: isOpen && query.length > 0,
    retry: false,
  });
};
