import { Router } from "express";
import { authMiddleware } from "@/middlewares/auth.js";
import { rejectDeletingAccount } from "@/middlewares/accountStatus.js";
import { validate } from "@/middlewares/validate.js";
import {
  getUserWorkspaces,
  getWorkspaceDetails,
  getWorkspaceChannels,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  leaveWorkspace,
  createChannel,
  updateChannel,
  deleteChannel,
  getWorkspaceMembers,
  updateMemberRole,
  removeWorkspaceMember,
  inviteMemberByUsername,
  inviteMembers,
  inviteByEmail,
  getChannelMembers,
  addChannelMembers,
  removeChannelMember,
} from "./workspaces.controller.js";
import {
  workspaceIdParamsSchema,
  channelIdParamsSchema,
  channelMemberIdParamsSchema,
  memberIdParamsSchema,
  createWorkspaceBodySchema,
  updateWorkspaceBodySchema,
  createChannelBodySchema,
  updateChannelBodySchema,
  inviteByUsernameBodySchema,
  inviteMultipleBodySchema,
  inviteByEmailBodySchema,
  updateMemberRoleBodySchema,
  addChannelMembersSchema,
} from "./workspaces.schema.js";
import { getWorkspaceThreads } from "@/modules/messages/messages.controller.js";

const router = Router();

router.use(authMiddleware);
router.use(rejectDeletingAccount);

router.get("/", getUserWorkspaces);
router.post("/", validate({ body: createWorkspaceBodySchema }), createWorkspace);
router.get("/:id", validate({ params: workspaceIdParamsSchema }), getWorkspaceDetails);
router.patch("/:id", validate({ params: workspaceIdParamsSchema, body: updateWorkspaceBodySchema }), updateWorkspace);
router.delete("/:id", validate({ params: workspaceIdParamsSchema }), deleteWorkspace);
router.post("/:id/leave", validate({ params: workspaceIdParamsSchema }), leaveWorkspace);

router.get(
  "/:id/threads",
  validate({ params: workspaceIdParamsSchema }),
  getWorkspaceThreads
);

router.get("/:id/channels", validate({ params: workspaceIdParamsSchema }), getWorkspaceChannels);
router.post("/:id/channels", validate({ params: workspaceIdParamsSchema, body: createChannelBodySchema }), createChannel);
router.patch("/:id/channels/:channelId", validate({ params: channelIdParamsSchema, body: updateChannelBodySchema }), updateChannel);
router.delete("/:id/channels/:channelId", validate({ params: channelIdParamsSchema }), deleteChannel);
router.get("/:id/members", validate({ params: workspaceIdParamsSchema }), getWorkspaceMembers);
router.post("/:id/invite", validate({ params: workspaceIdParamsSchema, body: inviteByUsernameBodySchema }), inviteMemberByUsername);
router.post("/:id/invite-multiple", validate({ params: workspaceIdParamsSchema, body: inviteMultipleBodySchema }), inviteMembers);
router.post("/:id/invite-email", validate({ params: workspaceIdParamsSchema, body: inviteByEmailBodySchema }), inviteByEmail);
router.get("/:id/channels/:channelId/members", validate({ params: channelIdParamsSchema }), getChannelMembers);
router.post("/:id/channels/:channelId/members", validate({ params: channelIdParamsSchema, body: addChannelMembersSchema }), addChannelMembers);
router.delete("/:id/channels/:channelId/members/:userId", validate({ params: channelMemberIdParamsSchema }), removeChannelMember);
router.patch("/:id/members/:userId/role", validate({ params: memberIdParamsSchema, body: updateMemberRoleBodySchema }), updateMemberRole);
router.delete("/:id/members/:userId", validate({ params: memberIdParamsSchema }), removeWorkspaceMember);

export default router;
