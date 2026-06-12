import { api } from "@/shared/lib/api";
import type { Conversation } from "../types/conversation";

export const fetchWorkspaceChannels = async (workspaceId: string): Promise<Conversation[]> => {
  const { data } = await api.get<{ data: Conversation[] }>(
    `/workspaces/${workspaceId}/channels`
  );
  return data.data;
};
