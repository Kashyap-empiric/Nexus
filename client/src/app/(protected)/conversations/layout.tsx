"use client";

import { Sidebar, NavigationRail } from "@/modules/chat";
import { usePresence } from "@/modules/users/hooks/usePresence";

export default function ConversationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  usePresence();
  
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <NavigationRail />
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 bg-background h-full">
        {children}
      </main>
    </div>
  );
}
