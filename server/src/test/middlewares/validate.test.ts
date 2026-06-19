import { describe, it, expect, vi } from "vitest";
import { z } from "zod";

const { validate } = await import("@/middlewares/validate.js");

function mockReqRes() {
  const req: any = { params: {}, query: {}, body: {} };
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  const next = vi.fn();
  return { req, res, next };
}

describe("validate middleware", () => {
  it("passes through valid body data", () => {
    const schema = z.object({ name: z.string() });
    const handler = validate({ body: schema });
    const { req, res, next } = mockReqRes();
    req.body = { name: "Alice" };

    handler(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(req.body).toEqual({ name: "Alice" });
  });

  it("rejects invalid body", () => {
    const schema = z.object({ name: z.string().min(1) });
    const handler = validate({ body: schema });
    const { req, res, next } = mockReqRes();
    req.body = { name: "" };

    handler(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Validation failed" })
    );
  });

  it("passes through valid params", () => {
    const schema = z.object({ id: z.string().uuid() });
    const handler = validate({ params: schema });
    const { req, res, next } = mockReqRes();
    req.params = { id: "550e8400-e29b-41d4-a716-446655440000" };

    handler(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.params.id).toBe("550e8400-e29b-41d4-a716-446655440000");
  });

  it("rejects invalid params", () => {
    const schema = z.object({ id: z.string().uuid() });
    const handler = validate({ params: schema });
    const { req, res, next } = mockReqRes();
    req.params = { id: "not-a-uuid" };

    handler(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("passes through valid query", () => {
    const schema = z.object({ limit: z.coerce.number().int().min(1) });
    const handler = validate({ query: schema });
    const { req, res, next } = mockReqRes();
    req.query = { limit: "50" };

    handler(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.query.limit).toBe(50);
  });

  it("coerces and validates query strings", () => {
    const schema = z.object({ limit: z.coerce.number().int().min(1).max(100).default(50) });
    const handler = validate({ query: schema });
    const { req, res, next } = mockReqRes();
    req.query = {};

    handler(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.query.limit).toBe(50);
  });

  it("handles non-Zod errors by passing to next", () => {
    const schema = z.object({ name: z.string() });
    const handler = validate({ body: schema });

    const badSchema = {
      parse: vi.fn().mockImplementation(() => {
        throw new Error("DB connection lost");
      }),
    } as any;

    const badHandler = validate({ body: badSchema });
    const { req, res, next } = mockReqRes();
    req.body = { name: "test" };

    badHandler(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it("validates all three (body, params, query) simultaneously", () => {
    const bodySchema = z.object({ content: z.string().min(1) });
    const paramsSchema = z.object({ conversationId: z.string().uuid() });
    const querySchema = z.object({ includeDeleted: z.coerce.boolean().optional() });

    const handler = validate({ body: bodySchema, params: paramsSchema, query: querySchema });
    const { req, res, next } = mockReqRes();
    req.body = { content: "Hello" };
    req.params = { conversationId: "550e8400-e29b-41d4-a716-446655440000" };
    req.query = {};

    handler(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it("rejects on first schema that fails", () => {
    const bodySchema = z.object({ content: z.string().min(1) });
    const paramsSchema = z.object({ conversationId: z.string().uuid() });

    const handler = validate({ body: bodySchema, params: paramsSchema });
    const { req, res, next } = mockReqRes();
    req.body = { content: "Hello" };
    req.params = { conversationId: "bad-id" };

    handler(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });
});
