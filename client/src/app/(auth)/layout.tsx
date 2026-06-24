import { AuthSidebar, MobileAuthHeader } from "@/modules/auth";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh bg-background overflow-hidden">
      <AuthSidebar />

      {}
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 overflow-y-auto">
        <MobileAuthHeader />
        
        <div className="w-full max-w-[400px]">
          {children}
        </div>
      </div>
    </div>
  );
}
