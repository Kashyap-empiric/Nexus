import * as usersRepo from "./users.repository.js";

export const searchUsers = async (query: string, currentUserId: string) => {
  return usersRepo.searchUsers(query, currentUserId);
};
