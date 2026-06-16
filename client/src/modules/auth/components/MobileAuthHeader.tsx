import Link from "next/link";
import Image from "next/image";

export function MobileAuthHeader() {
  return (
    <Link href="/" className="w-full max-w-md mb-8 lg:hidden flex items-center justify-center transition-opacity hover:opacity-80">
      <Image 
        src="/images/Nexus_brandname.png" 
        alt="Nexus Logo" 
        width={160} 
        height={46} 
        className="h-10 w-auto" 
        priority 
      />
    </Link>
  );
}
