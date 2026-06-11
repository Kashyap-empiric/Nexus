import { api } from "@/shared/lib/api";
import { API_ROUTES } from "@/shared/constants/api_routes";

export const handleInviteContinuation = async (router: any) => {
  const inviteData = sessionStorage.getItem("nexus_invite");
  if (!inviteData) return;

  let token = inviteData;

  // Handle legacy JSON format gracefully
  if (inviteData.startsWith("{")) {
    try {
      const parsed = JSON.parse(inviteData);
      token = parsed.token;
    } catch (e) {
      // Not valid JSON, assume it's the raw token string
    }
  }

  if (!token) return;
  
  try {
    const res = await api.post(API_ROUTES.INVITES.RESOLVE, { token });
    
    sessionStorage.removeItem("nexus_invite");

    if (res.status === 200 && res.data.redirectUrl) {
      router.push(res.data.redirectUrl);
    }
  } catch (error) {
    sessionStorage.removeItem("nexus_invite");
    console.error("Invite resolution failed", error);
  }
};
