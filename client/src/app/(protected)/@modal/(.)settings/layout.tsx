"use client";

import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/shared/components/ui/dialog";
import { SettingsLayout } from "@/modules/settings/components/SettingsLayout";

export default function InterceptedSettingsLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <Dialog open={true} onOpenChange={(open) => {
      if (!open) router.back();
    }}>
      <DialogContent className="p-0 sm:max-w-4xl border-0 h-[100dvh] w-screen max-w-none sm:h-[70vh] sm:min-h-[500px] sm:w-[90vw] rounded-none sm:rounded-xl flex flex-col overflow-hidden bg-background gap-0">
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <DialogDescription className="sr-only">Configure your application preferences</DialogDescription>
        <SettingsLayout>{children}</SettingsLayout>
      </DialogContent>
    </Dialog>
  );
}
