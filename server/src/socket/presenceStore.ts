import { redis } from "../lib/redis.js";


class PresenceStore {
  
  private memoryStore = new Map<string, Set<string>>();

  private get redisAvailable(): boolean {
    try {
      return redis.isReady === true;
    } catch {
      return false;
    }
  }


  
  async addSocket(userId: string, socketId: string): Promise<boolean> {
    const isFirst = this.memoryAddSocket(userId, socketId);

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

  
  async removeSocket(userId: string, socketId: string): Promise<boolean> {
    const isNowOffline = this.memoryRemoveSocket(userId, socketId);

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

  
  async getOnlineUsers(): Promise<string[]> {
    if (this.redisAvailable) {
      try {
        return await redis.sMembers("presence:users");
      } catch {
      }
    }
    return Array.from(this.memoryStore.keys());
  }

  
  async isOnline(userId: string): Promise<boolean> {
    if (this.redisAvailable) {
      try {
        const count = await redis.sCard(`user:presence:${userId}`);
        return count > 0;
      } catch {
      }
    }
    const sockets = this.memoryStore.get(userId);
    return !!sockets && sockets.size > 0;
  }

  
  clear(): void {
    this.memoryStore.clear();
  }


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


export const presenceStore = new PresenceStore();
