"use client";

import { useEffect, useState } from "react";
import { Search, Plus, LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NewConversationModal } from "./NewConversationModal";
import { useConversationsQuery } from "../hooks/useConversations";
import { useAuth } from "@/modules/auth";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useParams } from "next/navigation";

export function Sidebar() {
  const { logout } = useAuth();
  const { data: conversations, isLoading } = useConversationsQuery();
  const [currentAuthUser, setCurrentAuthUser] = useState<any>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const params = useParams();
  const activeId = params?.id as string;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentAuthUser(data.user);
    });
  }, []);

  // Try to find the actual database user profile from the conversation members
  const myProfile = conversations?.[0]?.members.find((m) => m.userId === currentAuthUser?.id)?.user;


  const dms = conversations?.filter((c) => c.type === "DM") || [];

  return (
    <>
      <aside className="w-60 border-r bg-muted/30 dark:bg-muted/10 flex flex-col hidden md:flex shrink-0">
        {/* Top: Search */}
        <div className="h-14 border-b flex items-center px-3 shrink-0 shadow-sm">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Find or start a conversation"
              className="w-full bg-background dark:bg-zinc-950/50 border-none rounded-md pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        {/* Middle: Lists */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-6">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
              <span>Direct Messages</span>
              <button onClick={() => setIsNewModalOpen(true)} className="hover:text-foreground transition-colors">
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {isLoading ? (
              <div className="text-sm text-muted-foreground/70 px-2 py-1">Loading...</div>
            ) : dms.length === 0 ? (
              <div className="text-sm text-muted-foreground/70 px-2 py-1">No messages yet</div>
            ) : (
              <div className="space-y-[2px]">
                {dms.map((chat) => {
                  const otherMember = chat.members.find((m) => m.userId !== currentAuthUser?.id);
                  const name = otherMember?.user.username || "Unknown User";
                  const isActive = chat.id === activeId;

                  return (
                    <Link
                      key={chat.id}
                      href={`/conversations/${chat.id}`}
                      className={`flex items-center gap-3 px-2 py-2 rounded-md text-sm transition-colors ${isActive
                          ? "bg-primary/10 text-primary font-medium dark:bg-white/10 dark:text-foreground"
                          : "text-muted-foreground hover:bg-muted/80 hover:text-foreground dark:hover:bg-white/5"
                        }`}
                    >
                      <Avatar className="h-7 w-7 shrink-0 rounded-md">
                        <AvatarImage src={otherMember?.user.avatarUrl || undefined} className="rounded-md" />
                        <AvatarFallback className="text-[10px] leading-none bg-primary/20 text-primary rounded-md font-medium">{name[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="truncate leading-none">{name}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Bottom: User Profile */}
        <div className="p-4 border-t bg-background shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={myProfile?.avatarUrl || currentAuthUser?.user_metadata?.avatar_url || currentAuthUser?.user_metadata?.avatarUrl || undefined} />
              <AvatarFallback className="text-xs leading-none">
                {myProfile?.username?.[0]?.toUpperCase() || currentAuthUser?.user_metadata?.username?.[0]?.toUpperCase() || "ME"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-none truncate mb-1">
                {myProfile?.username || currentAuthUser?.user_metadata?.username || "My Account"}
              </p>
              <p className="text-xs text-muted-foreground leading-none truncate">Online</p>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      <NewConversationModal isOpen={isNewModalOpen} onClose={() => setIsNewModalOpen(false)} />
    </>
  );
}
