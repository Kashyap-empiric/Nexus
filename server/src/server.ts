import "dotenv/config";

import http from "http";

import app from "./app.js";

// ── Config ─────────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT ?? 3000);

// ── HTTP server ────────────────────────────────────────────────────────────
// We create an explicit http.Server so Socket.io can share the same port as
// the Express app rather than requiring a separate WebSocket port.
const httpServer = http.createServer(app);

// ── Socket.io ──────────────────────────────────────────────────────────────
// Initialised here once the http server exists. Socket setup (auth middleware,
// room handlers, presence) is wired in src/socket/index.ts and imported below
// when that file is built on Day 3.
//
// import { initSocket } from "./socket/index.js";
// initSocket(httpServer);

// ── Start ──────────────────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Health check → http://localhost:${PORT}/health`);
});

// ── Graceful shutdown ──────────────────────────────────────────────────────
const shutdown = (signal: string) => {
  console.log(`\n${signal} received — shutting down gracefully`);
  httpServer.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
