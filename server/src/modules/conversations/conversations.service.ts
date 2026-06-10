import { uuidv7 } from "uuidv7"
import { prisma } from "@/lib/db"
import { getIO } from "@/socket/socket.js";
import { SOCKET_EVENTS } from "@/shared/socket-events.js";

const buildDmPair = (userIdA: string, userIdB: string) => {
    return [userIdA, userIdB].sort().join(":");
};

export const getConversationById = async (conversationId: string) => {
    return prisma.conversation.findUnique({
        where: {
            id: conversationId
        },
        include: {
            members: {
                include: {
                    user: {
                        select: {
                            id: true, username: true, avatarUrl: true
                        }
                    }
                }
            }
        }
    })
}

export const getUserConversations = async (userId: string) => {
    const conversations = await prisma.conversation.findMany({
        where: { members: { some: { userId } } },
        include: {
            members: {
                include: {
                    user: {
                        select: {
                            id: true, username: true, avatarUrl: true
                        }
                    }
                }
            },
            latestMessage: {
                select: { 
                    id: true,
                    userId: true,
                    content: true,
                    deletedAt: true,
                    createdAt: true,
                    user: {
                        select: {
                            username: true
                        }
                    }
                }
            },
        },
        orderBy: { updatedAt: 'desc' }
    });

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
            const whereClause: any = {
                conversationId: conv.id,
                userId: { not: userId },
            };

            if (member?.lastReadMessageId) {
                whereClause.id = { gt: member.lastReadMessageId };
            }

            const unreadCount = await prisma.message.count({
                where: whereClause
            });

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
    return prisma.conversation.findUnique({
        where: {
            dmPair,
        },
        include: {
            members: {
                include: {
                    user: true
                }
            }
        }
    })
}

export const createDM = async (userIdA: string, userIdB: string) => {
    const dmPair = buildDmPair(userIdA, userIdB);
    return prisma.conversation.create({
        data: {
            id: uuidv7(),
            type: "DM",
            isPrivate: true,
            dmPair,
            members: {
                create: [
                    {
                        id: uuidv7(),
                        userId: userIdA,
                    },
                    {
                        id: uuidv7(),
                        userId: userIdB,
                    },
                ]
            }
        },
        include: {
            members: {
                include: {
                    user: true,
                }
            }
        }
    })
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
    const member = await prisma.conversationMember.update({
        where: {
            conversationId_userId: {
                conversationId,
                userId
            }
        },
        data: {
            lastReadMessageId: messageId
        }
    });

    return member;
};