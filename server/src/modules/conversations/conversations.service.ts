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
    return prisma.conversation.findMany({
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
            messages: {
                orderBy: { createdAt: 'desc' }, take: 1
            }
        },
        orderBy: { updatedAt: 'desc' }
    });
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

    try {
        const io = getIO();
        io.to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.MESSAGE_READ, {
            conversationId,
            userId,
            messageId
        });
    } catch (err) {
        console.error("[Socket.io] Failed to emit message:read", err);
    }

    return member;
};