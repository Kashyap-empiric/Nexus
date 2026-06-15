// ──── DTOs ────

export interface UserSearchResult {
  id: string;
  username: string;
  email: string;
  avatarUrl: string | null;
}

export interface UserSearchParams {
  query: string;
  currentUserId: string;
}
