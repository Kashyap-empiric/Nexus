import { describe, it, expect } from "vitest";
import { stripMarkdown, cn } from "@/shared/lib/utils";

describe("stripMarkdown", () => {
  it("strips bold text", () => {
    expect(stripMarkdown("**bold**")).toBe("bold");
    expect(stripMarkdown("***bold italic***")).toBe("bold italic");
  });

  it("strips italic text", () => {
    expect(stripMarkdown("*italic*")).toBe("italic");
    expect(stripMarkdown("_italic_")).toBe("italic");
  });

  it("strips strikethrough", () => {
    expect(stripMarkdown("~~strikethrough~~")).toBe("strikethrough");
  });

  it("strips inline code", () => {
    expect(stripMarkdown("`code`")).toBe("code");
  });

  it("strips code blocks", () => {
    expect(stripMarkdown("```\ncode block\n```")).toBe("");
  });

  it("converts links to plain text", () => {
    expect(stripMarkdown("[link text](https://example.com)")).toBe("link text");
  });

  it("converts images to alt text", () => {
    expect(stripMarkdown("![alt](image.png)")).toBe("alt");
  });

  it("strips heading markers", () => {
    expect(stripMarkdown("# Heading\n## Sub")).toBe("Heading Sub");
  });

  it("strips blockquotes", () => {
    expect(stripMarkdown("> quote")).toBe("quote");
  });

  it("strips list markers", () => {
    expect(stripMarkdown("- item\n* item\n1. item")).toBe("item item item");
  });

  it("collapses whitespace", () => {
    expect(stripMarkdown("hello    world\n\n\ntest")).toBe("hello world test");
  });

  it("handles empty string", () => {
    expect(stripMarkdown("")).toBe("");
  });
});

describe("cn", () => {
  it("joins class names", () => {
    const result = cn("foo", "bar");
    expect(result).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    const result = cn("base", false && "hidden", "visible");
    expect(result).toBe("base visible");
  });

  it("handles undefined and null", () => {
    const result = cn("foo", undefined, null, "bar");
    expect(result).toBe("foo bar");
  });
});
