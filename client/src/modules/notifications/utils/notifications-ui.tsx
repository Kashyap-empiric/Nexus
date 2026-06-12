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
  const iconMap: Record<string, string> = {
    MESSAGE: "💬",
    INVITE_RECEIVED: "📧",
    INVITE_ACCEPTED: "✅",
    MEMBER_JOINED: "👤",
    CHANNEL_CREATED: "#",
  };
  return <span className="text-base mr-2 shrink-0">{iconMap[type] || "🔔"}</span>;
}
