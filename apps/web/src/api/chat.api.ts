import { api } from './client';
import type { ChatMessage } from '@nutriai/shared';

export const chatApi = {
  history:      () => api.get<ChatMessage[]>('/api/v1/chat/history'),
  clearHistory: () => api.delete<{ message: string }>('/api/v1/chat/history'),

  // Returns the raw fetch Response so the caller can read the SSE stream
  sendMessage: (content: string) => api.stream('/api/v1/chat/message', { content }),
};
