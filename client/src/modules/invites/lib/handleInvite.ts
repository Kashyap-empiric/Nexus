import { api } from "@/shared/lib/api";
import { API_ROUTES } from "@/config/url";
import { toast } from "sonner";
import { safeRedirect } from "@/shared/lib/utils";

let isResolving = false;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const handleInviteContinuation = async (router: any) => {
  if (isResolving) return false;
  
  const inviteData = sessionStorage.getItem("nexus_invite");
  if (!inviteData) return false;

  let token = inviteData;

  if (inviteData.startsWith("{")) {
    try {
      const parsed = JSON.parse(inviteData);
      token = parsed.token;
    } catch {
    }
  }

  if (!token) return false;
  
  isResolving = true;
  try {
    const res = await api.post(API_ROUTES.INVITES.RESOLVE, { token });
    
    sessionStorage.removeItem("nexus_invite");

    if (res.data.alreadyMember) {
      toast.info("You're already a member of this workspace");
    }

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
  } finally {
    isResolving = false;
  }
};
