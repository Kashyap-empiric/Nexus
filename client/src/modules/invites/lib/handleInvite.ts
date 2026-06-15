import { api } from "@/shared/lib/api";
import { API_ROUTES } from "@/config/url";
import { toast } from "sonner";
import { safeRedirect } from "@/shared/lib/utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const handleInviteContinuation = async (router: any) => {
  const inviteData = sessionStorage.getItem("nexus_invite");
  if (!inviteData) return false;

  let token = inviteData;

  // Handle legacy JSON format gracefully
  if (inviteData.startsWith("{")) {
    try {
      const parsed = JSON.parse(inviteData);
      token = parsed.token;
    } catch {
      // Not valid JSON, assume it's the raw token string
    }
  }

  if (!token) return false;
  
  try {
    const res = await api.post(API_ROUTES.INVITES.RESOLVE, { token });
    
    sessionStorage.removeItem("nexus_invite");

    if (res.status === 200 && res.data.redirectUrl) {
      safeRedirect(router, res.data.redirectUrl);
      return true;
    }
    return false;
  } catch (error: any) {
    sessionStorage.removeItem("nexus_invite");
    const errorMsg = error?.response?.data?.error || error?.message || "Failed to accept invite";
    console.error("Invite resolution failed:", errorMsg);
    toast.error(errorMsg);
    return false;
  }
};
