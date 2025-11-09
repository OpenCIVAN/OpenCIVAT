import { Chat } from '@mlc-ai/web-llm';

let chat = null;
const MODEL_ID = 'Qwen2.5-0.5B-instruct-q4f32_1-MLC'; // small, loads fast

async function ensureChatReady() {
  if (chat) return chat;
  chat = new Chat({ model: MODEL_ID });
  return chat;
}

export async function askLLM_WebLLM(statsSummaryJSON) {
  const chat = await ensureChatReady();

  const systemPrompt =
    'You are a radiology/3D-geometry assistant. You MUST return STRICT JSON with this schema: ' +
    '{ "findings":[ { "type":"anomaly|artifact|note", "signal":"curvature|density|symmetry|mixed", ' +
    '"regionHint":"short", "confidence":0..1, "indices":[int,...] } ] }. ' +
    'Always include at least one finding per signal present in the input JSON; ' +
    'if uncertain, reuse the provided hotspot indices. Do not include any text outside JSON.';

  const userPrompt =
    'Analyze this stats JSON and follow the schema strictly.\n' +
    JSON.stringify(statsSummaryJSON);

  try {
    const completion = await chat.completions.create({
      model: MODEL_ID,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
      stream: false,
      response_format: { type: 'json_object' },
    });

    const text = completion?.choices?.[0]?.message?.content?.trim?.() || '{"findings": []}';
    const parsed = JSON.parse(text);
    if (parsed && Array.isArray(parsed.findings)) return parsed;
  } catch (e) {
    console.warn('[WebLLM] fallback due to error:', e);
  }
  return { findings: [] };
}
