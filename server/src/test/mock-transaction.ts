import { vi } from "vitest";
import { mockPrisma } from "./mock-db.js";

/**
 * Creates a mock for the transaction module.
 * By default, it wraps the function with prisma.$transaction.
 */
export function setupTransactionMock() {
  vi.mock("@/lib/transaction.js", () => ({
    runTransaction: vi.fn((fn: (tx: any) => Promise<any>) => {
      return mockPrisma.$transaction(fn);
    }),
  }));
}
