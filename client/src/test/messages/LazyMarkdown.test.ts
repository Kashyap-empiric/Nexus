import { describe, it, expect } from "vitest";
import { processMentions } from "@/modules/messages/components/LazyMarkdown";

describe("processMentions", () => {
  it("converts @username at start of string to mention link", () => {
    expect(processMentions("@alice")).toBe("[@alice](#mention)");
  });

  it("converts @username after space to mention link", () => {
    expect(processMentions("hello @alice")).toBe("hello [@alice](#mention)");
  });

  it("does not convert @ in the middle of a word", () => {
    expect(processMentions("test@example.com")).toBe("test@example.com");
  });

  it("converts multiple mentions", () => {
    const result = processMentions("@alice hello @bob");
    expect(result).toBe("[@alice](#mention) hello [@bob](#mention)");
  });

  it("supports dots and dashes in usernames", () => {
    expect(processMentions("@john.doe")).toBe("[@john.doe](#mention)");
    expect(processMentions("@john-doe")).toBe("[@john-doe](#mention)");
  });

  it("supports underscores in usernames", () => {
    expect(processMentions("@john_doe")).toBe("[@john_doe](#mention)");
  });

  it("does not modify text without mentions", () => {
    expect(processMentions("just a normal message")).toBe("just a normal message");
  });

  it("handles empty string", () => {
    expect(processMentions("")).toBe("");
  });

  it("handles @at beginning with punctuation after", () => {
    expect(processMentions("@alice, check this")).toBe("[@alice](#mention), check this");
  });
});
