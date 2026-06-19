/**
 * Parse a notification link and pre-set the chat store navigation state
 * before calling router.push(). This ensures the sidebar updates
 * synchronously with navigation rather than waiting for the target
 * page component's useEffect to fire.
 */

import { useChatStore } from "@/modules/chat/store/chatStore";

/**
 * Extracts navigation context from a notification link and sets the
 * chat store's mode/activeWorkspaceId so the sidebar renders correctly
 * on the very first frame after navigation.
 *
 * Supported link formats:
 *   /conversations/{id}
 *   /conversations/{id}?highlight={msgId}
 *   /workspaces/{slug}/channels/{channelId}
 *   /workspaces/{slug}/channels/{channelId}?highlight={msgId}
 */
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
