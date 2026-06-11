import { MessageSquarePlus } from "lucide-react";

export function EmptyStateSkeleton() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center h-full animate-in fade-in duration-500">
      <div className="max-w-md w-full flex flex-col items-center space-y-6">
        <div className="w-24 h-24 rounded-full bg-muted animate-pulse flex items-center justify-center mb-4">
          <MessageSquarePlus className="h-12 w-12 text-muted-foreground/30" />
        </div>

        <div className="space-y-3 w-full flex flex-col items-center">
          <div className="h-8 w-3/4 bg-muted animate-pulse rounded-md" />
          <div className="h-5 w-2/3 bg-muted animate-pulse rounded-md" />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-4 w-full justify-center">
          <div className="h-10 w-[200px] bg-muted animate-pulse rounded-md" />
          <div className="h-10 w-[200px] bg-muted animate-pulse rounded-md" />
        </div>
      </div>
    </div>
  );
}
