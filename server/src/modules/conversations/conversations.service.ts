import { uuidv7 } from "uuidv7"
import * as conversationsRepo from "./conversations.repository.js";

const buildDmPair = (userIdA: string, userIdB: string) => {
    return [userIdA, userIdB].sort().join(":");
};

export const getConversationById = async (conversationId: string) => {
    return conversationsRepo.findById(conversationId);
}

export const getUserConversations = async (userId: string) => {
    const conversations = await conversationsRepo.findDMsByUserId(userId);

    // 1. Identify unread candidates
    const conversationsWithState = conversations.map(conv => {
        const member = conv.members.find(m => m.userId === userId);
        const hasUnread = Boolean(
            member &&
            conv.latestMessageId &&
            conv.latestMessageId !== member.lastReadMessageId &&
            conv.latestMessage?.userId !== userId
        );
        return { conv, member, hasUnread };
    });

    const unreadCandidates = conversationsWithState.filter(c => c.hasUnread);

    // 2. Only execute count queries for that subset
    const unreadCounts = await Promise.all(
        unreadCandidates.map(async ({ conv, member }) => {
            const unreadCount = await conversationsRepo.countUnreadMessages(
                conv.id,
                userId,
                member?.lastReadMessageId
            );
            return { conversationId: conv.id, unreadCount };
        })
    );

    const countsMap = Object.fromEntries(unreadCounts.map(uc => [uc.conversationId, uc.unreadCount]));

    // 3. Return identically formatted payload
    return conversationsWithState.map(({ conv }) => ({
        ...conv,
        unreadCount: countsMap[conv.id] || 0
    }));
};

export const getDMByUsers = async (userIdA: string, userIdB: string) => {
    const dmPair = buildDmPair(userIdA, userIdB);
    return conversationsRepo.findDMByPair(dmPair);
}

/**
 * Schema Invariant: DMs must ALWAYS have a null workspaceId.
 */
export const createDM = async (userIdA: string, userIdB: string) => {
    const dmPair = buildDmPair(userIdA, userIdB);
    return conversationsRepo.createDM({
        id: uuidv7(),
        type: "DM",
        workspaceId: null,
        isPrivate: true,
        dmPair,
        members: {
            create: [
                { userId: userIdA },
                { userId: userIdB },
            ]
        }
    });
}

export const createOrGetDM = async (userIdA: string, userIdB: string) => {
    const existingConversation = await getDMByUsers(userIdA, userIdB);
    if (existingConversation) {
        return { created: false, conversation: existingConversation };
    }
    try {
        const conversation = await createDM(userIdA, userIdB);
        return { created: true, conversation };
    } catch (error: any) {
        if (error.code === "P2002") {
            const conversation = await getDMByUsers(
                userIdA,
                userIdB
            );
            if (conversation) {
                return { created: false, conversation };
            }
        }
        throw error;
    }
}

export const updateLastReadMessage = async (conversationId: string, userId: string, messageId: string) => {
    return conversationsRepo.updateLastReadMessage(conversationId, userId, messageId);
};