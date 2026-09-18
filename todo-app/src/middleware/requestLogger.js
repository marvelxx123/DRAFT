// ── requestLogger: your first look at Express middleware ───────────────────
// LESSON: EVERY Express middleware has the same shape: `(req, res, next) =>`.
// `req` is the incoming request, `res` is the outgoing response you'll
// eventually send, and `next` is a function you call to say "I'm done, pass
// control to whatever middleware/route comes after me." Middleware run in
// the exact order you `app.use()` them — that order IS the request pipeline.
//
// This one logs *after* the response finishes, not before it's sent, so we
// can log the real status code and how long the whole request took. We do
// that by listening for the 'finish' event on `res`, then immediately call
// `next()` to let the request continue through the rest of the pipeline
// (in this case, into the actual route handler) — logging doesn't need to
// block anything.
import { logger } from '../utils/logger.js';

export function requestLogger(req, res, next) {
  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    logger.info('request', {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
    });
  });

  next();
}
