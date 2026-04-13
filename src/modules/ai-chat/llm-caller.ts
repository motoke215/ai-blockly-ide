// src/modules/ai-chat/llm-caller.ts
// Universal streaming caller. Routes Anthropic → @anthropic-ai/sdk,
// all others → openai SDK (compatible endpoint).

import Anthropic from '@anthropic-ai/sdk';
import OpenAI    from 'openai';
import type { ActiveModelConfig } from '@/shared/llm-providers';
import { PROVIDER_MAP }           from '@/shared/llm-providers';

export type StreamChunk = { token: string } | { done: true; totalTokens: number };

/**
 * Call any LLM with a system + user prompt, yield streaming tokens.
 * Works for both Anthropic and all OpenAI-compatible providers.
 */
export async function* streamLLM(
  config:     ActiveModelConfig,
  systemPrompt: string,
  userPrompt:   string,
  maxTokens = 4096
): AsyncGenerator<StreamChunk> {

  if (!config.apiKey) throw new Error(`No API key configured for provider: ${config.providerId}`);

  const provider = PROVIDER_MAP[config.providerId];
  if (!provider) throw new Error(`Unknown provider: ${config.providerId}`);

  // ── Anthropic native SDK ───────────────────────────────────────────────────
  if (config.providerId === 'anthropic') {
    const client = new Anthropic({
      apiKey:  config.apiKey,
      baseURL: config.baseUrl,
    });

    const stream = client.messages.stream({
      model:      config.modelId,
      max_tokens: maxTokens,
      system:     systemPrompt,
      messages:   [{ role: 'user', content: userPrompt }],
    });

    let total = 0;
    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        total += chunk.delta.text.length;
        yield { token: chunk.delta.text };
      }
    }
    yield { done: true, totalTokens: total };
    return;
  }

  // ── OpenAI-compatible SDK (everything else) ───────────────────────────────
  const client = new OpenAI({
    apiKey:  config.apiKey || 'none',    // Groq/Ollama may not need a key
    baseURL: config.baseUrl,
    dangerouslyAllowBrowser: true,       // Electron renderer has contextIsolation=true
  });

  const stream = await client.chat.completions.create({
    model:      config.modelId,
    max_tokens: maxTokens,
    stream:     true,
    messages:   [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userPrompt },
    ],
  });

  let total = 0;
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) {
      total += delta.length;
      yield { token: delta };
    }
  }
  yield { done: true, totalTokens: total };
}

/**
 * Non-streaming: collect full response. Used for quick validation calls.
 */
export async function callLLM(
  config:     ActiveModelConfig,
  systemPrompt: string,
  userPrompt:   string,
  maxTokens = 4096
): Promise<string> {
  let result = '';
  for await (const chunk of streamLLM(config, systemPrompt, userPrompt, maxTokens)) {
    if ('token' in chunk) result += chunk.token;
  }
  return result;
}
