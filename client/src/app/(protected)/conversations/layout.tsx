"use client";

import { Sidebar } from "@/components/chat/Sidebar";
import { useSocket } from "@/hooks/useSocket";

export default function ConversationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useSocket(); // Initializes global socket connection
  
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 bg-background h-full">
        {children}
      </main>
    </div>
  );
}
