import type { NotificationType } from "@prisma/client";

// ──── DTOs ────

export interface NotificationDTO {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  imageUrl: string | null;
  read: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export interface NotificationPage {
  data: NotificationDTO[];
  nextCursor: string | null;
}

export interface UnreadCountResult {
  count: number;
}

// ──── Service Input DTOs ────

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  imageUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface PaginationParams {
  cursor?: string;
  limit?: number;
  type?: string; // comma-separated list of NotificationType values to filter by
}
