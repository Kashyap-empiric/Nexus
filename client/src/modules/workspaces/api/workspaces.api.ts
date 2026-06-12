import { api } from "@/shared/lib/api";
import type { Conversation } from "@/modules/conversations/types/conversation";
import type { Workspace } from "../types/workspace";

export const fetchWorkspaceChannels = async (workspaceId: string): Promise<Conversation[]> => {
  const { data } = await api.get<{ data: Conversation[] }>(
    `/workspaces/${workspaceId}/channels`
  );
  return data.data;
};

export const fetchUserWorkspaces = async (): Promise<Workspace[]> => {
  const { data } = await api.get<{ data: Workspace[] }>("/workspaces");
  return data.data;
};

export const fetchWorkspaceDetails = async (workspaceId: string): Promise<{ workspace: Workspace; channels: Conversation[] }> => {
  const { data } = await api.get<{ data: { workspace: Workspace; channels: Conversation[] } }>(`/workspaces/${workspaceId}`);
  return data.data;
};

export const createWorkspace = async (name: string, slug: string, imageUrl?: string): Promise<Workspace> => {
  const { data } = await api.post<{ data: Workspace }>("/workspaces", { name, slug, imageUrl });
  return data.data;
};

export const createChannel = async (workspaceId: string, name: string): Promise<Conversation> => {
  const { data } = await api.post<{ data: Conversation }>(`/workspaces/${workspaceId}/channels`, { name });
  return data.data;
};
