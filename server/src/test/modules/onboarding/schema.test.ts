import { describe, it, expect } from "vitest";

const { completeOnboardingSchema } = await import(
  "@/modules/onboarding/onboarding.schema.js"
);

describe("onboarding schemas", () => {
  describe("completeOnboardingSchema", () => {
    it("accepts minimal payload (skip workspace)", () => {
      const result = completeOnboardingSchema.parse({
        fullName: "Alice Smith",
        skipWorkspace: true,
      });
      expect(result.fullName).toBe("Alice Smith");
      expect(result.skipWorkspace).toBe(true);
    });

    it("accepts full payload with workspace creation", () => {
      const result = completeOnboardingSchema.parse({
        fullName: "Alice Smith",
        bio: "Hello!",
        avatarUrl: "https://example.com/avatar.jpg",
        workspaceName: "My Team",
        workspaceSlug: "my-team",
      });
      expect(result.workspaceName).toBe("My Team");
    });

    it("rejects empty fullName", () => {
      expect(() =>
        completeOnboardingSchema.parse({ fullName: "" })
      ).toThrow();
    });

    it("accepts workspaceName without workspaceSlug (optional fields)", () => {
      const result = completeOnboardingSchema.parse({
        fullName: "Alice",
        workspaceName: "Team",
      });
      expect(result.workspaceName).toBe("Team");
      expect(result.workspaceSlug).toBeUndefined();
    });

    it("accepts workspaceSlug without workspaceName (optional fields)", () => {
      const result = completeOnboardingSchema.parse({
        fullName: "Alice",
        workspaceSlug: "team",
      });
      expect(result.workspaceSlug).toBe("team");
      expect(result.workspaceName).toBeUndefined();
    });
  });
});
