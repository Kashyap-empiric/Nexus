import type { Response } from "express";
import type { AuthRequest } from "@/types/shared.js";
import { completeOnboardingSchema } from "./onboarding.schema.js";
import * as onboardingService from "./onboarding.service.js";
import { dispatchUserProfileUpdate } from "@/socket/socket.dispatcher.js";

export const completeOnboarding = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const validationResult = completeOnboardingSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({ error: "Validation failed", details: validationResult.error.format() });
      return;
    }

    const result = await onboardingService.completeOnboarding(userId, validationResult.data);
    
    dispatchUserProfileUpdate(userId);

    res.status(201).json({ data: result });
  } catch (error) {
    console.error("Error completing onboarding:", error);
    res.status(500).json({ error: "Failed to complete onboarding. Please try again." });
  }
};
