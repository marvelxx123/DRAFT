// ── asyncHandler: the missing piece of Express error handling ──────────────
// LESSON: this is one of the most-reinvented five-line functions in the
// entire Node ecosystem, and worth understanding deeply rather than
// copy-pasting.
//
// Express route handlers look like `(req, res, next) => { ... }`. If code
// inside throws SYNCHRONOUSLY, Express catches it automatically and routes
// it to your error-handling middleware. But if your handler is `async` and
// it *rejects* (e.g. `await taskRepository.find(...)` throws because the DB
// call failed), that rejection does NOT automatically reach Express's error
// handling — it just becomes an unhandled promise rejection and the request
// hangs forever with no response. (This was fixed in Express 5, but we're
// deliberately using Express 4 here because it's still what you'll meet in
// most real-world codebases and tutorials — good to understand the problem
// it exists to solve.)
//
// The fix: wrap every async handler so that if the promise it returns
// rejects, we manually call `next(error)` ourselves.
export function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
