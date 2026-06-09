import { createRemoteJWKSet, jwtVerify } from "jose";
import { ENV } from "../config/env.js";

const JWKS = createRemoteJWKSet(
  new URL(`${ENV.SUPABASE_URL}/auth/v1/.well-known/jwks.json`)
);

export const verifyToken = async (token: string) => {
  const { payload } = await jwtVerify(token, JWKS, {
    audience: "authenticated",
  });

  if (!payload.sub) {
    throw new Error("Invalid token: missing subject");
  }

  return { id: payload.sub };
};
