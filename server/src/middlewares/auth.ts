import type { Response, NextFunction } from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { AuthRequest } from "../types/shared.js";
import { prisma } from "../lib/db.js";

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
        // Verify the JWT locally using Supabase's public EC key (ES256)
        // Zero network calls — pure cryptographic verification
        const { payload } = await jwtVerify(token, JWKS, {
            audience: "authenticated",
        });

        if (!payload.sub) {
            res.status(401).json({ error: "Invalid token: missing subject" });
            return;
        }

        // Upsert the user into our DB so OAuth users (e.g. GitHub) are synced on first request.
        // For email/password users this is a no-op after the first sign-in.
        await prisma.user.upsert({
            where: { id: payload.sub },
            update: {},
            create: {
                id: payload.sub,
                email: (payload.email as string) ?? "",
                username:
                    (payload.user_metadata as any)?.username ??
                    (payload.user_metadata as any)?.user_name ??
                    ((payload.email as string)?.split("@")[0] ?? "user"),
                avatarUrl: (payload.user_metadata as any)?.avatar_url ?? null,
            },
        });

        req.user = { id: payload.sub };
        next();
    } catch (error) {
        res.status(401).json({ error: "Invalid or expired token" });
    }
};

