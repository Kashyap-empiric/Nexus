import type { Message } from "@/modules/messages/types/message";

export function useOptimisticMessage(message: Message) {
  const isPending = message.pending || message.optimistic;
  return { isPending };
}
