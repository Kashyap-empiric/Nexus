import { SocketProvider } from "@/socket/socketProvider";
import { AppLayoutShell } from "@/shared/components/layout/AppLayoutShell";

export default function ProtectedLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <>
      <SocketProvider />
      <AppLayoutShell>
        {children}
      </AppLayoutShell>
      {modal}
    </>
  );
}
