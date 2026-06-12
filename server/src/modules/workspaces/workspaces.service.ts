import * as conversationsRepo from "../conversations/conversations.repository.js";

export const getWorkspaceChannels = async (workspaceId: string) => {
    return conversationsRepo.findChannelByWorkspaceId(workspaceId);
};
