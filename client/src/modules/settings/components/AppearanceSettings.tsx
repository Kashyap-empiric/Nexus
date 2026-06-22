"use client";

import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export const AppearanceSettings = () => {
  const { theme, setTheme } = useTheme();

  if (!theme) return null;

  const options = [
    { label: "Light", value: "light", icon: Sun },
    { label: "Dark", value: "dark", icon: Moon },
    { label: "System", value: "system", icon: Monitor },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Appearance</h3>
        <p className="text-sm text-muted-foreground">
          Customize the look and feel of Nexus across all your devices.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {options.map(({ label, value, icon: Icon }) => {
          const isActive = theme === value;
          return (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={cn(
                "flex flex-col items-center justify-center gap-4 rounded-xl border-2 p-6 transition-all",
                isActive
                  ? "border-brand bg-brand/10 text-brand"
                  : "border-border bg-card text-muted-foreground hover:border-brand/50 hover:bg-accent"
              )}
            >
              <Icon className="h-8 w-8" />
              <span className="font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
