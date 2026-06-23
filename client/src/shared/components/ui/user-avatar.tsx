import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { cn } from "@/shared/lib/utils";

interface UserAvatarProps {
  name?: string | null;
  src?: string | null;
  className?: string;
  fallbackClassName?: string;
  priority?: boolean;
}

export function UserAvatar({ name, src, className, fallbackClassName, priority }: UserAvatarProps) {
  const initials = name?.[0]?.toUpperCase() || "U";
  
  return (
    <Avatar className={className}>
      <AvatarImage 
        src={src || undefined} 
        fetchPriority={priority ? "high" : "auto"} 
        decoding="async" 
      />
      <AvatarFallback className={cn("leading-none", fallbackClassName)}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
