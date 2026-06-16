import { Router } from "express";
import { authMiddleware } from "@/middlewares/auth.js";
import * as onboardingController from "./onboarding.controller.js";

const router = Router();

router.use(authMiddleware);

router.post("/complete", onboardingController.completeOnboarding);

export default router;
