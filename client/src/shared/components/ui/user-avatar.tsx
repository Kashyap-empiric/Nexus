import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { cn } from "@/shared/lib/utils";

interface UserAvatarProps {
  name?: string | null;
  src?: string | null;
  className?: string;
  fallbackClassName?: string;
}

export function UserAvatar({ name, src, className, fallbackClassName }: UserAvatarProps) {
  const initials = name?.[0]?.toUpperCase() || "U";
  
  return (
    <Avatar className={className}>
      <AvatarImage src={src || undefined} />
      <AvatarFallback className={cn("leading-none", fallbackClassName)}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
