import { api } from "@/shared/lib/api";
import type { Conversation } from "@/modules/conversations/types/conversation";
import type { Workspace } from "../types/workspace";

export const updateWorkspace = async (workspaceId: string, payload: {
  name?: string;
  slug?: string;
  imageUrl?: string;
  iconPath?: string;
  description?: string;
}): Promise<Workspace> => {
  const { data } = await api.patch<{ data: Workspace }>(`/workspaces/${workspaceId}`, payload);
  return data.data;
};

export const deleteWorkspace = async (workspaceId: string): Promise<{ id: string }> => {
  const { data } = await api.delete<{ data: { id: string } }>(`/workspaces/${workspaceId}`);
  return data.data;
};

export const leaveWorkspace = async (workspaceId: string): Promise<{ workspaceId: string }> => {
  const { data } = await api.post<{ data: { workspaceId: string } }>(`/workspaces/${workspaceId}/leave`);
  return data.data;
};

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

export const createWorkspace = async (name: string, slug: string, imageUrl?: string, description?: string, iconPath?: string): Promise<Workspace> => {
  const { data } = await api.post<{ data: Workspace }>("/workspaces", { name, slug, imageUrl, description, iconPath });
  return data.data;
};

export const createChannel = async (workspaceId: string, name: string, visibility: "PUBLIC" | "PRIVATE"): Promise<Conversation> => {
  const { data } = await api.post<{ data: Conversation }>(`/workspaces/${workspaceId}/channels`, { name, visibility });
  return data.data;
};

export const updateChannel = async (workspaceId: string, channelId: string, data: { name?: string; description?: string; visibility?: "PUBLIC" | "PRIVATE" }): Promise<Conversation> => {
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

export const inviteByEmail = async (
  workspaceId: string,
  email: string
): Promise<{ success: boolean; invited: string; emailSent: boolean; error?: string }> => {
  const { data } = await api.post<{ success: boolean; invited: string; emailSent: boolean; error?: string }>(
    `/workspaces/${workspaceId}/invite-email`,
    { email }
  );
  return data;
};

export const inviteMemberByUsername = async (workspaceId: string, username: string): Promise<{ success: boolean }> => {
  const { data } = await api.post<{ success: boolean }>(`/workspaces/${workspaceId}/invite`, { username });
  return data;
};

export const inviteMembers = async (workspaceId: string, userIds: string[]): Promise<{
  success: boolean;
  queued?: boolean;
  total?: number;
  invitedCount: number;
  skipped: { userId: string; reason: string }[];
}> => {
  const { data } = await api.post<{
    success: boolean;
    queued?: boolean;
    total?: number;
    invitedCount: number;
    skipped: { userId: string; reason: string }[];
  }>(`/workspaces/${workspaceId}/invite-multiple`, { userIds });
  return data;
};

import type { ConversationMember } from "@/modules/conversations/types/conversation";

export const getChannelMembers = async (workspaceId: string, channelId: string): Promise<ConversationMember[]> => {
  const { data } = await api.get<{ data: ConversationMember[] }>(
    `/workspaces/${workspaceId}/channels/${channelId}/members`
  );
  return data.data;
};

export const addChannelMembers = async (workspaceId: string, channelId: string, userIds: string[]): Promise<{ count: number }> => {
  const { data } = await api.post<{ data: { added: { count: number } } }>(
    `/workspaces/${workspaceId}/channels/${channelId}/members`,
    { userIds }
  );
  return data.data.added;
};

export const removeChannelMember = async (workspaceId: string, channelId: string, userId: string): Promise<{ removedUserId: string }> => {
  const { data } = await api.delete<{ data: { removedUserId: string } }>(
    `/workspaces/${workspaceId}/channels/${channelId}/members/${userId}`
  );
  return data.data;
};

export const removeMember = async (workspaceId: string, userId: string): Promise<{ workspaceId: string; userId: string }> => {
  const { data } = await api.delete<{ data: { workspaceId: string; userId: string } }>(
    `/workspaces/${workspaceId}/members/${userId}`
  );
  return data.data;
};
