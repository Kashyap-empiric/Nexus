import "dotenv/config";
import express, { type Request, type Response } from "express";
import type { AuthRequest } from "./types/shared.js";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { errorHandler } from "./middlewares/errorHandler.js";
import { authMiddleware } from "./middlewares/auth.js";
import { generalLimiter } from "./middlewares/rateLimiter.js";
import conversationsRoutes from "./modules/conversations/conversations.routes.js";
import usersRoutes from "./modules/users/users.routes.js";
import invitesRoutes from "./modules/invites/invites.routes.js";
import workspacesRoutes from "./modules/workspaces/workspaces.routes.js";
import notificationsRoutes from "./modules/notifications/notifications.routes.js";
import onboardingRoutes from "./modules/onboarding/onboarding.routes.js";
import messagesSearchRoutes from "./modules/messages/messages.search.routes.js";
import resetPasswordRoutes from "./modules/auth/reset-password.routes.js";
import uploadsRoutes from "./modules/uploads/uploads.routes.js";

import { ExpressAdapter } from "@bull-board/express";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ENV } from "./config/env.js";
import * as usersRepo from "./modules/users/users.repository.js";

const app = express();

const allowedOrigins = ENV.ALLOWED_ORIGINS;
app.use(cors({ origin: allowedOrigins }));
app.use(helmet());
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
    console.error("[GET /api/me]", error instanceof Error ? error.message : error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.use("/api/conversations", conversationsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/invites", invitesRoutes);
app.use("/api/workspaces", workspacesRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/onboarding", onboardingRoutes);
app.use("/api/messages/search", messagesSearchRoutes);
app.use("/api/uploads", uploadsRoutes);
app.use("/api", resetPasswordRoutes);


if (ENV.NODE_ENV === "development") {
  import("./jobs/queues.js").then(({ notificationQueue, emailQueue, cleanupQueue }) => {
    const bullQueues = [notificationQueue, emailQueue, cleanupQueue]
      .filter(Boolean)
      .map((q) => new BullMQAdapter(q!));

    if (bullQueues.length > 0) {
      const serverAdapter = new ExpressAdapter();
      serverAdapter.setBasePath("/admin/queues");

      createBullBoard({
        queues: bullQueues,
        serverAdapter,
      });

      app.use("/admin/queues", serverAdapter.getRouter());
      console.log(`[BullMQ] Dashboard at /admin/queues`);
    }
  });
}

app.use(errorHandler);

export default app;
