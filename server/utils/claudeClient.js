const fetch = require('node-fetch');
const { recordCall } = require('../agents/metrics');

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;
const DEFAULT_TIMEOUT_MS = 30000;

// Haiku pricing (per 1M tokens)
const COST_INPUT  = 0.25;
const COST_OUTPUT = 1.25;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function callClaude(prompt, options = {}) {
  const {
    maxTokens = 600,
    model     = 'claude-haiku-4-5-20251001',
    agentId   = 'unknown',
    callType  = 'generation',
    timeout   = DEFAULT_TIMEOUT_MS,
    retries   = MAX_RETRIES,
  } = options;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

  let lastError;
  const startTime = Date.now();

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        timeout,
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model, max_tokens: maxTokens,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (res.status === 429 || res.status >= 500) {
        lastError = new Error(`Claude API ${res.status}`);
        if (attempt < retries) await sleep(BASE_DELAY_MS * Math.pow(2, attempt - 1));
        continue;
      }
      if (!res.ok) throw new Error(`Claude API ${res.status} — non-retryable`);

      const data     = await res.json();
      const text     = data.content[0].text.trim();
      const latencyMs = Date.now() - startTime;
      const inputTokens  = data.usage?.input_tokens  || Math.ceil(prompt.length / 4);
      const outputTokens = data.usage?.output_tokens || Math.ceil(text.length   / 4);
      const costUsd = ((inputTokens / 1e6) * COST_INPUT) + ((outputTokens / 1e6) * COST_OUTPUT);

      recordCall({ agentId, callType, latencyMs, inputTokens, outputTokens, costUsd, attempt, success: true });
      return text;

    } catch (err) {
      if (err.message.includes('non-retryable')) throw err;
      lastError = err.type === 'request-timeout'
        ? new Error(`Timeout after ${timeout}ms (attempt ${attempt}/${retries})`)
        : err;
      if (attempt < retries) await sleep(BASE_DELAY_MS * Math.pow(2, attempt - 1));
    }
  }

  recordCall({ agentId, callType, latencyMs: Date.now() - startTime, success: false, error: lastError.message });
  throw lastError;
}

async function callClaudeJSON(prompt, options = {}) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    const p = attempt === 1 ? prompt
      : `${prompt}\n\nCRITICAL: Your last response was not valid JSON. Return ONLY raw JSON — no markdown, no code blocks, no explanation.`;
    const raw     = await callClaude(p, options);
    const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    try {
      const parsed = JSON.parse(cleaned);
      if (options.schema && !validateSchema(parsed, options.schema)) {
        if (attempt < 2) continue;
        throw new Error(`Schema mismatch: expected ${options.schema.type}`);
      }
      return parsed;
    } catch (err) {
      if (attempt >= 2) throw new Error(`JSON parse failed: ${err.message}\nRaw: ${raw.slice(0, 200)}`);
    }
  }
}

function validateSchema(data, schema) {
  if (schema.type === 'array'  && !Array.isArray(data)) return false;
  if (schema.type === 'object' && (typeof data !== 'object' || Array.isArray(data))) return false;
  if (schema.required) {
    for (const f of schema.required) { if (!(f in data)) return false; }
  }
  return true;
}

// ── Agentic loop: model can call tools (functions you define) before answering.
// Each iteration sends the conversation so far; if the model asks for a tool,
// we run the matching handler locally and feed the result back as a
// "tool_result" message, then ask again — until it gives a final text answer.
async function callClaudeWithTools(prompt, options = {}) {
  const {
    maxTokens    = 1024,
    model        = 'claude-haiku-4-5-20251001',
    agentId      = 'unknown',
    callType     = 'agentic',
    timeout      = DEFAULT_TIMEOUT_MS,
    tools        = [],
    toolHandlers = {},
    system       = undefined,
    maxSteps     = 6,
  } = options;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

  const messages = [{ role: 'user', content: prompt }];
  const toolLog  = [];
  let totalInputTokens = 0, totalOutputTokens = 0, totalCostUsd = 0;
  const startTime = Date.now();

  for (let step = 1; step <= maxSteps; step++) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      timeout,
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model, max_tokens: maxTokens, messages,
        ...(system ? { system } : {}),
        ...(tools.length ? { tools } : {}),
      }),
    });

    if (!res.ok) throw new Error(`Claude API ${res.status} (tool-use step ${step})`);
    const data = await res.json();

    const inputTokens  = data.usage?.input_tokens  || 0;
    const outputTokens = data.usage?.output_tokens || 0;
    totalInputTokens  += inputTokens;
    totalOutputTokens += outputTokens;
    totalCostUsd += ((inputTokens / 1e6) * COST_INPUT) + ((outputTokens / 1e6) * COST_OUTPUT);

    messages.push({ role: 'assistant', content: data.content });

    if (data.stop_reason !== 'tool_use') {
      const text = (data.content.find(b => b.type === 'text') || {}).text || '';
      recordCall({ agentId, callType, latencyMs: Date.now() - startTime, inputTokens: totalInputTokens, outputTokens: totalOutputTokens, costUsd: totalCostUsd, attempt: step, success: true });
      return { text: text.trim(), toolLog, steps: step };
    }

    const toolUses = data.content.filter(b => b.type === 'tool_use');
    const toolResults = [];
    for (const use of toolUses) {
      const handler = toolHandlers[use.name];
      let result;
      try {
        result = handler ? await handler(use.input) : { error: `No handler registered for tool "${use.name}"` };
      } catch (err) {
        result = { error: err.message };
      }
      toolLog.push({ tool: use.name, input: use.input, result });
      toolResults.push({ type: 'tool_result', tool_use_id: use.id, content: JSON.stringify(result) });
    }
    messages.push({ role: 'user', content: toolResults });
  }

  recordCall({ agentId, callType, latencyMs: Date.now() - startTime, inputTokens: totalInputTokens, outputTokens: totalOutputTokens, costUsd: totalCostUsd, attempt: maxSteps, success: false, error: 'maxSteps exceeded' });
  throw new Error(`Tool-use loop exceeded ${maxSteps} steps without a final answer`);
}

module.exports = { callClaude, callClaudeJSON, callClaudeWithTools };
