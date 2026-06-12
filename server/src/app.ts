import "dotenv/config";
import express, { type Request, type Response } from "express";
import type { AuthRequest } from "./types/shared.js";
import cors from "cors";
import morgan from "morgan";
import { errorHandler } from "./middlewares/errorHandler.js";
import { authMiddleware } from "./middlewares/auth.js";
import { generalLimiter } from "./middlewares/rateLimiter.js";
import conversationsRoutes from "./modules/conversations/conversations.routes.js";
import usersRoutes from "./modules/users/users.routes.js";
import invitesRoutes from "./modules/invites/invites.routes.js";
import workspacesRoutes from "./modules/workspaces/workspaces.routes.js";

import { ENV } from "./config/env.js";
import * as usersRepo from "./modules/users/users.repository.js";

const app = express();

const allowedOrigins = ENV.ALLOWED_ORIGINS;

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());
app.use(morgan("dev"));
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api", generalLimiter);

app.get("/api/me", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await usersRepo.findUserById(req.user?.id ?? "");

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
app.use("/api/users", usersRoutes);
app.use("/api/invites", invitesRoutes);
app.use("/api/workspaces", workspacesRoutes);
app.use(errorHandler);

export default app;
