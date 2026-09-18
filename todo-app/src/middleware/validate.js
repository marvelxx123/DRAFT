// ── validate: turning a Zod schema into middleware ──────────────────────────
// LESSON: "never trust user input" is the single most important rule in
// backend development. Every field in req.body/req.params/req.query came
// from outside our program and could be anything — wrong type, missing,
// unexpectedly huge, or deliberately malicious. Rather than littering every
// controller with `if (!title) throw ...` checks, we define what "valid"
// looks like ONCE as a Zod schema (see src/validators/*.js) and turn it into
// reusable middleware here. By the time a controller runs, req.body is
// GUARANTEED to match the schema — controllers can stop defensively checking
// and just trust their input, the same way repositories trust the database.
import { ApiError } from '../utils/ApiError.js';

// `part` is which part of the request to validate: 'body' | 'params' | 'query'.
export function validate(schema, part = 'body') {
  return function validateMiddleware(req, _res, next) {
    const result = schema.safeParse(req[part]);
    if (!result.success) {
      return next(ApiError.badRequest('Validation failed', result.error.flatten().fieldErrors));
    }
    // Zod's `.parse()` doesn't just check the shape — it also applies
    // defaults, coercions (e.g. "5" → 5) and strips unknown keys. We
    // overwrite req[part] with the *parsed* version so downstream code gets
    // the cleaned-up data, not the raw input.
    req[part] = result.data;
    next();
  };
}
