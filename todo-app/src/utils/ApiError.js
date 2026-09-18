// ── ApiError: giving errors an HTTP opinion ─────────────────────────────────
// LESSON: a plain `throw new Error('not found')` carries no information
// about what HTTP status code that should become. Somewhere, something has
// to decide "not found" → 404. We could sprinkle that decision all over the
// controllers, but instead we make ONE custom Error subclass that carries a
// statusCode, and throw it from anywhere in the app (repository, service,
// controller — doesn't matter). A single error-handling middleware
// (middleware/errorHandler.js) is the only place that reads `.statusCode`
// and turns it into a response. That's the whole pattern.
export class ApiError extends Error {
  constructor(statusCode, message, details = undefined) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
    // Marks this as an error we *expected* and handled deliberately (a bad
    // request, a missing resource) as opposed to a genuine bug (a null
    // pointer, a typo). errorHandler.js uses this to decide whether it's
    // safe to show `message` to the client, or whether to hide it behind a
    // generic "Internal Server Error" and log the real thing server-side.
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, details) {
    return new ApiError(400, message, details);
  }
  static unauthorized(message = 'Authentication required') {
    return new ApiError(401, message);
  }
  static forbidden(message = 'Not allowed to do that') {
    return new ApiError(403, message);
  }
  static notFound(message = 'Not found') {
    return new ApiError(404, message);
  }
  static conflict(message) {
    return new ApiError(409, message);
  }
}
