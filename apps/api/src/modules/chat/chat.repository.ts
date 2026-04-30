import { prisma } from '../../config/prisma';

export const chatRepository = {
  async findOrCreateConversation(userId: string) {
    const existing = await prisma.conversation.findFirst({
      where:   { userId },
      orderBy: { updatedAt: 'desc' },
    });
    if (existing) return existing;
    return prisma.conversation.create({ data: { userId } });
  },

  // Returns messages newest-first so the caller can take(limit) from the end efficiently.
  // Caller must reverse() before sending to AI or the client.
  getMessages(conversationId: string, limit: number) {
    return prisma.message.findMany({
      where:   { conversationId },
      orderBy: { createdAt: 'desc' },
      take:    limit,
    });
  },

  saveMessage(conversationId: string, role: 'user' | 'assistant', content: string) {
    return prisma.message.create({
      data: { conversationId, role, content },
    });
  },

  // Deletes all conversations for the user; messages cascade via onDelete: Cascade.
  clearHistory(userId: string) {
    return prisma.conversation.deleteMany({ where: { userId } });
  },
};
