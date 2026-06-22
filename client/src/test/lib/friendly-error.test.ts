import { describe, it, expect } from "vitest";
import { friendlyError } from "@/shared/lib/friendly-error";

describe("friendlyError", () => {
  it("returns fallback for empty/null/undefined input", () => {
    expect(friendlyError(null, "oops")).toBe("oops");
    expect(friendlyError(undefined, "oops")).toBe("oops");
    expect(friendlyError("", "oops")).toBe("oops");
  });

  it("maps 'network error' to friendly message", () => {
    expect(friendlyError("network error")).toBe("A network error occurred. Check your connection and try again.");
  });

  it("maps 'timeout' substring", () => {
    expect(friendlyError("Request timeout after 30s")).toBe("The request timed out. Please try again.");
  });

  it("maps 'econnrefused' substring", () => {
    expect(friendlyError("connect ECONNREFUSED")).toBe("Unable to connect to the server. Please try again later.");
  });

  it("maps 'too many requests'", () => {
    expect(friendlyError("too many requests")).toBe("Too many requests. Please wait a moment.");
  });

  it("maps 'rate limit'", () => {
    expect(friendlyError("rate limit exceeded")).toBe("Too many requests. Please wait a moment.");
  });

  it("maps 'internal server error'", () => {
    expect(friendlyError("Internal Server Error")).toBe("Something went wrong on our end. Please try again.");
  });

  it("maps 'not found'", () => {
    expect(friendlyError("Not found")).toBe("The requested resource was not found.");
  });

  it("maps 'forbidden'", () => {
    expect(friendlyError("Forbidden")).toBe("You don't have permission to do that.");
  });

  it("maps 'unauthorized'", () => {
    expect(friendlyError("Unauthorized")).toBe("You need to sign in to do that.");
  });

  it("maps 'validation failed'", () => {
    expect(friendlyError("validation failed")).toBe("Please check your input and try again.");
  });

  it("handles Error objects", () => {
    expect(friendlyError(new Error("timeout"))).toBe("The request timed out. Please try again.");
  });

  it("handles objects with response.data.error", () => {
    const err = { response: { data: { error: "rate limit" } } };
    expect(friendlyError(err)).toBe("Too many requests. Please wait a moment.");
  });

  it("handles objects with response but no data.error", () => {
    const err = { response: { data: {} }, message: "network error" };
    expect(friendlyError(err)).toBe("A network error occurred. Check your connection and try again.");
  });

  it("returns original message when no pattern matches", () => {
    expect(friendlyError("some random error")).toBe("some random error");
  });

  it("returns fallback when no match and no message", () => {
    expect(friendlyError(null)).toBe("Something went wrong.");
  });

  it("handles generic object with String fallback", () => {
    const err = { custom: true };
    expect(friendlyError(err)).toBe("[object Object]");
  });
});
