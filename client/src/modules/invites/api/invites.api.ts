import { api } from "@/shared/lib/api";
import { API_ROUTES } from "@/shared/constants/api_routes";
import type { InviteType } from "../types/invites";

export const generateInvite = async (params: { type: InviteType; entityId?: string }): Promise<{ invitePath: string; token: string; expiresAt: string | null }> => {
  const response = await api.post(API_ROUTES.INVITES.GENERATE, params);
  return response.data;
};
