import { vi } from "vitest";
import { mockPrisma } from "./mock-db.js";


export function setupTransactionMock() {
  vi.mock("@/lib/transaction.js", () => ({
    runTransaction: vi.fn((fn: (tx: any) => Promise<any>) => {
      return mockPrisma.$transaction(fn);
    }),
  }));
}
