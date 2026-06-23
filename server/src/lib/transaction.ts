import { prisma } from "./db.js";


export const runTransaction = <T>(
  fn: (tx: any) => Promise<T>
): Promise<T> => {
  return prisma.$transaction(fn);
};
