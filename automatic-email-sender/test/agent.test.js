import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRawMessage } from "../server/google.js";
import { draftIsComplete, newSession, sendApproved } from "../server/agent.js";

test("buildRawMessage produces a base64url RFC 2822 message", () => {
  const raw = buildRawMessage({ from: "me@example.com", to: "you@example.com", subject: "Hi there", body: "Hello\nWorld" });
  const decoded = Buffer.from(raw, "base64url").toString("utf8");
  assert.match(decoded, /^From: me@example.com\r\nTo: you@example.com\r\nSubject: Hi there\r\n/);
  assert.match(decoded, /Content-Type: text\/plain; charset=UTF-8/);
  const body = decoded.split("\r\n\r\n")[1];
  assert.equal(Buffer.from(body, "base64").toString("utf8"), "Hello\nWorld");
});

test("non-ASCII subjects are RFC 2047 encoded", () => {
  const raw = buildRawMessage({ from: "a@b.c", to: "d@e.f", subject: "שלום", body: "x" });
  const decoded = Buffer.from(raw, "base64url").toString("utf8");
  assert.match(decoded, /Subject: =\?UTF-8\?B\?[A-Za-z0-9+/=]+\?=/);
});

test("draftIsComplete requires all four fields", () => {
  assert.equal(draftIsComplete({ from: "a@b.c", to: "d@e.f", subject: "s", body: "b" }), true);
  assert.equal(draftIsComplete({ from: "a@b.c", to: "", subject: "s", body: "b" }), false);
  assert.equal(draftIsComplete(null), false);
});

test("sendApproved refuses when no review has happened", async () => {
  const s = newSession();
  s.draft = { from: "a@b.c", to: "d@e.f", subject: "s", body: "b" };
  s.state = "collecting";
  await assert.rejects(() => sendApproved(s), /Review the draft first/);
});

test("sendApproved refuses an account that is not connected", async () => {
  const s = newSession();
  s.draft = { from: "nobody@example.com", to: "d@e.f", subject: "s", body: "b" };
  s.state = "review";
  await assert.rejects(() => sendApproved(s), /not a connected Gmail account/);
});
