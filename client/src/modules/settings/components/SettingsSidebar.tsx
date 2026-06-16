"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/shared/lib/utils";

const SETTINGS_ITEMS = [
  {
    label: "Notifications",
    href: "/settings/notifications",
  },
];

export function SettingsSidebar() {
  const pathname = usePathname();

  return (
    <div className="w-full md:w-64 border-b md:border-b-0 md:border-r bg-muted/30 flex flex-col shrink-0 h-auto md:h-full">
      <div className="p-4 md:p-6 border-b shrink-0 hidden md:block">
        <h2 className="text-xl font-bold">Settings</h2>
      </div>
      <div className="flex flex-row md:flex-col overflow-x-auto md:overflow-y-auto py-2 px-2 md:px-3 gap-1 shrink-0">
        {SETTINGS_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "whitespace-nowrap px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-brand/10 text-brand"
                  : "text-foreground hover:bg-muted"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
