import { SocketProvider } from "@/shared/providers/socket-provider";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SocketProvider />
      {children}
    </>
  );
}
