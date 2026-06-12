import { useState, useCallback } from "react";
import { generateInvite } from "../api/invites.api";
import { toast } from "sonner";
import type { InviteType } from "../types/invites";

export function useInviteLink() {
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  const generate = useCallback(async (type: InviteType, entityId?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { invitePath, expiresAt: expiration } = await generateInvite({ type, entityId });
      setInviteUrl(`${window.location.origin}${invitePath}`);
      setExpiresAt(expiration);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to generate invite link");
      toast.error("Could not generate invite link");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setInviteUrl(null);
    setExpiresAt(null);
    setError(null);
  }, []);

  return {
    inviteUrl,
    expiresAt,
    isLoading,
    error,
    generate,
    reset,
  };
}
