import Link from "next/link";
import { MessageSquare } from "lucide-react";

export function MobileAuthHeader() {
  return (
    <Link href="/" className="absolute top-8 left-8 lg:hidden flex items-center gap-2 font-bold text-xl tracking-tight text-zinc-900 dark:text-zinc-50 transition-opacity hover:opacity-80">
      <div className="w-8 h-8 bg-emerald-600 rounded-md flex items-center justify-center shadow-sm">
        <MessageSquare className="h-5 w-5 text-white" />
      </div>
      Nexus
    </Link>
  );
}
