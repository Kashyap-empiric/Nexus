import * as z from "zod";

// =====================
// Params Schemas
// =====================

export const workspaceIdParamsSchema = z.object({
  id: z.string().min(1),
});

export type WorkspaceIdParams = z.infer<typeof workspaceIdParamsSchema>;

export const channelIdParamsSchema = z.object({
  id: z.string().min(1),
  channelId: z.string().uuid(),
});

export type ChannelIdParams = z.infer<typeof channelIdParamsSchema>;

export const memberIdParamsSchema = z.object({
  id: z.string().min(1),
  userId: z.string().uuid(),
});

export type MemberIdParams = z.infer<typeof memberIdParamsSchema>;

export const channelMemberIdParamsSchema = z.object({
  id: z.string().min(1),
  channelId: z.string().uuid(),
  userId: z.string().uuid(),
});

export type ChannelMemberIdParams = z.infer<typeof channelMemberIdParamsSchema>;

// =====================
// Body Schemas
// =====================

export const createWorkspaceBodySchema = z.object({
  name: z.string().min(1, "Workspace name is required").max(100),
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(
      /^[a-z0-9-]+$/,
      "Slug must contain only lowercase letters, numbers, and hyphens"
    ),
  imageUrl: z.string().url().optional(),
  iconPath: z.string().optional(),
  description: z.string().max(500).optional(),
});

export type CreateWorkspaceBody = z.infer<typeof createWorkspaceBodySchema>;

export const createChannelBodySchema = z.object({
  name: z.string().min(1, "Channel name is required").max(80),
  visibility: z.enum(["PUBLIC", "PRIVATE"]),
});

export type CreateChannelBody = z.infer<typeof createChannelBodySchema>;

export const updateWorkspaceBodySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens").optional(),
  imageUrl: z.string().url().optional(),
  iconPath: z.string().optional(),
  description: z.string().max(500).optional(),
});

export type UpdateWorkspaceBody = z.infer<typeof updateWorkspaceBodySchema>;

export const updateChannelBodySchema = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(500).optional(),
  visibility: z.enum(["PUBLIC", "PRIVATE"]).optional(),
}).refine((data) => data.name || data.description || data.visibility, {
  message: "At least one of name, description, or visibility must be provided",
});

export type UpdateChannelBody = z.infer<typeof updateChannelBodySchema>;

export const inviteByUsernameBodySchema = z.object({
  username: z.string().optional(),
  email: z.string().email().optional(),
}).refine((data) => data.username || data.email, {
  message: "Either username or email is required",
});

export type InviteByUsernameBody = z.infer<typeof inviteByUsernameBodySchema>;

export const inviteMultipleBodySchema = z.object({
  userIds: z.array(z.string().uuid()).min(1).max(50),
});

export type InviteMultipleBody = z.infer<typeof inviteMultipleBodySchema>;

export const updateMemberRoleBodySchema = z.object({
  role: z.enum(["OWNER", "ADMIN", "MEMBER"]),
});

export type UpdateMemberRoleBody = z.infer<typeof updateMemberRoleBodySchema>;

// Existing schemas (preserved for backward compatibility)
export const getWorkspaceChannelsParamsSchema = workspaceIdParamsSchema;

export type GetWorkspaceChannelsParams = z.infer<typeof getWorkspaceChannelsParamsSchema>;

export const addChannelMembersSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1).max(50),
});

export type AddChannelMembersInput = z.infer<typeof addChannelMembersSchema>;
