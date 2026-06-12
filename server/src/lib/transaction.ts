import { prisma } from "./db.js";

/**
 * Run a Prisma transaction. This is the only place services interact with prisma directly,
 * and only to create a transaction scope. All actual data access happens in repositories.
 */
export const runTransaction = <T>(
  fn: (tx: any) => Promise<T>
): Promise<T> => {
  return prisma.$transaction(fn);
};
