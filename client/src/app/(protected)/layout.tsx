import { Suspense } from 'react';
import { SocketProvider } from "@/socket/socketProvider";
import { AppLayoutShell } from "@/shared/components/layout/AppLayoutShell";
import ProtectedLoading from './loading';

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
        <Suspense fallback={<ProtectedLoading />}>
          {children}
        </Suspense>
      </AppLayoutShell>
      {modal}
    </>
  );
}
