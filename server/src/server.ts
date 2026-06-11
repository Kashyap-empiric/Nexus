// Dev server reload trigger
import "dotenv/config";
import http from "http";
import app from "./app.js";
import { initSocket } from "./socket/socket.js";
import { ENV } from "./config/env.js";
import { connectRedis } from "./lib/redis.js";

const PORT = ENV.PORT;

connectRedis();

const httpServer = http.createServer(app);

httpServer.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
  console.log(`Health check → ${PORT}/health`);
});

initSocket(httpServer);

const shutdown = (signal: string) => {
  console.log(`\n${signal} received, shutting down gracefully`);
  httpServer.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
