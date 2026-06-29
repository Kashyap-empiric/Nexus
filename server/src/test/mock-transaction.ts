import { vi } from "vitest";
import { mockPrisma } from "./mock-db.js";


export function setupTransactionMock() {
  vi.mock("@/lib/transaction.js", () => ({
    runTransaction: vi.fn((fn: (tx: Record<string, unknown>) => unknown) => {
      return (mockPrisma.$transaction as (fn: (tx: Record<string, unknown>) => unknown) => unknown)(fn);
    }),
  }));
}
