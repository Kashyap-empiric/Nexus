"use client";

import React, { Suspense } from "react";
import { InviteProcessor } from "@/modules/chat/components/InviteProcessor";

export default function InvitePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen bg-neutral-900 text-white"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>}>
      <InviteProcessor />
    </Suspense>
  );
}
