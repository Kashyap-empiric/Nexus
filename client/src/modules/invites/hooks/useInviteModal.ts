import { useInviteModalContext } from "../context/InviteModalContext";

/**
 * Hook to control the invite modal.
 * Both triggering components (Sidebar, EmptyState) and the rendering component (AppLayoutShell)
 * share the same state via InviteModalContext.
 */
export const useInviteModal = () => {
  return useInviteModalContext();
};
