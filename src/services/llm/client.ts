// Calls the learner's own AI provider straight from the browser. Keys stay on this device and are
// sent only to the provider, in a request header (never in a URL).
import { hashString } from '@/core/hash';
import { db } from '@/data/db';
import { getSettings } from '@/data/settings';
import type { Settings } from '@/data/settings';
import type { LlmCacheRow } from '@/data/types';

export type Provider = Settings['llm']['provider'];

export const PROVIDERS: Record<Provider, { name: string; keyUrl: string; preferred: RegExp[] }> = {
  groq: {
    name: 'Groq',
    keyUrl: 'https://console.groq.com/keys',
    preferred: [/llama-3\.3-70b-versatile/, /llama.*70b/, /llama-4/, /gpt-oss-120b/, /llama/],
  },
  gemini: {
    name: 'Google Gemini',
    keyUrl: 'https://aistudio.google.com/apikey',
    preferred: [/gemini-.*flash$/, /gemini-.*flash-latest/, /gemini-.*flash/],
  },
};

export class LlmError extends Error {
  constructor(
    message: string,
    readonly kind: 'no-key' | 'auth' | 'rate' | 'network' | 'bad-response',
  ) {
    super(message);
  }
}

async function request(url: string, init: RequestInit): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(30_000) });
  } catch {
    throw new LlmError('Couldn’t reach the AI provider. Check your connection.', 'network');
  }
  if (res.status === 401 || res.status === 403) throw new LlmError('The API key was not accepted.', 'auth');
  if (res.status === 429) throw new LlmError('The free quota is used up for now. Try again in a minute.', 'rate');
  if (!res.ok) throw new LlmError(`The AI provider answered with an error (${res.status}).`, 'bad-response');
  return res.json();
}

/** Lists chat models available to this key, best default first. */
export async function listModels(provider: Provider, key: string): Promise<string[]> {
  if (!key) throw new LlmError('Add an API key first.', 'no-key');
  let ids: string[];
  if (provider === 'groq') {
    const data = (await request('https://api.groq.com/openai/v1/models', { headers: { Authorization: `Bearer ${key}` } })) as { data: { id: string }[] };
    ids = data.data.map((m) => m.id).filter((id) => !/whisper|guard|tts|playai|orpheus|distil/i.test(id));
  } else {
    const data = (await request('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { headers: { 'x-goog-api-key': key } })) as {
      models: { name: string; supportedGenerationMethods?: string[] }[];
    };
    ids = data.models
      .filter((m) => m.supportedGenerationMethods?.includes('generateContent') && /gemini/.test(m.name) && !/embedding|image|tts|audio/.test(m.name))
      .map((m) => m.name.replace(/^models\//, ''));
  }
  const rank = (id: string) => {
    const i = PROVIDERS[provider].preferred.findIndex((re) => re.test(id));
    return i < 0 ? 99 : i;
  };
  return ids.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

export interface Turn {
  role: 'user' | 'assistant';
  content: string;
}

/** One answer, as JSON text, from the learner's provider and model. */
async function complete(provider: Provider, key: string, model: string, system: string, turns: Turn[], temperature: number): Promise<string | undefined> {
  if (provider === 'groq') {
    const data = (await request('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, temperature, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: system }, ...turns] }),
    })) as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content;
  }
  const data = (await request(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: turns.map((t) => ({ role: t.role === 'assistant' ? 'model' : 'user', parts: [{ text: t.content }] })),
      generationConfig: { temperature, responseMimeType: 'application/json' },
    }),
  })) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  return data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('');
}

/** A conversation's next answer as JSON (never cached: the same words can deserve a new reply). */
export async function chatJson<T>(system: string, turns: Turn[]): Promise<T> {
  const { llm, apiKeys } = await getSettings();
  const key = apiKeys[llm.provider];
  if (!key) throw new LlmError('Add a free API key in Ordo → AI to chat here.', 'no-key');
  if (!llm.model) throw new LlmError('Choose a model in Ordo → AI.', 'no-key');
  const text = await complete(llm.provider, key, llm.model, system, turns, 0.7);
  try {
    return JSON.parse(text ?? '') as T;
  } catch {
    throw new LlmError('The AI answer could not be read. Try again.', 'bad-response');
  }
}

interface JsonRequest {
  system: string;
  user: string;
  /** Cache bucket; identical requests are answered from IndexedDB. */
  kind: LlmCacheRow['kind'];
}

/** Sends a prompt and returns the parsed JSON answer (cached). */
export async function askJson<T>({ system, user, kind }: JsonRequest): Promise<T> {
  const { llm, apiKeys } = await getSettings();
  const key = apiKeys[llm.provider];
  if (!key) throw new LlmError('Add a free API key in Ordo → AI to use explanations.', 'no-key');
  if (!llm.model) throw new LlmError('Choose a model in Ordo → AI.', 'no-key');

  const id = hashString(`${llm.provider}|${llm.model}|${kind}|${system}|${user}`);
  const cached = await db.llmCache.get(id);
  if (cached) return cached.response as T;

  const text = await complete(llm.provider, key, llm.model, system, [{ role: 'user', content: user }], 0.2);

  let parsed: T;
  try {
    parsed = JSON.parse(text ?? '') as T;
  } catch {
    throw new LlmError('The AI answer could not be read. Try again.', 'bad-response');
  }
  await db.llmCache.put({ id, kind, model: llm.model, response: parsed, createdAt: Date.now() });
  return parsed;
}
