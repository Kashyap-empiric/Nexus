import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { cn } from "@/shared/lib/utils";
import { getAvatarPublicUrl } from "@/shared/lib/upload";

interface UserAvatarProps {
  name?: string | null;
  src?: string | null;
  avatarPath?: string | null;
  className?: string;
  fallbackClassName?: string;
}

export function UserAvatar({ name, src, avatarPath, className, fallbackClassName }: UserAvatarProps) {
  const initials = name?.[0]?.toUpperCase() || "U";
  const finalSrc = avatarPath ? getAvatarPublicUrl(avatarPath) : src;
  
  return (
    <Avatar className={className}>
      <AvatarImage src={finalSrc || undefined} />
      <AvatarFallback className={cn("leading-none", fallbackClassName)}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
