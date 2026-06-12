// ──── DTOs ────

export interface UserSearchResult {
  id: string;
  username: string;
  avatarUrl: string | null;
}

export interface UserSearchParams {
  query: string;
  currentUserId: string;
}
