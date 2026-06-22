import { describe, it, expect } from "vitest";
import { loginSchema, registerSchema } from "@/modules/auth/schemas/auth";

describe("loginSchema", () => {
  it("accepts valid input", () => {
    const result = loginSchema.safeParse({ identifier: "alice", password: "secret" });
    expect(result.success).toBe(true);
  });

  it("rejects missing identifier", () => {
    const result = loginSchema.safeParse({ password: "secret" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("identifier");
    }
  });

  it("rejects empty identifier", () => {
    const result = loginSchema.safeParse({ identifier: "", password: "secret" });
    expect(result.success).toBe(false);
  });

  it("rejects missing password", () => {
    const result = loginSchema.safeParse({ identifier: "alice" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("password");
    }
  });
});

describe("registerSchema", () => {
  it("accepts valid input", () => {
    const result = registerSchema.safeParse({
      username: "alice",
      email: "alice@example.com",
      password: "Strong1!",
      confirmPassword: "Strong1!",
    });
    expect(result.success).toBe(true);
  });

  it("rejects short username", () => {
    const result = registerSchema.safeParse({
      username: "ab",
      email: "alice@example.com",
      password: "Strong1!",
      confirmPassword: "Strong1!",
    });
    expect(result.success).toBe(false);
  });

  it("rejects long username", () => {
    const result = registerSchema.safeParse({
      username: "a".repeat(31),
      email: "alice@example.com",
      password: "Strong1!",
      confirmPassword: "Strong1!",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = registerSchema.safeParse({
      username: "alice",
      email: "not-an-email",
      password: "Strong1!",
      confirmPassword: "Strong1!",
    });
    expect(result.success).toBe(false);
  });

  it("rejects short password", () => {
    const result = registerSchema.safeParse({
      username: "alice",
      email: "alice@example.com",
      password: "Short1!",
      confirmPassword: "Short1!",
    });
    expect(result.success).toBe(false);
  });

  it("rejects password without uppercase", () => {
    const result = registerSchema.safeParse({
      username: "alice",
      email: "alice@example.com",
      password: "weak1!@#",
      confirmPassword: "weak1!@#",
    });
    expect(result.success).toBe(false);
  });

  it("rejects password without number", () => {
    const result = registerSchema.safeParse({
      username: "alice",
      email: "alice@example.com",
      password: "Strong!@",
      confirmPassword: "Strong!@",
    });
    expect(result.success).toBe(false);
  });

  it("rejects password without special character", () => {
    const result = registerSchema.safeParse({
      username: "alice",
      email: "alice@example.com",
      password: "Strong1A",
      confirmPassword: "Strong1A",
    });
    expect(result.success).toBe(false);
  });

  it("rejects mismatched passwords", () => {
    const result = registerSchema.safeParse({
      username: "alice",
      email: "alice@example.com",
      password: "Strong1!",
      confirmPassword: "Strong2@",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("confirmPassword");
    }
  });
});
