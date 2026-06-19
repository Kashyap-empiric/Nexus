import { describe, it, expect } from "vitest";

const {
  createWorkspaceBodySchema,
  updateWorkspaceBodySchema,
  workspaceIdParamsSchema,
  createChannelBodySchema,
  updateChannelBodySchema,
} = await import("@/modules/workspaces/workspaces.schema.js");

describe("workspaces schemas", () => {
  describe("createWorkspaceBodySchema", () => {
    it("accepts valid workspace creation", () => {
      const result = createWorkspaceBodySchema.parse({
        name: "My Workspace",
        slug: "my-workspace",
      });
      expect(result.name).toBe("My Workspace");
      expect(result.slug).toBe("my-workspace");
    });

    it("accepts optional fields", () => {
      const result = createWorkspaceBodySchema.parse({
        name: "Test",
        slug: "test",
        description: "A test workspace",
      });
      expect(result.description).toBe("A test workspace");
    });

    it("rejects empty name", () => {
      expect(() => createWorkspaceBodySchema.parse({ name: "", slug: "test" })).toThrow();
    });

    it("rejects invalid slug format", () => {
      expect(() =>
        createWorkspaceBodySchema.parse({ name: "Test", slug: "Invalid Slug!" })
      ).toThrow();
    });
  });

  describe("updateWorkspaceBodySchema", () => {
    it("accepts partial update", () => {
      const result = updateWorkspaceBodySchema.parse({ name: "Renamed" });
      expect(result.name).toBe("Renamed");
    });
  });

  describe("createChannelBodySchema", () => {
    it("accepts valid channel", () => {
      const result = createChannelBodySchema.parse({
        name: "general",
        visibility: "PUBLIC",
      });
      expect(result.name).toBe("general");
    });

    it("rejects invalid channel name", () => {
      expect(() =>
        createChannelBodySchema.parse({ name: "", visibility: "PUBLIC" })
      ).toThrow();
    });
  });

  describe("updateChannelBodySchema", () => {
    it("accepts partial channel update", () => {
      const result = updateChannelBodySchema.parse({ name: "new-name" });
      expect(result.name).toBe("new-name");
    });

    it("rejects empty update (no fields)", () => {
      expect(() => updateChannelBodySchema.parse({})).toThrow();
    });
  });
});
