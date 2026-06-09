import { createClient } from "redis";
import { ENV } from "@/config/env.js";

export const redis = createClient({
  url: ENV.REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries >= 2) return false;
      return 1000;
    }
  }
});

redis.on("error", (err) => {
  console.error("Redis Client Error:", err);
});

export async function connectRedis() {
  try {
    await redis.connect();
    console.log("Redis connected");
    console.log("Redis isReady:", redis.isReady);
    console.log("Redis isOpen:", redis.isOpen);
  } catch (error) {
    console.error("Redis failed to connect!");
    console.error(error);
  }
}