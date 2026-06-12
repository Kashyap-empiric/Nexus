import { z } from "zod";

export const getWorkspaceChannelsParamsSchema = z.object({
  id: z.uuid(),
});

export type GetWorkspaceChannelsParams = z.infer<typeof getWorkspaceChannelsParamsSchema>;
