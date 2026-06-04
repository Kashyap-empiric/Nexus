import "dotenv/config";
import express, { type Request, type Response } from "express";
import type { AuthRequest } from "./types/shared.js";
import cors from "cors";
import morgan from "morgan";
import { errorHandler } from "./middlewares/errorHandler.js";
import { authMiddleware } from "./middlewares/auth.js";
import conversationsRoutes from "./modules/conversations/conversations.routes.js";

import { prisma } from "./lib/db.js";

const app = express();

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3002",
  process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({ origin: allowedOrigins as string[] }));
app.use(express.json());
app.use(morgan("dev"));
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/api/me", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user?.id },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found in the database" });
    }

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.use("/api/conversations", conversationsRoutes);
app.use(errorHandler);

export default app;
