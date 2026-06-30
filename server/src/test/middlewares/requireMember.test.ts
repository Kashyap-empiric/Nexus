import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Response, NextFunction } from "express";
import type { AuthRequest } from "@/types/shared.js";

process.env.SUPABASE_URL = "https://test-project.supabase.co";

vi.mock("@/shared/permissions.js", () => ({
  verifyConversationMembership: vi.fn(),
}));

const { requireConversationMember } = await import(
  "@/middlewares/requireConversationMember.js"
);
const { verifyConversationMembership } = await import(
  "@/shared/permissions.js"
);

describe("requireConversationMember middleware", () => {
  let req: Record<string, unknown>;
  let res: Partial<Response>;
  let next: NextFunction;
  const handler = requireConversationMember({ paramName: "conversationId" });

  beforeEach(() => {
    req = { user: { id: "user-1" }, params: { conversationId: "conv-1" } };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
    vi.clearAllMocks();
  });

  it("passes when user is a member of the conversation", async () => {
    vi.mocked(verifyConversationMembership).mockResolvedValueOnce(true);

    await handler(req as unknown as AuthRequest, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 403 when user is not a member", async () => {
    vi.mocked(verifyConversationMembership).mockResolvedValueOnce(false);

    await handler(req as unknown as AuthRequest, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining("Forbidden") })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when user is not authenticated", async () => {
    req = { params: { conversationId: "conv-1" } };

    await handler(req as unknown as AuthRequest, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining("unauthorized") })
    );
  });

  it("returns 400 when conversationId is missing", async () => {
    req = { user: { id: "user-1" }, params: {} };

    await handler(req as unknown as AuthRequest, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining("conversationId") })
    );
  });
});
