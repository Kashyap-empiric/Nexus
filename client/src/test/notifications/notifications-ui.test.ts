import { describe, it, expect, vi, afterEach } from "vitest";
import { timeAgo, formatNotificationTime } from "@/modules/notifications/utils/notifications-ui";

afterEach(() => {
  vi.useRealTimers();
});

describe("timeAgo", () => {
  it('returns "just now" for < 60 seconds', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:01:00Z"));
    const date = new Date("2025-01-01T00:00:31Z").toISOString();
    expect(timeAgo(date)).toBe("just now");
  });

  it("returns minutes ago for < 60 minutes", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T01:00:00Z"));
    const date = new Date("2025-01-01T00:55:00Z").toISOString();
    expect(timeAgo(date)).toBe("5m ago");
  });

  it("returns hours ago for < 24 hours", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T05:00:00Z"));
    const date = new Date("2025-01-01T02:00:00Z").toISOString();
    expect(timeAgo(date)).toBe("3h ago");
  });

  it("returns days ago for < 7 days", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-08T00:00:00Z"));
    const date = new Date("2025-01-05T00:00:00Z").toISOString();
    expect(timeAgo(date)).toBe("3d ago");
  });

  it("returns weeks ago for < 30 days", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-22T00:00:00Z"));
    const date = new Date("2025-01-01T00:00:00Z").toISOString();
    expect(timeAgo(date)).toBe("3w ago");
  });

  it("returns formatted date for >= 30 days", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-03-01T00:00:00Z"));
    const date = new Date("2025-01-01T00:00:00Z").toISOString();
    const result = timeAgo(date);
    expect(result).toContain("1/1/2025");
  });
});

function mockDate(iso: string) {
  const now = new Date(iso);
  vi.useFakeTimers();
  vi.setSystemTime(now);
  return now;
}

describe("formatNotificationTime", () => {
  it("returns time only for today", () => {
    mockDate("2025-06-15T14:30:00Z");
    const date = new Date("2025-06-15T09:15:00Z").toISOString();
    const result = formatNotificationTime(date);
    expect(result).toMatch(/\d{1,2}:\d{2} (AM|PM)/);
  });

  it('returns "Yesterday" prefix for yesterday', () => {
    mockDate("2025-06-15T14:00:00Z");
    const yesterday = new Date("2025-06-14T09:15:00Z").toISOString();
    const result = formatNotificationTime(yesterday);
    expect(result).toMatch(/Yesterday \d{1,2}:\d{2} (AM|PM)/);
  });

  it("returns formatted date for older dates", () => {
    mockDate("2025-06-15T14:00:00Z");
    const older = new Date("2025-06-10T09:15:00Z").toISOString();
    const result = formatNotificationTime(older);
    expect(result).toMatch(/Jun 10 \d{1,2}:\d{2} (AM|PM)/);
  });
});
