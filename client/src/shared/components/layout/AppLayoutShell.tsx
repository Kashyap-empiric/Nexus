"use client";

import { Sidebar } from "@/modules/conversations/components/Sidebar";
import { NavigationRail } from "@/modules/chat/components/NavigationRail";

export function AppLayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <div className="shrink-0 flex">
        <NavigationRail />
      </div>
      <div className="shrink-0 flex md:flex-initial md:w-auto">
        <Sidebar />
      </div>
      <main className="flex-1 flex flex-col min-w-0 bg-background h-full">
        {children}
      </main>
    </div>
  );
}
