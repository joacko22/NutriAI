import { Readable } from 'stream';
import { Router }   from 'express';
import { z }        from 'zod';
import { authenticate }   from '../../shared/middleware/auth.middleware';
import { createRateLimit } from '../../shared/middleware/rate-limit.middleware';
import { chatService }    from './chat.service';

// 20 messages per minute per user
const messageRateLimit = createRateLimit({ windowSecs: 60, maxRequests: 20, keyPrefix: 'chat' });

export const chatRouter = Router();

const messageSchema = z.object({
  content: z.string().min(1, 'El mensaje no puede estar vacío').max(4000),
});

// GET /api/v1/chat/history
chatRouter.get('/history', authenticate, async (req, res) => {
  const messages = await chatService.getHistory(req.user!.id);
  res.json(messages);
});

// DELETE /api/v1/chat/history
chatRouter.delete('/history', authenticate, async (req, res) => {
  await chatService.clearHistory(req.user!.id);
  res.json({ message: 'Historial eliminado correctamente' });
});

// POST /api/v1/chat/message — SSE streaming
chatRouter.post('/message', authenticate, messageRateLimit, async (req, res) => {
  const { content } = messageSchema.parse(req.body);

  res.setHeader('Content-Type',      'text/event-stream');
  res.setHeader('Cache-Control',     'no-cache');
  res.setHeader('Connection',        'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  let fullText = '';

  try {
    const { stream, saveResponse } = await chatService.sendMessage(req.user!.id, content);

    // Convert Web ReadableStream → Node.js Readable to pipe into Express response
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nodeStream = Readable.fromWeb(stream as any);

    nodeStream.on('data', (chunk: Buffer) => {
      const raw = chunk.toString();
      res.write(raw);

      // Accumulate assistant text from SSE frames to persist after streaming ends
      for (const line of raw.split('\n')) {
        if (!line.startsWith('data: ') || line.includes('[DONE]')) continue;
        try {
          const parsed = JSON.parse(line.slice(6)) as { text?: string };
          if (parsed.text) fullText += parsed.text;
        } catch { /* malformed SSE frame — skip */ }
      }
    });

    nodeStream.on('end', async () => {
      await saveResponse(fullText);
      if (!res.writableEnded) res.end();
    });

    nodeStream.on('error', () => {
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ error: 'Error en el streaming' })}\n\n`);
        res.end();
      }
    });

    // Release the stream if the client disconnects before it finishes
    req.on('close', () => nodeStream.destroy());

  } catch {
    res.write(`data: ${JSON.stringify({ error: 'Error al iniciar el streaming' })}\n\n`);
    res.end();
  }
});
