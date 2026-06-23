import { uuidv7 } from "uuidv7"
import type { Prisma } from "@prisma/client";
import * as conversationsRepo from "./conversations.repository.js";

export const getConversationById = async (conversationId: string) => {
    return conversationsRepo.findById(conversationId);
}

export const getUserConversations = async (userId: string) => {
    const conversations = await conversationsRepo.findDMsByUserId(userId);

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

    return conversationsWithState.map(({ conv }) => ({
        ...conv,
        unreadCount: countsMap[conv.id] || 0
    }));
};

const buildDmPair = (userIdA: string, userIdB: string) => {
    return [userIdA, userIdB].sort().join(":");
};

export const getDMByUsers = async (userIdA: string, userIdB: string, tx?: Prisma.TransactionClient) => {
    const dmPair = buildDmPair(userIdA, userIdB);
    if (tx) {
        return conversationsRepo.findDMByPairInTransaction(tx, dmPair);
    }
    return conversationsRepo.findDMByPair(dmPair);
}


export const createDM = async (userIdA: string, userIdB: string, tx?: Prisma.TransactionClient) => {
    const dmPair = buildDmPair(userIdA, userIdB);
    const data = {
        id: uuidv7(),
        type: "DM" as const,
        workspaceId: null,
        isPrivate: true as const,
        dmPair,
        members: {
            create: [
                { userId: userIdA },
                { userId: userIdB },
            ]
        }
    };
    if (tx) {
        return conversationsRepo.createDMInTransaction(tx, data);
    }
    return conversationsRepo.createDM(data);
}

export const createOrGetDM = async (userIdA: string, userIdB: string, tx?: Prisma.TransactionClient) => {
    const existingConversation = await getDMByUsers(userIdA, userIdB, tx);
    if (existingConversation) {
        return { created: false, conversation: existingConversation };
    }
    try {
        const conversation = await createDM(userIdA, userIdB, tx);
        return { created: true, conversation };
    } catch (error: any) {
        if (error.code === "P2002") {
            const conversation = await getDMByUsers(
                userIdA,
                userIdB,
                tx
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