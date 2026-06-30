import { vi } from "vitest";

type MockFn = ReturnType<typeof vi.fn>;

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
  attachment: MockModel;
  $transaction: MockFn & ((fn: (tx: MockPrismaClient) => unknown) => unknown);
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
    attachment: mockModel(),
    $transaction: vi.fn((fn: (tx: typeof mockPrisma) => unknown) => fn(mockPrisma)),
    $queryRaw: vi.fn(),
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  };
}

export const mockPrisma: MockPrismaClient = createMockPrisma();


export function setupPrismaMock() {
  vi.mock("@/lib/db.js", () => ({
    prisma: mockPrisma,
  }));
}


export function resetPrismaMock() {
  for (const model of Object.values(mockPrisma)) {
    if (typeof model === "function") {
      if ("mockReset" in model) {
        (model as unknown as { mockReset: () => void }).mockReset();
      }
    } else if (typeof model === "object" && model !== null) {
      for (const method of Object.values(model as Record<string, unknown>)) {
        if (typeof method === "function" && "mockReset" in (method as object)) {
          (method as unknown as { mockReset: () => void }).mockReset();
        }
      }
    }
  }
}
