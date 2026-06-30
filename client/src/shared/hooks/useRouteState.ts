import { useParams, usePathname } from "next/navigation";

export type WorkspaceDestination =
  | { type: "channel"; channelId: string }
  | { type: "threads" };

export type RouteState =
  | { mode: "workspace"; workspaceId: string; destination: WorkspaceDestination }
  | { mode: "dm"; conversationId: string | null }
  | { mode: "unknown" };

export function useRouteState() {
  const params = useParams();
  const pathname = usePathname();

  const isWorkspace = pathname?.startsWith('/workspaces/') ?? false;
  const isThreads = pathname?.endsWith('/threads') ?? false;

  const mode = isWorkspace ? "WORKSPACE" : "DM";
  const activeWorkspaceId = (params?.slug as string) || (params?.workspaceId as string) || null;
  const activeConversationId = (params?.channelId as string) || (params?.id as string) || null;

  let routeState: RouteState = { mode: "unknown" };

  if (isWorkspace && activeWorkspaceId) {
    const destination: WorkspaceDestination = isThreads
      ? { type: "threads" }
      : { type: "channel", channelId: activeConversationId ?? "" };

    routeState = {
      mode: "workspace",
      workspaceId: activeWorkspaceId,
      destination,
    };
  } else if (!isWorkspace) {
    routeState = {
      mode: "dm",
      conversationId: activeConversationId,
    };
  }

  return { mode, activeWorkspaceId, activeConversationId, routeState };
}
