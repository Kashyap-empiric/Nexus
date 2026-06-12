import { PrismaClient } from "@prisma/client";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { ENV } from "@/config/env.js";

const pool = new pg.Pool({ connectionString: ENV.DATABASE_URL });
const adapter = new PrismaPg(pool);
export const prisma = new PrismaClient({ adapter });
