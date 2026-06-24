import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/constants/queryKeys";
import { getThreadMessages } from "@/modules/messages/api/messages.api";

export const useThreadMessagesQuery = (conversationId: string | null, messageId: string | null) => {
  return useQuery({
    queryKey: [...queryKeys.messages(conversationId ?? ""), "thread", messageId],
    queryFn: () => getThreadMessages(conversationId!, messageId!),
    enabled: !!conversationId && !!messageId,
  });
};
