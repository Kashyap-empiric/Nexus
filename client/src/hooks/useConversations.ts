import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface User {
  id: string;
  username: string;
  avatarUrl: string | null;
}

export interface ConversationMember {
  id: string;
  userId: string;
  user: User;
}

export interface Conversation {
  id: string;
  type: "DM" | "CHANNEL";
  isPrivate: boolean;
  name: string | null;
  dmPair: string | null;
  members: ConversationMember[];
  updatedAt: string;
}

export const useConversations = () => {
  return useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const response = await api.get<Conversation[]>("/conversations");
      return response.data;
    },
  });
};
