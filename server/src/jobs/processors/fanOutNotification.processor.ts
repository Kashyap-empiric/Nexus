import { createAndDispatch } from "@/modules/notifications/notifications.service.js";
import type { FanOutNotificationJob } from "../types.js";

export async function processFanOutNotification(data: FanOutNotificationJob): Promise<void> {
  const { userIds, template } = data;

  if (userIds.length === 0) {
    console.log(`[Job] fan-out type=${data.type}  no recipients, skipped`);
    return;
  }

  const results = await Promise.allSettled(
    userIds.map((userId) =>
      createAndDispatch({
        userId,
        type: data.type as unknown as Parameters<typeof createAndDispatch>[0]["type"],
        title: template.title,
        body: template.body,
        link: template.link,
        metadata: template.metadata,
      }).catch((err) => {
        console.error(`[Job] fan-out failed for user=${userId} type=${data.type}:`, err);
      }),
    ),
  );

  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  console.log(`[Job] fan-out ✓  type=${data.type}  sent=${succeeded}/${userIds.length}`);
}
