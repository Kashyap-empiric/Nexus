"use client";

import { Sidebar } from "@/components/chat/Sidebar";

export default function ConversationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 bg-background h-full">
        {children}
      </main>
    </div>
  );
}
