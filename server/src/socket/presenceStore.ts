import { redis } from "../lib/redis.js";

/**
 * Presence store — Redis-first, in-memory-fallback.
 *
 * **Always dual-writes** to both Redis and the in-memory Map so the
 * fallback is always consistent, even if Redis becomes unavailable
 * between an addSocket and the corresponding removeSocket.
 *
 * **Reads** prefer Redis when available; fall back to memory.
 *
 * Multi-tab handling: a user only goes offline when ALL their sockets
 * disconnect.
 */
class PresenceStore {
  /** userId → Set of active socket IDs (always kept in sync) */
  private memoryStore = new Map<string, Set<string>>();

  private get redisAvailable(): boolean {
    try {
      return redis.isReady === true;
    } catch {
      return false;
    }
  }

  // ── Public API ──────────────────────────────────────────────────

  /**
   * Register a socket for a user.
   * Returns `true` if this is the user's *first* active socket.
   */
  async addSocket(userId: string, socketId: string): Promise<boolean> {
    // Always write to memory first (fast, always works)
    const isFirst = this.memoryAddSocket(userId, socketId);

    // Best-effort Redis sync
    if (this.redisAvailable) {
      try {
        await redis.sAdd(`user:presence:${userId}`, socketId);
        await redis.sAdd("presence:users", userId);
      } catch (err) {
        console.warn("[Presence] Redis addSocket failed:", err);
      }
    }

    return isFirst;
  }

  /**
   * Remove a socket for a user.
   * Returns `true` if the user has no more active sockets.
   */
  async removeSocket(userId: string, socketId: string): Promise<boolean> {
    // Always update memory first
    const isNowOffline = this.memoryRemoveSocket(userId, socketId);

    // Best-effort Redis sync
    if (this.redisAvailable) {
      try {
        await redis.sRem(`user:presence:${userId}`, socketId);
        if (isNowOffline) {
          await redis.del(`user:presence:${userId}`);
          await redis.sRem("presence:users", userId);
          await redis.set(`user:lastSeen:${userId}`, Date.now().toString());
        }
      } catch (err) {
        console.warn("[Presence] Redis removeSocket failed:", err);
      }
    }

    return isNowOffline;
  }

  /** Return all currently-online user IDs. */
  async getOnlineUsers(): Promise<string[]> {
    if (this.redisAvailable) {
      try {
        return await redis.sMembers("presence:users");
      } catch {
        // fall through to memory
      }
    }
    return Array.from(this.memoryStore.keys());
  }

  /** Check if a specific user has any active socket. */
  async isOnline(userId: string): Promise<boolean> {
    if (this.redisAvailable) {
      try {
        const count = await redis.sCard(`user:presence:${userId}`);
        return count > 0;
      } catch {
        // fall through to memory
      }
    }
    const sockets = this.memoryStore.get(userId);
    return !!sockets && sockets.size > 0;
  }

  /** Clear all state. */
  clear(): void {
    this.memoryStore.clear();
  }

  // ── In-memory helpers (always kept in sync) ─────────────────────

  private memoryAddSocket(userId: string, socketId: string): boolean {
    let sockets = this.memoryStore.get(userId);
    if (!sockets) {
      sockets = new Set();
      this.memoryStore.set(userId, sockets);
    }
    const wasEmpty = sockets.size === 0;
    sockets.add(socketId);
    return wasEmpty;
  }

  private memoryRemoveSocket(userId: string, socketId: string): boolean {
    const sockets = this.memoryStore.get(userId);
    if (!sockets) return true;
    sockets.delete(socketId);
    if (sockets.size === 0) {
      this.memoryStore.delete(userId);
      return true;
    }
    return false;
  }
}

/** Singleton instance shared across the socket module. */
export const presenceStore = new PresenceStore();
