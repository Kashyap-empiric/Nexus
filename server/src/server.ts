import "dotenv/config";
import http from "http";
import app from "./app.js";
import { initSocket } from "./socket/socket.js";
import { ENV } from "./config/env.js";
import { connectRedis } from "./lib/redis.js";
import { initPushService } from "./services/push.service.js";
import { startWorkers } from "./jobs/workers.js";

const PORT = ENV.PORT;

connectRedis();
initPushService();

if (ENV.SENDGRID_API_KEY) {
  console.log(
    `[email] ✓ SendGrid ready  from=${ENV.SENDGRID_FROM_EMAIL || "noreply@nexus.app"}`,
  );
} else {
  console.warn("[email] ✗ SENDGRID_API_KEY not set — email invites will fail");
}

startWorkers();

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
