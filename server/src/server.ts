import "dotenv/config";
import http from "http";
import app from "./app.js";
import { Server } from "socket.io";

const PORT = Number(process.env.PORT ?? 3001);

const httpServer = http.createServer(app);

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Health check → http://localhost:${PORT}/health`);
});

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL 
      ? [process.env.CLIENT_URL] 
      : ["http://localhost:3000", "http://localhost:3002"],
    methods: ["GET", "POST"]
  },
});

io.on("connection", (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);
  socket.on("disconnect", () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

const shutdown = (signal: string) => {
  console.log(`\n${signal} received — shutting down gracefully`);
  httpServer.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
