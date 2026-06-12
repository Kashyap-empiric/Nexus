export type WorkspaceRole = "OWNER" | "ADMIN" | "MEMBER";

export interface WorkspaceMember {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  joinedAt: string;
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
