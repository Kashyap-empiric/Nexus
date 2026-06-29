import { useState } from "react";
import { useProfile, useUpdateStatus } from "@/modules/users/hooks/useProfile";
import { useUser } from "@/modules/auth/store/useAuthStore";
import { useSocketStore } from "@/socket/socketStore";
import { UserAvatar } from "@/shared/components/ui/user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from "@/shared/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/shared/components/ui/sheet";
import { useMediaQuery } from "@/shared/hooks/use-media-query";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Circle, Moon, MinusCircle, UserCircle, Save, User as UserIcon, Bell, Palette } from "lucide-react";
import { toast } from "sonner";

const STATUS_OPTIONS = [
  { value: "AVAILABLE", label: "Available", icon: Circle, color: "text-status-online fill-current" },
  { value: "AWAY", label: "Away", icon: Moon, color: "text-status-away fill-current" },
  { value: "DND", label: "Do Not Disturb", icon: MinusCircle, color: "text-status-dnd fill-current" },
  { value: "INVISIBLE", label: "Invisible", icon: UserCircle, color: "text-status-offline fill-current" },
] as const;

interface UserFooterMenuProps {
  openSettings: (view: 'profile' | 'appearance' | 'notifications' | 'account') => void;
}

export function UserFooterMenu({ openSettings }: UserFooterMenuProps) {
  const { data: profile } = useProfile();
  const authUser = useUser();
  const socketStatus = useSocketStore((state) => state.socketStatus);
  const { mutateAsync: updateStatus } = useUpdateStatus();

  const [isOpen, setIsOpen] = useState(false);
  const [statusText, setStatusText] = useState("");
  const isMobile = useMediaQuery("(max-width: 768px)");

  if (!profile) return null;

  const currentStatus = STATUS_OPTIONS.find((s) => s.value === profile.status) || STATUS_OPTIONS[0];
  const statusLabel = socketStatus === "connected"
    ? (profile.statusText || currentStatus.label)
    : socketStatus === "connecting" ? "Connecting..." : "Offline";

  const handleStatusSelect = async (statusValue: "AVAILABLE" | "AWAY" | "DND" | "INVISIBLE") => {
    try {
      await updateStatus({ status: statusValue, statusText: profile.statusText });
      toast.success(`Status updated to ${STATUS_OPTIONS.find(s => s.value === statusValue)?.label}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleStatusTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateStatus({ status: profile.status as "AVAILABLE" | "AWAY" | "DND" | "INVISIBLE", statusText: statusText || null });
      toast.success("Status text updated");
      setIsOpen(false);
    } catch {
      toast.error("Failed to update status text");
    }
  };

  const triggerContent = (
    <>
      <div className="relative shrink-0 flex items-center">
        <UserAvatar
          name={profile.username || authUser?.user_metadata?.username || "ME"}
          src={profile.avatarUrl || authUser?.user_metadata?.avatar_url || authUser?.user_metadata?.avatarUrl}
          className="h-8 w-8 shrink-0"
          fallbackClassName="text-xs"
        />
        <div className="absolute -bottom-0.5 -right-0.5">
          <span className={`block h-3 w-3 rounded-full border-2 border-background ${currentStatus.value === "DND" ? "bg-status-dnd" :
              currentStatus.value === "AWAY" ? "bg-status-away" :
                currentStatus.value === "INVISIBLE" ? "bg-status-offline" :
                  "bg-status-online"
            }`} />
        </div>
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-sm font-medium truncate leading-none mb-1">
          {profile.username || authUser?.user_metadata?.username || "My Account"}
        </p>
        <p className="text-xs text-muted-foreground leading-none truncate">{statusLabel}</p>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={(open) => {
        setIsOpen(open);
        if (open) setStatusText(profile.statusText || "");
      }}>
        <SheetTrigger
          render={<button className="w-full p-4 bg-sidebar shrink-0 flex items-center gap-3 min-w-0 hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-left cursor-pointer select-none" />}
        >
          {triggerContent}
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[100dvh] max-h-[100dvh] rounded-none flex flex-col pt-12 z-[100]">
          <SheetHeader className="text-left px-4">
            <SheetTitle>User Menu</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-2 pb-6">
            <div className="p-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Update Status</div>
              <form onSubmit={handleStatusTextSubmit} className="flex items-center gap-2 mb-2">
                <Input
                  value={statusText}
                  onChange={(e) => setStatusText(e.target.value)}
                  placeholder="What's your status?"
                  className="h-10 text-sm"
                  maxLength={100}
                />
                <Button type="submit" size="icon" variant="ghost" className="h-10 w-10 shrink-0" title="Save status">
                  <Save className="h-5 w-5" />
                </Button>
              </form>
              <div className="grid grid-cols-1 gap-1">
                {STATUS_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant="ghost"
                    onClick={() => handleStatusSelect(option.value)}
                    className={`flex items-center justify-start gap-3 h-12 px-3 text-sm ${profile.status === option.value ? 'bg-muted font-medium' : 'font-normal'}`}
                  >
                    <option.icon className={`h-4 w-4 shrink-0 ${option.color}`} />
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="h-px bg-border my-2 mx-2" />

            <div className="p-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Settings</div>
              <Button variant="ghost" className="w-full justify-start h-12 px-3 text-sm font-normal" onClick={() => { openSettings('profile'); setIsOpen(false); }}>
                <UserIcon className="mr-3 h-4 w-4 text-muted-foreground" /> Profile Settings
              </Button>
              <Button variant="ghost" className="w-full justify-start h-12 px-3 text-sm font-normal" onClick={() => { openSettings('appearance'); setIsOpen(false); }}>
                <Palette className="mr-3 h-4 w-4 text-muted-foreground" /> Appearance
              </Button>
              <Button variant="ghost" className="w-full justify-start h-12 px-3 text-sm font-normal" onClick={() => { openSettings('notifications'); setIsOpen(false); }}>
                <Bell className="mr-3 h-4 w-4 text-muted-foreground" /> Notifications
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (open) setStatusText(profile.statusText || "");
    }}>
      <DropdownMenuTrigger
        render={<button className="w-full p-4 bg-sidebar shrink-0 flex items-center gap-3 min-w-0 hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-left cursor-pointer select-none" />}
      >
        {triggerContent}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 mb-1">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Update Status</DropdownMenuLabel>

          <form onSubmit={handleStatusTextSubmit} className="p-2 flex items-center gap-2">
            <Input
              value={statusText}
              onChange={(e) => setStatusText(e.target.value)}
              placeholder="What's your status?"
              className="h-8 text-xs"
              maxLength={100}
            />
            <Button type="submit" size="icon" variant="ghost" className="h-8 w-8 shrink-0" title="Save status">
              <Save className="h-4 w-4" />
            </Button>
          </form>

          <div className="grid grid-cols-1 gap-0.5 px-1 pb-1">
            {STATUS_OPTIONS.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleStatusSelect(option.value)}
                className={`flex items-center justify-start gap-2 h-8 px-2 text-xs ${profile.status === option.value ? 'bg-muted font-medium' : 'font-normal'}`}
              >
                <option.icon className={`h-3.5 w-3.5 shrink-0 ${option.color}`} />
                {option.label}
              </Button>
            ))}
          </div>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Settings</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => { openSettings('profile'); setIsOpen(false); }} className="cursor-pointer py-2">
            <UserIcon className="mr-2 h-4 w-4 text-muted-foreground" /> Profile Settings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { openSettings('appearance'); setIsOpen(false); }} className="cursor-pointer py-2">
            <Palette className="mr-2 h-4 w-4 text-muted-foreground" /> Appearance
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { openSettings('notifications'); setIsOpen(false); }} className="cursor-pointer py-2">
            <Bell className="mr-2 h-4 w-4 text-muted-foreground" /> Notifications
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
