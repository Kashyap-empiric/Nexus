import { Queue } from "bullmq";
import { getBullConnectionOptions } from "./connection.js";

const connection = getBullConnectionOptions();

export const notificationQueue = connection
  ? new Queue("notifications", { connection })
  : null;

export const emailQueue = connection
  ? new Queue("email", { connection })
  : null;

export const cleanupQueue = connection
  ? new Queue("cleanup", { connection })
  : null;
