import type { Response, NextFunction } from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { AuthRequest } from "../types/shared.js";

// Fetched once on startup, then cached — no network call per request
const JWKS = createRemoteJWKSet(
    new URL(`${process.env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`)
);

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ error: "Missing or invalid authorization header" });
        return;
    }
    const token = authHeader.split(" ")[1];

    try {
        const { payload } = await jwtVerify(token, JWKS, {
            audience: "authenticated",
        });

        if (!payload.sub) {
            res.status(401).json({ error: "Invalid token: missing subject" });
            return;
        }
        req.user = { id: payload.sub };
        next();
    } catch (error) {
        res.status(401).json({ error: "Invalid or expired token" });
    }
};

