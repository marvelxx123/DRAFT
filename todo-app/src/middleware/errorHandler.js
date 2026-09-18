// ── errorHandler: the one place errors become HTTP responses ───────────────
// LESSON: Express recognizes error-handling middleware by ARITY — a function
// with exactly 4 parameters `(err, req, res, next)`. That 4th parameter is
// what makes Express treat it specially: instead of wiring it into the
// normal `app.use()` chain, Express skips straight to the first 4-arg
// middleware whenever anything calls `next(error)` or a synchronous handler
// throws. This MUST be registered last, after every route — it's the
// pipeline's final catch-all.
//
// Every error in this codebase ends up here eventually: a route throws an
// ApiError.notFound() → caught by asyncHandler → next(err) → lands here.
import { ZodError } from 'zod';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/env.js';

export function errorHandler(err, req, res, _next) {
  // A Zod validation error that slipped through without being wrapped in an
  // ApiError (belt-and-suspenders — middleware/validate.js normally catches
  // these itself, but this covers any we missed).
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: { message: 'Validation failed', details: err.flatten() },
    });
  }

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: { message: err.message, details: err.details },
    });
  }

  // Anything else is a genuine bug we didn't anticipate. Log the FULL error
  // (with stack trace) server-side for debugging, but never leak internals
  // like stack traces or raw SQL error messages to the client — that's an
  // information-disclosure risk (attackers learn your file paths, library
  // versions, schema).
  logger.error('unhandled error', {
    message: err.message,
    stack: err.stack,
    path: req.originalUrl,
  });

  res.status(500).json({
    error: {
      message: config.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    },
  });
}

// Handles requests that didn't match ANY route — registered right before
// errorHandler. Turns Express's default (an HTML 404 page) into a
// consistent JSON shape matching every other error response.
export function notFoundHandler(req, res) {
  res.status(404).json({ error: { message: `No route for ${req.method} ${req.originalUrl}` } });
}
