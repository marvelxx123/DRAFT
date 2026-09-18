// ── requireAuth: proving who's making the request ───────────────────────────
// LESSON: HTTP is stateless — the server doesn't inherently remember who you
// are between requests. Two common ways to fix that: (1) sessions, where the
// server keeps a record and gives the client an opaque session ID cookie, or
// (2) tokens, where the server gives the client a self-contained, signed
// token (a JWT) that proves identity without the server storing anything.
// We're using JWTs here — the client sends `Authorization: Bearer <token>`
// on every request, and this middleware verifies it.
//
// A JWT has three base64url parts separated by dots: header.payload.signature.
// The payload is just readable JSON (never put secrets in it — anyone can
// base64-decode it) but the SIGNATURE is what makes it trustworthy: it's an
// HMAC of the header+payload using JWT_SECRET, which only our server knows.
// If a client tampers with the payload (e.g. changes their user id), the
// signature no longer matches and jwt.verify() throws. That's the entire
// security model — not encryption, just tamper-evidence.
import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/ApiError.js';
import { config } from '../config/env.js';

export function requireAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(ApiError.unauthorized('Missing or malformed Authorization header'));
  }

  try {
    const payload = jwt.verify(token, config.JWT_SECRET);
    // Attach the identity to `req` so every downstream handler can use
    // `req.user.id` — this is the ONLY place in the app that trusts a
    // user id from the network; everywhere else, req.user.id is the
    // source of truth, never a value from req.body or req.params.
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch (err) {
    // jwt.verify throws for: bad signature (tampered/forged token),
    // TokenExpiredError (past JWT_EXPIRES_IN), or malformed token entirely.
    // We collapse all of these to the same generic 401 — being specific
    // here ("expired" vs "invalid") would help an attacker fine-tune a
    // forgery attempt for no benefit to a legitimate user.
    next(ApiError.unauthorized('Invalid or expired token'));
  }
}
