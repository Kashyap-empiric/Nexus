
import Image from "next/image";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-background flex flex-col relative overflow-hidden">
      {}
      <div className="h-14 border-b flex items-center px-6 shrink-0 z-10 bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Image src="/images/Nexus_brandname.png" alt="Nexus Logo" width={180} height={50} className="h-6 w-auto object-contain filter drop-shadow-md" priority />
        </div>
      </div>

      {}
      <div className="flex-1 overflow-y-auto flex items-center justify-center z-10 relative py-12">
        <div className="w-full max-w-2xl px-4">
          {children}
        </div>
      </div>
    </div>
  );
}
