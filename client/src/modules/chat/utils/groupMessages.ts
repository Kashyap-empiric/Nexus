import type { Message } from "../hooks/useMessages";

export interface MessageGroup {
  id: string;
  user: Message['user'];
  userId: string;
  createdAt: string;
  messages: Message[];
}

/**
 * Transforms a chronological array of messages into render groups.
 * Messages are grouped if they are from the same user, consecutive, 
 * and sent within 1 minute of the previous message in the group.
 */
export function groupMessages(messages: Message[]): MessageGroup[] {
  const groups: MessageGroup[] = [];
  
  for (const message of messages) {
    const lastGroup = groups[groups.length - 1];
    
    if (lastGroup) {
      const isSameUser = lastGroup.userId === message.userId;
      
      const lastMessage = lastGroup.messages[lastGroup.messages.length - 1];
      const lastMessageTime = new Date(lastMessage.createdAt).getTime();
      const currentMessageTime = new Date(message.createdAt).getTime();
      const timeDiffMinutes = (currentMessageTime - lastMessageTime) / (1000 * 60);
      
      if (isSameUser && timeDiffMinutes < 1) {
        lastGroup.messages.push(message);
        continue;
      }
    }
    
    // Start a new group
    groups.push({
      id: message.id,
      user: message.user,
      userId: message.userId,
      createdAt: message.createdAt,
      messages: [message],
    });
  }
  
  return groups;
}
