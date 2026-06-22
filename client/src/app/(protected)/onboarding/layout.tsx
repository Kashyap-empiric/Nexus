/* eslint-disable @next/next/no-img-element */

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
          <img src="/images/Nexus_brandname.png" alt="Nexus Logo" className="h-6 object-contain filter drop-shadow-md" />
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
