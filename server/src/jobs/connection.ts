export function getBullConnectionOptions(): Record<string, unknown> | null {
  const url = process.env.REDIS_URL;
  if (!url) {
    console.warn("[BullMQ] REDIS_URL not set — queues/workers disabled");
    return null;
  }

  return {
    url,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };
}
