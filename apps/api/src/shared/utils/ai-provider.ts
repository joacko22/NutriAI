import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import { config } from '../../config';

export interface AIMessage {
  role:    'user' | 'assistant';
  content: string;
}

// ── Gemini 2.0 Flash ─────────────────────────────────────────────────────────
async function streamWithGemini(
  messages:     AIMessage[],
  systemPrompt: string,
): Promise<ReadableStream<Uint8Array>> {
  const genAI = new GoogleGenerativeAI(config.ai.geminiKey);
  const model = genAI.getGenerativeModel({
    model:             'gemini-2.0-flash',
    systemInstruction: systemPrompt,
  });

  const history = messages.slice(0, -1).map((m) => ({
    role:  m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const chat   = model.startChat({ history });
  const last   = messages[messages.length - 1].content;
  const result = await chat.sendMessageStream(last);

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ text })}\n\n`));
        }
      }
      controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
      controller.close();
    },
  });
}

// ── Groq + Llama 3.3 70B ─────────────────────────────────────────────────────
async function streamWithGroq(
  messages:     AIMessage[],
  systemPrompt: string,
): Promise<ReadableStream<Uint8Array>> {
  const groq   = new Groq({ apiKey: config.ai.groqKey });
  const stream = await groq.chat.completions.create({
    model:      'llama-3.3-70b-versatile',
    max_tokens: 1024,
    stream:     true,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
  });

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? '';
        if (text) {
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ text })}\n\n`));
        }
      }
      controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
      controller.close();
    },
  });
}

// ── Non-streaming generation (for structured JSON output) ────────────────────
async function nonStreamGemini(prompt: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(config.ai.geminiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

async function nonStreamGroq(prompt: string): Promise<string> {
  const groq   = new Groq({ apiKey: config.ai.groqKey });
  const result = await groq.chat.completions.create({
    model:      'llama-3.3-70b-versatile',
    max_tokens: 8192,
    messages:   [{ role: 'user', content: prompt }],
  });
  return result.choices[0]?.message?.content ?? '';
}

export async function generateAI(prompt: string): Promise<string> {
  if (config.ai.geminiKey) {
    try {
      return await nonStreamGemini(prompt);
    } catch (err: any) {
      if (err?.status === 429 || err?.message?.includes('quota')) {
        console.warn('[AI] Gemini rate limit alcanzado, usando fallback Groq...');
      } else {
        throw err;
      }
    }
  }

  if (config.ai.groqKey) {
    return await nonStreamGroq(prompt);
  }

  throw new Error(
    'No hay AI provider configurado. Agregá GEMINI_API_KEY o GROQ_API_KEY en el archivo .env'
  );
}

// ── Factory con fallback automático ──────────────────────────────────────────
export async function streamAI(
  messages:     AIMessage[],
  systemPrompt: string,
): Promise<ReadableStream<Uint8Array>> {
  if (config.ai.geminiKey) {
    try {
      return await streamWithGemini(messages, systemPrompt);
    } catch (err: any) {
      if (err?.status === 429 || err?.message?.includes('quota')) {
        console.warn('[AI] Gemini rate limit alcanzado, usando fallback Groq...');
      } else {
        throw err;
      }
    }
  }

  if (config.ai.groqKey) {
    return await streamWithGroq(messages, systemPrompt);
  }

  throw new Error(
    'No hay AI provider configurado. Agregá GEMINI_API_KEY o GROQ_API_KEY en el archivo .env'
  );
}
