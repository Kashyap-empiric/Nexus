import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/constants/queryKeys";
import * as messagesApi from "../api/messages.api";
export const usePinnedMessages = (conversationId: string) => {
  return useQuery({
    queryKey: [...queryKeys.conversation(conversationId), "pins"],
    queryFn: () => messagesApi.getPinnedMessages(conversationId),
    enabled: !!conversationId,
  });
};

export const usePinMessage = (conversationId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) => messagesApi.pinMessage(conversationId, messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.conversation(conversationId), "pins"] });
    },
  });
};

export const useUnpinMessage = (conversationId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) => messagesApi.unpinMessage(conversationId, messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.conversation(conversationId), "pins"] });
    },
  });
};
