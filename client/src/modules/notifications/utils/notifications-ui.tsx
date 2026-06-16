import { Mail, CheckCircle, UserPlus, Hash, Bell, UserMinus } from "lucide-react";

export function timeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - date) / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)}w ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function NotificationIcon({ type }: { type: string }) {
  const iconMap: Record<string, React.ReactNode> = {
    INVITE_RECEIVED: <Mail className="h-4 w-4 text-amber-500" />,
    INVITE_ACCEPTED: <CheckCircle className="h-4 w-4 text-green-500" />,
    MEMBER_JOINED: <UserPlus className="h-4 w-4 text-brand" />,
    CHANNEL_CREATED: <Hash className="h-4 w-4 text-muted-foreground" />,
    MEMBER_REMOVED: <UserMinus className="h-4 w-4 text-destructive" />,
  };
  return <div className="mr-3 shrink-0 flex items-center justify-center mt-0.5 text-muted-foreground">{iconMap[type] || <Bell className="h-4 w-4" />}</div>;
}
