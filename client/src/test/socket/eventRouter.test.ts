import { describe, it, expect } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { createChatEventRouter } from "../../socket/eventRouter";

describe("createChatEventRouter", () => {
  it("returns an object with all expected keys", () => {
    const queryClient = new QueryClient();
    const router = createChatEventRouter(queryClient);

    const expectedKeys = [
      "messageNew",
      "messageRead",
      "messageUpdate",
      "messageDelete",
      "conversationNew",
      "conversationUpdate",
      "workspaceUpdate",
      "channelUpdate",
      "memberUpdate",
      "channelMemberAdded",
      "channelMemberRemoved",
      "messagePin",
      "messageUnpin",
      "notificationNew",
      "notificationUpdate",
    ];

    expect(Object.keys(router).sort()).toEqual(expectedKeys.sort());
  });

  it("each value is a function", () => {
    const queryClient = new QueryClient();
    const router = createChatEventRouter(queryClient);

    for (const key of Object.keys(router)) {
      
      expect(typeof (router as any)[key]).toBe("function");
    }
  });
});
