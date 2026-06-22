import { vi } from "vitest";

/**
 * Creates a mock Prisma client with all models stubbed.
 * Each model method returns a mock function that can be configured per test.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockFn = any;

interface MockModel {
  findUnique: MockFn;
  findFirst: MockFn;
  findMany: MockFn;
  create: MockFn;
  update: MockFn;
  delete: MockFn;
  upsert: MockFn;
  count: MockFn;
  createMany: MockFn;
  updateMany: MockFn;
  deleteMany: MockFn;
  aggregate: MockFn;
  groupBy: MockFn;
}

interface MockPrismaClient {
  user: MockModel;
  conversation: MockModel;
  conversationMember: MockModel;
  message: MockModel;
  pinnedMessage: MockModel;
  workspace: MockModel;
  workspaceMember: MockModel;
  invite: MockModel;
  notification: MockModel;
  passwordResetToken: MockModel;
  pushSubscription: MockModel;
  $transaction: MockFn;
  $queryRaw: MockFn;
  $connect: MockFn;
  $disconnect: MockFn;
}

export function createMockPrisma(): MockPrismaClient {
  const mockModel = (): MockModel => ({
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    upsert: vi.fn(),
    count: vi.fn(),
    createMany: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
    aggregate: vi.fn(),
    groupBy: vi.fn(),
  });

  return {
    user: mockModel(),
    conversation: mockModel(),
    conversationMember: mockModel(),
    message: mockModel(),
    pinnedMessage: mockModel(),
    workspace: mockModel(),
    workspaceMember: mockModel(),
    invite: mockModel(),
    notification: mockModel(),
    passwordResetToken: mockModel(),
    pushSubscription: mockModel(),
    $transaction: vi.fn((fn: any) => fn(mockPrisma)),
    $queryRaw: vi.fn(),
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  };
}

export const mockPrisma: MockPrismaClient = createMockPrisma();

/**
 * Replaces the prisma module with our mock.
 * Call this in test files before importing services that use prisma.
 */
export function setupPrismaMock() {
  vi.mock("@/lib/db.js", () => ({
    prisma: mockPrisma,
  }));
}

/**
 * Resets all mock call counts and implementations between tests.
 */
export function resetPrismaMock() {
  for (const model of Object.values(mockPrisma)) {
    if (typeof model === "function") {
      if ("mockReset" in model) (model as any).mockReset();
    } else if (typeof model === "object" && model !== null) {
      for (const method of Object.values(model as Record<string, any>)) {
        if (typeof method === "function" && "mockReset" in method) {
          method.mockReset();
        }
      }
    }
  }
}
