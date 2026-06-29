import { prisma } from "./db.js";
import type { Prisma } from "@prisma/client";


export const runTransaction = <T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> => {
  return prisma.$transaction(fn);
};
