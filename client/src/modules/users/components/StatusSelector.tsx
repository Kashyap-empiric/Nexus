import { useState } from "react";
import { useProfile, useUpdateStatus } from "@/modules/users/hooks/useProfile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from "@/shared/components/ui/dropdown-menu";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Circle, Moon, MinusCircle, UserCircle, Save } from "lucide-react";
import { toast } from "sonner";

const STATUS_OPTIONS = [
  { value: "AVAILABLE", label: "Available", icon: Circle, color: "text-status-online fill-current" },
  { value: "AWAY", label: "Away", icon: Moon, color: "text-status-away fill-current" },
  { value: "DND", label: "Do Not Disturb", icon: MinusCircle, color: "text-status-dnd fill-current" },
  { value: "INVISIBLE", label: "Invisible", icon: UserCircle, color: "text-status-offline fill-current" },
] as const;

export function StatusSelector() {
  const { data: profile } = useProfile();
  const { mutateAsync: updateStatus } = useUpdateStatus();
  
  const [isOpen, setIsOpen] = useState(false);
  const [statusText, setStatusText] = useState("");

  if (!profile) return null;

  const currentStatus = STATUS_OPTIONS.find((s) => s.value === profile.status) || STATUS_OPTIONS[0];

  const handleStatusSelect = async (statusValue: "AVAILABLE" | "AWAY" | "DND" | "INVISIBLE") => {
    try {
      await updateStatus({ status: statusValue, statusText: profile.statusText });
      toast.success(`Status updated to ${STATUS_OPTIONS.find(s => s.value === statusValue)?.label}`);
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleStatusTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateStatus({ status: profile.status as any, statusText: statusText || null });
      toast.success("Status text updated");
      setIsOpen(false);
    } catch (error) {
      toast.error("Failed to update status text");
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (open) setStatusText(profile.statusText || "");
    }}>
      <DropdownMenuTrigger className="flex items-center justify-center focus:outline-none transition-transform hover:scale-110">
        <span
          className={`h-3 w-3 rounded-full border-2 border-background cursor-pointer ${
            currentStatus.value === "DND" ? "bg-status-dnd" :
            currentStatus.value === "AWAY" ? "bg-status-away" :
            currentStatus.value === "INVISIBLE" ? "bg-status-offline" :
            "bg-status-online"
          }`}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Update Status</DropdownMenuLabel>
          
          <form onSubmit={handleStatusTextSubmit} className="p-2 flex items-center gap-2">
            <Input 
              value={statusText}
              onChange={(e) => setStatusText(e.target.value)}
              placeholder="What's your status?"
              className="h-8 text-xs"
              maxLength={100}
            />
            <Button type="submit" size="icon" variant="ghost" className="h-8 w-8">
              <Save className="h-4 w-4" />
            </Button>
          </form>

          <DropdownMenuSeparator />

          {STATUS_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => {
                handleStatusSelect(option.value);
              }}
              className="flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center">
                <option.icon className={`mr-2 h-4 w-4 ${option.color}`} />
                <span>{option.label}</span>
              </div>
              {profile.status === option.value && (
                <span className="text-xs text-muted-foreground">Current</span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
