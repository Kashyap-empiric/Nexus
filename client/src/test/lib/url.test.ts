import { describe, it, expect } from "vitest";
import { API_ROUTES, APP_ROUTES } from "@/config/url";

describe("API_ROUTES", () => {
  describe("USERS", () => {
    it("SEARCH encodes query", () => {
      expect(API_ROUTES.USERS.SEARCH("alice")).toBe("/users/search?q=alice");
      expect(API_ROUTES.USERS.SEARCH("a b")).toBe("/users/search?q=a%20b");
    });
    it("ME", () => expect(API_ROUTES.USERS.ME).toBe("/users/me"));
    it("PROFILE", () => expect(API_ROUTES.USERS.PROFILE("u1")).toBe("/users/u1"));
    it("AVATAR", () => expect(API_ROUTES.USERS.AVATAR).toBe("/users/me/avatar"));
    it("STATUS", () => expect(API_ROUTES.USERS.STATUS).toBe("/users/me/status"));
    it("CHECK_USERNAME", () => expect(API_ROUTES.USERS.CHECK_USERNAME("foo")).toBe("/users/check-username?username=foo"));
    it("RESOLVE_USERNAME", () => expect(API_ROUTES.USERS.RESOLVE_USERNAME).toBe("/users/resolve-username"));
  });

  describe("CONVERSATIONS", () => {
    it("BASE", () => expect(API_ROUTES.CONVERSATIONS.BASE).toBe("/conversations"));
    it("DETAIL", () => expect(API_ROUTES.CONVERSATIONS.DETAIL("c1")).toBe("/conversations/c1"));
    it("READ", () => expect(API_ROUTES.CONVERSATIONS.READ("c1")).toBe("/conversations/c1/read"));
    it("MESSAGES without cursor", () => expect(API_ROUTES.CONVERSATIONS.MESSAGES("c1")).toBe("/conversations/c1/messages"));
    it("MESSAGES with cursor", () => expect(API_ROUTES.CONVERSATIONS.MESSAGES("c1", "abc")).toBe("/conversations/c1/messages?cursor=abc"));
    it("MESSAGE_DETAIL", () => expect(API_ROUTES.CONVERSATIONS.MESSAGE_DETAIL("c1", "m1")).toBe("/conversations/c1/messages/m1"));
    it("PINS", () => expect(API_ROUTES.CONVERSATIONS.PINS("c1")).toBe("/conversations/c1/pins"));
    it("PIN_DETAIL", () => expect(API_ROUTES.CONVERSATIONS.PIN_DETAIL("c1", "m1")).toBe("/conversations/c1/pins/m1"));
  });

  describe("INVITES", () => {
    it("INFO", () => expect(API_ROUTES.INVITES.INFO).toBe("/invites/info"));
    it("RESOLVE", () => expect(API_ROUTES.INVITES.RESOLVE).toBe("/invites/resolve"));
    it("GENERATE", () => expect(API_ROUTES.INVITES.GENERATE).toBe("/invites/generate"));
    it("DECLINE", () => expect(API_ROUTES.INVITES.DECLINE).toBe("/invites/decline"));
  });

  describe("NOTIFICATIONS", () => {
    it("BASE", () => expect(API_ROUTES.NOTIFICATIONS.BASE).toBe("/notifications"));
    it("UNREAD_COUNT", () => expect(API_ROUTES.NOTIFICATIONS.UNREAD_COUNT).toBe("/notifications/unread-count"));
    it("MARK_READ", () => expect(API_ROUTES.NOTIFICATIONS.MARK_READ("n1")).toBe("/notifications/n1/read"));
    it("MARK_ALL_READ", () => expect(API_ROUTES.NOTIFICATIONS.MARK_ALL_READ).toBe("/notifications/read-all"));
    it("PREFERENCES", () => expect(API_ROUTES.NOTIFICATIONS.PREFERENCES).toBe("/notifications/preferences"));
    it("PUSH_SUBSCRIBE", () => expect(API_ROUTES.NOTIFICATIONS.PUSH_SUBSCRIBE).toBe("/notifications/push/subscribe"));
  });

  describe("ONBOARDING", () => {
    it("COMPLETE", () => expect(API_ROUTES.ONBOARDING.COMPLETE).toBe("/onboarding/complete"));
  });

  describe("MESSAGES", () => {
    it("SEARCH", () => expect(API_ROUTES.MESSAGES.SEARCH("hello")).toBe("/messages/search?q=hello"));
  });

  describe("CHANNEL_MEMBERS", () => {
    it("returns path with workspace and channel ids", () => {
      expect(API_ROUTES.CHANNEL_MEMBERS("ws1", "ch1")).toBe("/workspaces/ws1/channels/ch1/members");
    });
  });

  describe("CHANNEL_MEMBER", () => {
    it("returns path with workspace, channel, and user ids", () => {
      expect(API_ROUTES.CHANNEL_MEMBER("ws1", "ch1", "u1")).toBe("/workspaces/ws1/channels/ch1/members/u1");
    });
  });
});

describe("APP_ROUTES", () => {
  it("HOME", () => expect(APP_ROUTES.HOME).toBe("/"));

  describe("AUTH", () => {
    it("INDEX", () => expect(APP_ROUTES.AUTH.INDEX).toBe("/auth"));
    it("LOGIN", () => expect(APP_ROUTES.AUTH.LOGIN).toBe("/login"));
    it("REGISTER", () => expect(APP_ROUTES.AUTH.REGISTER).toBe("/register"));
    it("FORGOT_PASSWORD", () => expect(APP_ROUTES.AUTH.FORGOT_PASSWORD).toBe("/forgot-password"));
    it("RESET_PASSWORD", () => expect(APP_ROUTES.AUTH.RESET_PASSWORD).toBe("/reset-password"));
    it("CALLBACK", () => expect(APP_ROUTES.AUTH.CALLBACK).toBe("/auth/callback"));
  });

  describe("CONVERSATIONS", () => {
    it("INDEX", () => expect(APP_ROUTES.CONVERSATIONS.INDEX).toBe("/conversations"));
    it("DETAIL", () => expect(APP_ROUTES.CONVERSATIONS.DETAIL("c1")).toBe("/conversations/c1"));
  });

  it("INVITE INDEX", () => expect(APP_ROUTES.INVITE.INDEX).toBe("/invite"));

  describe("WORKSPACES", () => {
    it("CHANNELS_PATH", () => expect(APP_ROUTES.WORKSPACES.CHANNELS_PATH).toBe("/channels"));
    it("CHANNEL", () => expect(APP_ROUTES.WORKSPACES.CHANNEL("ws1", "ch1")).toBe("/workspaces/ws1/channels/ch1"));
  });

  describe("NOTIFICATIONS", () => {
    it("INDEX", () => expect(APP_ROUTES.NOTIFICATIONS.INDEX).toBe("/notifications"));
  });

  describe("SETTINGS", () => {
    it("INDEX", () => expect(APP_ROUTES.SETTINGS.INDEX).toBe("/settings"));
    it("NOTIFICATIONS", () => expect(APP_ROUTES.SETTINGS.NOTIFICATIONS).toBe("/settings/notifications"));
  });
});
