import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Send, Trash2, Bot, User } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { ChatHistorySkeleton } from '@/components/ui/Skeleton';
import { chatApi } from '@/api/chat.api';
import type { ChatMessage } from '@nutriai/shared';
import { formatDate } from '@/lib/utils';

function parseSseChunk(chunk: string): string[] {
  return chunk
    .split('\n')
    .filter(l => l.startsWith('data: '))
    .map(l => l.slice(6))
    .filter(t => t !== '[DONE]');
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-xs mt-0.5 ${
        isUser ? 'bg-accent/20 text-accent' : 'bg-raised border border-border text-ink-muted'
      }`}>
        {isUser ? <User size={13} /> : <Bot size={13} />}
      </div>
      <div className={`max-w-[75%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-accent/15 border border-accent/25 text-ink rounded-tr-sm'
            : 'bg-surface border border-border text-ink rounded-tl-sm'
        }`}>
          {msg.content}
        </div>
        <span className="text-xs text-ink-faint px-1">{formatDate(msg.createdAt)}</span>
      </div>
    </div>
  );
}

function StreamingBubble({ content }: { content: string }) {
  return (
    <div className="flex gap-3">
      <div className="h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-xs mt-0.5 bg-raised border border-border text-ink-muted">
        <Bot size={13} />
      </div>
      <div className="max-w-[75%]">
        <div className="rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm leading-relaxed bg-surface border border-border text-ink whitespace-pre-wrap">
          {content || <span className="inline-flex gap-1 items-center text-ink-faint"><span className="animate-blink">▋</span></span>}
          {content && <span className="animate-blink ml-0.5 text-accent">▋</span>}
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const qc = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  const [input, setInput]             = useState('');
  const [streaming, setStreaming]     = useState(false);
  const [streamContent, setStreamContent] = useState('');
  const [streamError, setStreamError] = useState('');
  const [optimisticMsg, setOptimisticMsg] = useState<ChatMessage | null>(null);

  const { data: history, isLoading } = useQuery({
    queryKey: ['chat', 'history'],
    queryFn:  chatApi.history,
    retry:    false,
  });

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [history, streamContent, optimisticMsg]);

  const handleSend = async () => {
    const content = input.trim();
    if (!content || streaming) return;

    setInput('');
    setStreamError('');
    setStreamContent('');

    const tempMsg: ChatMessage = {
      id: '__optimistic__',
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };
    setOptimisticMsg(tempMsg);
    setStreaming(true);

    try {
      const response = await chatApi.sendMessage(content);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader  = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let full   = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() ?? '';
        for (const chunk of lines) {
          for (const text of parseSseChunk(chunk)) {
            full += text;
            setStreamContent(full);
          }
        }
      }

      setOptimisticMsg(null);
      setStreamContent('');
      qc.invalidateQueries({ queryKey: ['chat', 'history'] });
    } catch (err) {
      const msg = 'Error al enviar el mensaje. Intentá de nuevo.';
      toast.error(msg);
      setStreamError(msg);
      setOptimisticMsg(null);
      setStreamContent('');
    } finally {
      setStreaming(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = async () => {
    if (!confirm('¿Borrar todo el historial de conversación?')) return;
    try {
      await chatApi.clearHistory();
      qc.invalidateQueries({ queryKey: ['chat', 'history'] });
      toast.success('Historial borrado');
    } catch {
      toast.error('Error al borrar el historial');
    }
  };

  const messages = history ?? [];
  const hasMessages = messages.length > 0 || !!optimisticMsg;

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-border bg-surface">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-accent/15 border border-accent/25 flex items-center justify-center">
            <Bot size={16} className="text-accent" />
          </div>
          <div>
            <p className="text-sm font-medium text-ink">NutriAI</p>
            <p className="text-xs text-ink-faint">
              {streaming ? (
                <span className="text-accent flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse inline-block" />
                  Escribiendo...
                </span>
              ) : 'Nutricionista virtual con IA'}
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleClear}
            className="text-ink-faint hover:text-danger transition-colors p-1.5 rounded-lg hover:bg-danger/10"
            title="Borrar historial"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
        {isLoading && <ChatHistorySkeleton />}

        {!isLoading && !hasMessages && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="h-16 w-16 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center">
              <Bot size={28} className="text-accent/60" />
            </div>
            <div>
              <p className="text-ink font-medium mb-1">¡Hola! Soy NutriAI</p>
              <p className="text-sm text-ink-muted max-w-sm">
                Tu nutricionista virtual. Puedo ayudarte con tu plan alimentario, calcular macros, responder dudas nutricionales y mucho más.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {[
                '¿Cuánta proteína necesito por día?',
                'Generame un desayuno alto en proteínas',
                '¿Cómo puedo mejorar mi déficit calórico?',
              ].map(s => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="text-xs border border-border rounded-full px-3 py-1.5 text-ink-muted hover:text-ink hover:border-accent/40 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(m => <MessageBubble key={m.id} msg={m} />)}
        {optimisticMsg && <MessageBubble msg={optimisticMsg} />}
        {(streaming || streamContent) && <StreamingBubble content={streamContent} />}

        {streamError && (
          <p className="text-xs text-danger text-center py-2">{streamError}</p>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-border bg-surface px-6 py-4">
        <div className="flex gap-3 items-end max-w-3xl mx-auto">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={e => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
            onKeyDown={handleKeyDown}
            placeholder="Preguntale algo a NutriAI... (Enter para enviar)"
            disabled={streaming}
            className="flex-1 resize-none bg-raised border border-border rounded-xl px-4 py-3 text-sm text-ink placeholder:text-ink-faint outline-none focus:border-accent/50 transition-colors disabled:opacity-50 leading-relaxed"
            style={{ minHeight: '44px', maxHeight: '120px' }}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || streaming}
            size="icon"
            className="shrink-0 h-11 w-11"
          >
            {streaming ? <Spinner /> : <Send size={16} />}
          </Button>
        </div>
        <p className="text-center text-xs text-ink-faint mt-2">
          Shift+Enter para nueva línea
        </p>
      </div>
    </div>
  );
}
