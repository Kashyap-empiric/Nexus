import type { Response, NextFunction } from "express";
import { verifyToken } from "@/utils/jwt.js";
import type { AuthRequest } from "@/types/shared.js";

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ error: "Missing or invalid authorization header" });
        return;
    }
    const token = authHeader.split(" ")[1];

    try {
        const user = await verifyToken(token);
        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ error: "Invalid or expired token" });
    }
};
