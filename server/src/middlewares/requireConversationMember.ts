import type { Response, NextFunction } from "express";
import type { AuthRequest } from "@/types/shared.js";
import { verifyConversationMembership } from "@/shared/permissions.js";

export const requireConversationMember = ({ paramName }: { paramName: string }) => {
    return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        const conversationId = req.params[paramName];
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ error: "User unauthorized" });
            return
        }
        if (!conversationId || typeof conversationId !== 'string') {
            res.status(400).json({ error: `Missing or invalid ${paramName} parameter in request` });
            return;
        }
        try {
            const isMember = await verifyConversationMembership(userId, conversationId);
            if (!isMember) {
                res.status(403).json({
                    error: "Forbidden: You are not an authorised member of this conversation."
                });
                return;
            }
            next();
        } catch (error) {
            console.error("Authorization error:", error);
            res.status(500).json({ error: String(error), stack: (error as Error)?.stack });
        }
    }
}