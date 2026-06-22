import { beforeAll } from "vitest";

process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://nexus_test:nexus_test_pass@localhost:5433/nexus_test";
process.env.SUPABASE_URL = process.env.SUPABASE_URL || "https://test-project.supabase.co";
process.env.SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || "test-publishable-key";
process.env.CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";
process.env.VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "test-vapid-public-key";
process.env.VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "test-vapid-private-key";
process.env.VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:test@nexus.app";
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "test-service-role-key";

beforeAll(() => {
});
