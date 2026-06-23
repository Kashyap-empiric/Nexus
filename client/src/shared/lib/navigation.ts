

import { useChatStore } from "@/modules/chat/store/chatStore";


export function presetNavigationFromLink(link: string): void {
  const store = useChatStore.getState();

  if (link.startsWith("/workspaces/")) {
    const slugMatch = link.match(/^\/workspaces\/([^/?]+)/);
    if (slugMatch) {
      store.setMode("WORKSPACE");
      store.setActiveWorkspaceId(slugMatch[1]);
    }
  } else if (link.startsWith("/conversations/")) {
    store.setMode("DM");
    store.setActiveWorkspaceId(null);
  }
}
