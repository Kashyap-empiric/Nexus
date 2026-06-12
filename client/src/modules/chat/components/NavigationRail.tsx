import { MessagesSquare } from "lucide-react";
import { APP_ROUTES } from "@/shared/constants/app_routes";
import Link from "next/link";
import { useChatStore } from "../store/chatStore";

export function NavigationRail() {
  const setMode = useChatStore((state) => state.setMode);
  const setActiveWorkspaceId = useChatStore((state) => state.setActiveWorkspaceId);

  return (
    <aside className="w-[53px] border-r flex flex-col items-center shrink-0 bg-background dark:bg-zinc-950">
      <div className="h-14 w-full flex items-center justify-center shrink-0">
        <Link
          href={APP_ROUTES.CONVERSATIONS.INDEX}
          className="w-[32px] h-[32px] rounded-[8px] bg-primary text-primary-foreground flex items-center justify-center transition-all duration-200 hover:opacity-90"
          title="Direct Messages"
          onClick={() => {
            setMode("DM");
            setActiveWorkspaceId(null);
          }}
        >
          <MessagesSquare size={18} />
        </Link>
      </div>

      <div className="w-8 h-[2px] bg-border rounded-full" />

      {/* Future server/workspace icons will go here */}
    </aside>
  );
}
