import { api } from "@/shared/lib/api";
import { API_ROUTES } from "@/config/url";
import { toast } from "sonner";
import { friendlyError } from "@/shared/lib/friendly-error";
import { safeRedirect } from "@/shared/lib/utils";

let isResolving = false;

export const handleInviteContinuation = async (router: { push: (url: string) => void }) => {
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
  } catch (err: unknown) {
    sessionStorage.removeItem("nexus_invite");
    console.error("Invite resolution failed:", err);
    toast.error(friendlyError(err, "Failed to accept invite"), { id: "invite-error", duration: Infinity });
    return false;
  } finally {
    isResolving = false;
  }
};
