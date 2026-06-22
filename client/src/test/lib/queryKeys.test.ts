import { describe, it, expect } from "vitest";
import { queryKeys } from "@/shared/constants/queryKeys";

describe("queryKeys", () => {
  it("conversations is ['conversations']", () => {
    expect(queryKeys.conversations).toEqual(["conversations"]);
  });

  it("conversation(id) returns ['conversations', id]", () => {
    expect(queryKeys.conversation("abc")).toEqual(["conversations", "abc"]);
  });

  it("messages(convId) returns ['messages', convId]", () => {
    expect(queryKeys.messages("conv-1")).toEqual(["messages", "conv-1"]);
  });

  it("messagesSearch(query) returns ['messages', 'search', query]", () => {
    expect(queryKeys.messagesSearch("hello")).toEqual(["messages", "search", "hello"]);
  });

  it("usersSearch(query) returns ['users', 'search', query]", () => {
    expect(queryKeys.usersSearch("alice")).toEqual(["users", "search", "alice"]);
  });

  it("notifications is ['notifications']", () => {
    expect(queryKeys.notifications).toEqual(["notifications"]);
  });

  it("notificationPreferences is ['notification-preferences']", () => {
    expect(queryKeys.notificationPreferences).toEqual(["notification-preferences"]);
  });

  it("unreadCount is ['unread-count']", () => {
    expect(queryKeys.unreadCount).toEqual(["unread-count"]);
  });
});
