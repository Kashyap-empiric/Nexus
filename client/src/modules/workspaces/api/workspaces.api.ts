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

export const createChannel = async (workspaceId: string, name: string, visibility: "PUBLIC" | "PRIVATE"): Promise<Conversation> => {
  const { data } = await api.post<{ data: Conversation }>(`/workspaces/${workspaceId}/channels`, { name, visibility });
  return data.data;
};

export const updateChannel = async (workspaceId: string, channelId: string, data: { name?: string; visibility?: "PUBLIC" | "PRIVATE" }): Promise<Conversation> => {
  const response = await api.patch<{ data: Conversation }>(`/workspaces/${workspaceId}/channels/${channelId}`, data);
  return response.data.data;
};

export const deleteChannel = async (workspaceId: string, channelId: string): Promise<{ id: string }> => {
  const { data } = await api.delete<{ data: { id: string } }>(`/workspaces/${workspaceId}/channels/${channelId}`);
  return data.data;
};

import type { WorkspaceMember } from "../types/workspace";

export const fetchWorkspaceMembers = async (workspaceId: string): Promise<WorkspaceMember[]> => {
  const { data } = await api.get<{ data: WorkspaceMember[] }>(`/workspaces/${workspaceId}/members`);
  return data.data;
};

export const updateMemberRole = async (workspaceId: string, userId: string, role: string): Promise<WorkspaceMember> => {
  const { data } = await api.patch<{ data: WorkspaceMember }>(`/workspaces/${workspaceId}/members/${userId}/role`, { role });
  return data.data;
};
