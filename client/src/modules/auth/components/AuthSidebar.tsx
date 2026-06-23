import Link from "next/link";
import Image from "next/image";


export function AuthSidebar() {
  return (
    <div className="hidden lg:flex w-1/2 flex-col justify-between p-12 bg-sidebar text-sidebar-foreground relative overflow-hidden border-r border-border">
      {}
      <div className="absolute inset-0 z-0">
        <Image 
          src="/images/auth-bg.png" 
          alt="Abstract glowing network"
          fill
          className="object-cover opacity-60 mix-blend-screen"
          priority
        />
        {}
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/80 via-zinc-950/20 to-zinc-950/80"></div>
      </div>

      <Link href="/" className="relative z-10 block transition-opacity hover:opacity-80">
        <Image 
          src="/images/Nexus_brandname.png" 
          alt="Nexus Logo" 
          width={180} 
          height={50} 
          className="h-10 w-auto" 
          priority 
        />
      </Link>
      
      {}
      <div className="relative z-10 max-w-lg mb-12"></div>
    </div>
  );
}
