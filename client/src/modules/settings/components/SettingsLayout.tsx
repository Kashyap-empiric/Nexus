import { SettingsSidebar } from "./SettingsSidebar";

export function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row h-full w-full bg-background overflow-hidden">
      <SettingsSidebar />
      <div className="flex-1 min-w-0 h-full overflow-hidden bg-muted/10 md:bg-transparent">
        {children}
      </div>
    </div>
  );
}
