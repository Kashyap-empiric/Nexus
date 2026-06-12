// ──── DTOs ────

export interface WorkspaceMemberDTO {
  id: string;
  workspaceId: string;
  userId: string;
  role: "ADMIN" | "MEMBER";
  joinedAt: Date;
  user: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
}

export interface WorkspaceDTO {
  id: string;
  name: string;
  imageUrl: string | null;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  members: WorkspaceMemberDTO[];
}

// ──── Service Input Types ────

export interface GetChannelsParams {
  workspaceId: string;
  userId: string;
}
