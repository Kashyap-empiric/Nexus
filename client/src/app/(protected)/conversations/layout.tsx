"use client";

import { Search, Plus, UserCircle2, LogOut } from "lucide-react";
import { useConversations } from "@/hooks/useConversations";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function ConversationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { logout } = useAuth();
  const { data: conversations, isLoading } = useConversations();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const params = useParams();
  const activeId = params?.id as string;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUserId(data.user.id);
    });
  }, []);

  const dms = conversations?.filter(c => c.type === "DM") || [];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar - Left Panel */}
      <aside className="w-64 border-r bg-muted/30 flex flex-col hidden md:flex shrink-0">
        {/* Top: Header/Search */}
        <div className="h-14 border-b flex items-center px-4 font-semibold shrink-0">
          Nexus
        </div>
        <div className="p-3 shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search chats..."
              className="w-full bg-background border rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        {/* Middle: Lists */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-6">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              <span>Direct Messages</span>
              <button className="hover:text-foreground"><Plus className="h-4 w-4" /></button>
            </div>
            
            {isLoading ? (
              <div className="text-sm text-muted-foreground/70 px-2 py-1">Loading...</div>
            ) : dms.length === 0 ? (
              <div className="text-sm text-muted-foreground/70 px-2 py-1">No messages yet</div>
            ) : (
              <div className="space-y-1">
                {dms.map(chat => {
                  const otherMember = chat.members.find(m => m.userId !== currentUserId);
                  const name = otherMember?.user.username || "Unknown User";
                  const isActive = chat.id === activeId;
                  
                  return (
                    <Link
                      key={chat.id}
                      href={`/conversations/${chat.id}`}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                        isActive 
                          ? "bg-primary/10 text-primary font-medium" 
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <UserCircle2 className="h-4 w-4" />
                      <span className="truncate">{name}</span>
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
            <UserCircle2 className="h-8 w-8 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">My Account</p>
              <p className="text-xs text-muted-foreground truncate">Online</p>
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

      {/* Main Content - Right Panel */}
      <main className="flex-1 flex flex-col min-w-0 bg-background h-full">
        {children}
      </main>
    </div>
  );
}
