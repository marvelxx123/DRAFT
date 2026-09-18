// ── A tiny structured logger ────────────────────────────────────────────────
// LESSON: `console.log` everywhere works fine solo, but in a real service
// you want every log line to have a consistent shape (timestamp, level,
// message) so you can grep/filter it, and to ship to `stderr` for errors vs
// `stdout` for everything else (the Unix convention — lets you redirect them
// separately: `node server.js 1>app.log 2>errors.log`). This isn't a
// replacement for a real logging library (pino, winston) in production, but
// it demonstrates exactly what those libraries are doing under the hood.
function timestamp() {
  return new Date().toISOString();
}

export const logger = {
  info(message, meta = {}) {
    process.stdout.write(`${JSON.stringify({ level: 'info', time: timestamp(), message, ...meta })}\n`);
  },
  warn(message, meta = {}) {
    process.stderr.write(`${JSON.stringify({ level: 'warn', time: timestamp(), message, ...meta })}\n`);
  },
  error(message, meta = {}) {
    process.stderr.write(`${JSON.stringify({ level: 'error', time: timestamp(), message, ...meta })}\n`);
  },
};
