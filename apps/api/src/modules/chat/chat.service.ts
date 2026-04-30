import { streamAI, type AIMessage } from '../../shared/utils/ai-provider';
import { buildNutriSystemPrompt }   from '../../shared/utils/system-prompt';
import { profileRepository }        from '../profile/profile.repository';
import { recordsRepository }        from '../records/records.repository';
import { chatRepository }           from './chat.repository';

export const chatService = {
  async sendMessage(userId: string, content: string) {
    // 1. Load context in parallel — profile may not exist yet
    const [profile, lastRecord] = await Promise.all([
      profileRepository.findByUserId(userId),
      recordsRepository.findLatestByUser(userId),
    ]);

    // 2. Build system prompt with full patient context
    const systemPrompt = buildNutriSystemPrompt(
      profile
        ? {
            ...profile,
            lastRecord: lastRecord
              ? {
                  weightKg:   lastRecord.weightKg,
                  bodyFatPct: lastRecord.bodyFatPct,
                  waistCm:    lastRecord.waistCm,
                  recordedAt: lastRecord.recordedAt,
                }
              : null,
          }
        : null,
    );

    // 3. Get or create the active conversation and load previous messages
    const conversation = await chatRepository.findOrCreateConversation(userId);
    const rawMessages  = await chatRepository.getMessages(conversation.id, 40);

    // Reverse from newest-first (DB order) to chronological for AI context
    const history: AIMessage[] = rawMessages.reverse().map((m) => ({
      role:    m.role as 'user' | 'assistant',
      content: m.content,
    }));

    // 4. Stream — append the current user turn to history
    const messages: AIMessage[] = [...history, { role: 'user', content }];
    const stream = await streamAI(messages, systemPrompt);

    // 5. saveResponse persists both sides of the exchange once streaming completes.
    //    Saving after streaming (not before) avoids orphaned user messages if the
    //    stream errors before producing any output.
    const saveResponse = async (fullText: string) => {
      await chatRepository.saveMessage(conversation.id, 'user', content);
      if (fullText) {
        await chatRepository.saveMessage(conversation.id, 'assistant', fullText);
      }
    };

    return { stream, saveResponse };
  },

  async getHistory(userId: string) {
    const conversation = await chatRepository.findOrCreateConversation(userId);
    const messages     = await chatRepository.getMessages(conversation.id, 60);
    return messages.reverse(); // chronological
  },

  async clearHistory(userId: string) {
    await chatRepository.clearHistory(userId);
  },
};
