// The voice email agent. One session = one email being composed.
//
// Every turn, Claude returns a small JSON object:
//   say    - what to speak back to the user
//   action - ask | review | send | cancel | chat
//   draft  - the current from/to/subject/body, or null
//
// Sending is gated in code, not only in the prompt: the server sends only when
// the previous turn was a "review" (the user heard the draft) and the user then
// approved it. The draft that goes out is the one that was reviewed.
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { listAccounts } from "./accounts.js";
import { listContacts } from "./contacts.js";
import { sendGmail } from "./google.js";

export const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";

const Draft = z.object({
  from: z.string().describe("Sending Gmail address. Must be one of the connected accounts."),
  to: z.string().describe("Recipient email address."),
  subject: z.string(),
  body: z.string().describe("Plain text email body."),
});

const Turn = z.object({
  say: z.string().describe("Spoken reply for the user. Plain sentences, no markdown."),
  action: z.enum(["ask", "review", "send", "cancel", "chat"]),
  draft: Draft.nullable(),
});

const STABLE_SYSTEM = `You are a voice email assistant. The user talks to you by voice and hears your replies through text-to-speech. Your job in each conversation is to compose exactly one email and get the user's explicit approval before it is sent.

An email needs four things: the sending account (from), the recipient (to), a subject, and the body.

How to work:
- The sending account must be one of the connected Gmail accounts listed below. If only one account is connected, use it without asking. If several are connected and the user has not said which, ask.
- Resolve recipient names with the contacts list below. If the name is not in the list and no address was given, ask for the address. When the user spells an address out loud, convert spoken forms: "at" becomes @, "dot" becomes ".", "underscore" becomes _, and remove spaces.
- Turn the dictation into a clean email: remove filler words and false starts, fix punctuation and capitalization, keep the user's meaning, tone, and language. Do not add information the user did not say. Do not add a signature unless the user asks for one or states their name for that purpose.
- If no subject was given, propose a short one from the content.
- Ask for missing information with one short question at a time (action "ask").
- As soon as all four parts are known, set action "review" and in "say" read the complete email aloud: who it is from, who it goes to, the subject, and the full body. Then ask whether to send it or change anything.
- Set action "send" only when the user clearly approves the draft they just heard, for example "yes send it", "approved", "looks good, send". Never set "send" before a review has been read aloud. Include the same draft again in the "send" turn.
- If the user asks for changes, apply them and set action "review" again, reading the updated email aloud.
- Set action "cancel" if the user wants to stop or discard the email.
- Use action "chat" for anything else, such as answering a question about what you can do.

Speech rules for "say":
- Plain spoken sentences. No markdown, no bullet points, no headings, no quotation marks around the body.
- Speech recognition makes mistakes. When a name or address sounds unusual, confirm it before the review.
- Always include a draft object whenever you have at least one of the four parts; use empty strings for parts still unknown.`;

function dynamicSystem() {
  const accounts = listAccounts();
  const contacts = listContacts();
  return [
    `Connected Gmail accounts (the "from" field must be exactly one of these):`,
    accounts.length ? accounts.map((a) => `- ${a.email}`).join("\n") : "- (none connected yet; tell the user to connect a Gmail account first)",
    "",
    "Contacts:",
    contacts.length ? contacts.map((c) => `- ${c.name}: ${c.email}`).join("\n") : "- (no contacts saved)",
    "",
    `Today is ${new Date().toDateString()}.`,
  ].join("\n");
}

let client;
function anthropic() {
  if (!client) client = new Anthropic();
  return client;
}

async function askClaude(messages) {
  const response = await anthropic().beta.messages.create({
    model: MODEL,
    max_tokens: 4096,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: [
      { type: "text", text: STABLE_SYSTEM, cache_control: { type: "ephemeral" } },
      { type: "text", text: dynamicSystem() },
    ],
    output_config: { effort: "medium", format: zodOutputFormat(Turn) },
    messages,
  });

  if (response.stop_reason === "refusal") {
    throw new Error(`The model declined this request${response.stop_details?.explanation ? `: ${response.stop_details.explanation}` : "."}`);
  }
  const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  const turn = Turn.parse(JSON.parse(text));
  return { turn, content: response.content };
}

export function newSession() {
  return {
    id: crypto.randomUUID(),
    messages: [],
    draft: null,
    state: "collecting", // collecting | review | sent | cancelled
    sent: null,
    updatedAt: Date.now(),
  };
}

function sameDraft(a, b) {
  return !!a && !!b && JSON.stringify(a) === JSON.stringify(b);
}

export function draftIsComplete(d) {
  return !!d && [d.from, d.to, d.subject, d.body].every((v) => typeof v === "string" && v.trim());
}

// Send gate shared by voice approval and the on-screen button.
export async function sendApproved(session) {
  if (session.state !== "review" || !draftIsComplete(session.draft)) {
    throw new Error("Nothing is waiting for approval. Review the draft first.");
  }
  const connected = listAccounts().some((a) => a.email === session.draft.from.toLowerCase());
  if (!connected) throw new Error(`${session.draft.from} is not a connected Gmail account.`);
  const result = await sendGmail(session.draft);
  session.state = "sent";
  session.sent = { ...result, at: new Date().toISOString() };
  session.updatedAt = Date.now();
  return result;
}

export async function handleUserText(session, userText) {
  if (session.state === "sent" || session.state === "cancelled") {
    throw new Error("This conversation is finished. Start a new one.");
  }
  session.messages.push({ role: "user", content: userText });
  const { turn, content } = await askClaude(session.messages);
  session.messages.push({ role: "assistant", content });
  session.updatedAt = Date.now();

  const previousState = session.state;
  const reviewedDraft = session.draft;

  if (turn.draft) session.draft = turn.draft;

  let say = turn.say;
  let action = turn.action;

  if (action === "send") {
    const approvable = previousState === "review" && draftIsComplete(reviewedDraft) && (!turn.draft || sameDraft(turn.draft, reviewedDraft));
    if (!approvable) {
      // The model jumped ahead or changed the draft while sending. Force a review instead.
      action = "review";
      session.state = draftIsComplete(session.draft) ? "review" : "collecting";
      if (!/send|approve/i.test(say)) say = `${say} Please confirm: should I send it?`;
    } else {
      session.draft = reviewedDraft;
      const result = await sendApproved(session);
      return { say: `Sent. ${say}`.trim(), action: "send", draft: session.draft, state: session.state, sent: result };
    }
  } else if (action === "review") {
    session.state = draftIsComplete(session.draft) ? "review" : "collecting";
  } else if (action === "cancel") {
    session.state = "cancelled";
  } else {
    // ask / chat: the user has not heard a final draft yet
    session.state = "collecting";
  }

  return { say, action, draft: session.draft, state: session.state, sent: null };
}
