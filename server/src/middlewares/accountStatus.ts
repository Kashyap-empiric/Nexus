import type { Response, NextFunction } from "express";
import type { AuthRequest } from "@/types/shared.js";
import { prisma } from "@/lib/db.js";

export const rejectDeletingAccount = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    next();
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isDeleting: true },
    });

    if (user?.isDeleting) {
      res.status(403).json({ error: "Your account is being deleted. This action is not allowed." });
      return;
    }

    next();
  } catch {
    next();
  }
};
