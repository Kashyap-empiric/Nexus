"use client";

import { Sidebar, NavigationRail } from "@/modules/chat";
import { usePathname } from "next/navigation";
import { APP_ROUTES } from "@/shared/constants/app_routes";

export default function ConversationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isConversationList = pathname === APP_ROUTES.CONVERSATIONS.INDEX;
  
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className={`shrink-0 ${isConversationList ? 'flex' : 'hidden md:flex'}`}>
        <NavigationRail />
      </div>
      <div className={`shrink-0 ${isConversationList ? 'flex' : 'hidden md:flex'} flex-1 md:flex-initial md:w-auto`}>
        <Sidebar />
      </div>
      <main className={`flex-1 flex flex-col min-w-0 bg-background h-full ${!isConversationList ? 'flex' : 'hidden md:flex'}`}>
        {children}
      </main>
    </div>
  );
}
