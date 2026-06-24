"use client";

import React, { Suspense } from "react";
import { InviteProcessor } from "@/modules/invites/components/InviteProcessor";

export default function InvitePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-dvh bg-background text-foreground"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>}>
      <InviteProcessor />
    </Suspense>
  );
}
