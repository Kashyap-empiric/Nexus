"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function BackButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      className="w-full sm:w-auto inline-flex items-center justify-center h-10 px-6 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground text-sm font-medium transition-colors"
    >
      <ArrowLeft className="w-4 h-4 mr-2" />
      Go Back
    </button>
  );
}
