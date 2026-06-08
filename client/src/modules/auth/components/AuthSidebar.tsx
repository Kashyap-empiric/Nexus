import Link from "next/link";
import Image from "next/image";
import { MessageSquare } from "lucide-react";

export function AuthSidebar() {
  return (
    <div className="hidden lg:flex w-1/2 flex-col justify-between p-12 bg-zinc-950 text-white relative overflow-hidden border-r border-zinc-800">
      {/* Beautiful Background Image */}
      <div className="absolute inset-0 z-0">
        <Image 
          src="/images/auth-bg.png" 
          alt="Abstract glowing network"
          fill
          className="object-cover opacity-60 mix-blend-screen"
          priority
        />
        {/* Subtle gradient overlay to ensure the logo remains legible */}
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/80 via-zinc-950/20 to-zinc-950/80"></div>
      </div>

      <Link href="/" className="relative z-10 flex items-center gap-2 font-bold text-2xl tracking-tight transition-opacity hover:opacity-80">
        <div className="w-8 h-8 bg-emerald-600 rounded-md flex items-center justify-center shadow-sm">
          <MessageSquare className="h-5 w-5 text-white" />
        </div>
        Nexus
      </Link>
      
      {/* Empty space where the quote used to be, letting the image shine */}
      <div className="relative z-10 max-w-lg mb-12"></div>
    </div>
  );
}
