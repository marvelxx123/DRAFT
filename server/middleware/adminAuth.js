const crypto = require('crypto');

// In-memory sessions: token -> expiresAt
const sessions = new Map();
const SESSION_TTL = 8 * 60 * 60 * 1000; // 8 hours

function makeToken() {
  return crypto.randomBytes(32).toString('hex');
}

function createSession() {
  const token = makeToken();
  sessions.set(token, Date.now() + SESSION_TTL);
  return token;
}

function validateSession(token) {
  if (!token) return false;
  const exp = sessions.get(token);
  if (!exp) return false;
  if (Date.now() > exp) { sessions.delete(token); return false; }
  return true;
}

function checkPassword(provided) {
  const expected = process.env.ADMIN_PASSWORD || 'change-this-password';
  // Constant-time comparison
  const a = Buffer.from(provided + '');
  const b = Buffer.from(expected + '');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function requireAdmin(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  if (!validateSession(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

module.exports = { createSession, validateSession, checkPassword, requireAdmin };
