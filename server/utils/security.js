// Prompt injection patterns
const INJECTION_PATTERNS = [
  /ignore\s+(previous|all|above)\s+instructions/i,
  /forget\s+(everything|all|previous)/i,
  /system\s*prompt/i,
  /you\s+are\s+now\s+/i,
  /new\s+instructions?:/i,
  /override\s+(instructions?|rules?)/i,
  /\bDAN\b.*mode/i,
  /jailbreak/i,
  /act\s+as\s+if\s+you/i,
];

// Platform rule violations to catch in agent output
const VIOLATION_PATTERNS = [
  { pattern: /\bwe\s+(fix|repair|replace|install)\b/i,  rule: 'implies direct service' },
  { pattern: /\bour\s+technician\b/i,                   rule: 'implies employed technician' },
  { pattern: /\bfully\s+(licensed|insured|bonded)\b/i,  rule: 'liability claim' },
  { pattern: /\bflat[\s-]rate\b/i,                      rule: 'pricing guarantee' },
  { pattern: /\bno\s+surprises?\b/i,                    rule: 'pricing guarantee' },
  { pattern: /fixed\s+today,?\s+guaranteed/i,           rule: 'outcome guarantee' },
];

function sanitizeString(s, maxLen = 2000) {
  if (typeof s !== 'string') return s;
  return s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').slice(0, maxLen).trim();
}

function detectInjection(text) {
  return typeof text === 'string' && INJECTION_PATTERNS.some(p => p.test(text));
}

function sanitizeContactBody(body) {
  const fields  = ['name','phone','service','urgency','city','message','source','page','cta'];
  const cleaned = {};
  let injectionAttempt = false;
  for (const f of fields) {
    cleaned[f] = sanitizeString(body[f] || '');
    if (detectInjection(cleaned[f])) { injectionAttempt = true; cleaned[f] = '[filtered]'; }
  }
  return { cleaned, injectionAttempt };
}

function auditOutput(text) {
  const violations = [];
  for (const { pattern, rule } of VIOLATION_PATTERNS) {
    const match = text.match(pattern);
    if (match) violations.push({ rule, match: match[0] });
  }
  return violations;
}

module.exports = { sanitizeString, detectInjection, sanitizeContactBody, auditOutput };
