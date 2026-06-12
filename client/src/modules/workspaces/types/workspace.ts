export type WorkspaceRole = "OWNER" | "ADMIN" | "MEMBER";

export interface WorkspaceMember {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  joinedAt: string;
  user?: {
    username: string;
    avatarUrl: string | null;
  };
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  members?: WorkspaceMember[];
}
