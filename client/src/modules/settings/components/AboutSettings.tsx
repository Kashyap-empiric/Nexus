"use client";

import { useSocketStore } from "@/socket/socketStore";
import { cn } from "@/shared/lib/utils";

function StatusDot({ connected }: { connected: boolean }) {
  if (connected) {
    return (
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-presence-online opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-presence-online" />
      </span>
    );
  }
  return <span className="inline-flex h-2 w-2 rounded-full bg-destructive" />;
}

export function AboutSettings() {
  const socketStatus = useSocketStore((state) => state.socketStatus);

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Nexus</h1>
        <p className="text-sm text-muted-foreground">Real-time communication platform</p>
      </div>

      <div>
        <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase mb-3">APPLICATION</p>
        <hr className="border-border mb-4" />
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-muted-foreground">Version</span>
            <span className="text-sm font-medium">{process.env.NEXT_PUBLIC_APP_VERSION || "0.0.0"}</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-muted-foreground">Build Date</span>
            <span className="text-sm font-medium">{process.env.NEXT_PUBLIC_BUILD_DATE ? new Date(process.env.NEXT_PUBLIC_BUILD_DATE).toLocaleString() : "N/A"}</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-muted-foreground">Environment</span>
            <span className={cn(
              "text-sm font-medium px-2 py-0.5 rounded",
              process.env.NODE_ENV === "development" ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
            )}>
              {process.env.NODE_ENV || "unknown"}
            </span>
          </div>
        </div>
      </div>

      <div>
        <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase mb-3">CONNECTION STATUS</p>
        <hr className="border-border mb-4" />
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-muted-foreground">WebSocket</span>
            <div className="flex items-center gap-2">
              <StatusDot connected={socketStatus === "connected"} />
              <span className={cn(
                "text-sm font-medium capitalize",
                socketStatus === "connected" ? "text-presence-online" : "text-destructive"
              )}>
                {socketStatus}
              </span>
            </div>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-muted-foreground">Backend API</span>
            <span className="text-sm text-muted-foreground">N/A</span>
          </div>
        </div>
      </div>

      <hr className="border-border" />

      <div className="flex justify-center gap-6 text-sm text-muted-foreground">
        <a href="https://github.com/anomalyco/nexus" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors underline underline-offset-2">
          GitHub
        </a>
        <a href="https://opencode.ai" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors underline underline-offset-2">
          Docs
        </a>
      </div>
    </div>
  );
}
