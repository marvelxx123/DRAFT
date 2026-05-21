const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { log } = require('./logger');
const config = require('../../jaxConfig');

const AGENT_ID = 'email';
const EMAIL_FILE = path.join(__dirname, '../../data/email-sequences.json');

// These are the 4 emails every garage door lead needs:
// 1. Immediate follow-up after form submission (within 5 min)
// 2. No-response follow-up (24 hours later)
// 3. Final check-in (3 days, then stop)
// 4. Monthly nurture tip (keeps you top of mind for referrals)

async function callClaude(prompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 900,
      messages: [{ role: 'user', content: prompt }] }),
  });
  if (!res.ok) throw new Error(`Claude API ${res.status}`);
  return (await res.json()).content[0].text.trim();
}

function readEmails() {
  try { return JSON.parse(fs.readFileSync(EMAIL_FILE, 'utf8')); }
  catch { return { sequences: [] }; }
}

function wrapHtml(title, body) {
  const phone    = config.business.phone;
  const phoneRaw = config.business.phoneRaw;
  const name     = config.business.name;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title>
<style>
body{font-family:Arial,sans-serif;background:#f5f5f5;color:#222;margin:0;padding:0}
.wrap{max-width:580px;margin:0 auto;background:#fff;padding:36px 32px}
.logo{font-size:22px;font-weight:900;color:#d32f2f;margin-bottom:28px;letter-spacing:-0.5px}
.btn{display:inline-block;background:#d32f2f;color:#fff;font-weight:700;
  padding:13px 26px;text-decoration:none;font-size:15px;border-radius:6px;margin:20px 0}
.phone-big{font-size:24px;font-weight:900;color:#d32f2f;text-decoration:none}
.footer{margin-top:32px;font-size:11px;color:#999;border-top:1px solid #eee;padding-top:16px}
p{line-height:1.7;font-size:15px;margin-bottom:14px}
</style></head>
<body><div class="wrap">
<div class="logo">904 Garage Doors</div>
${body}
<div class="footer">${name} · Nassau County &amp; Jacksonville, FL · Licensed &amp; Insured<br>
<a href="tel:${phoneRaw}" style="color:#d32f2f">${phone}</a> · Reply to this email or call/text anytime</div>
</div></body></html>`;
}

async function run() {
  log(AGENT_ID, 'info', 'Email agent starting — generating lead follow-up sequences…');
  const data  = readEmails();
  const phone = config.business.phone;
  const name  = config.business.name;

  // Pick a random market to personalize the nurture tip
  const market = config.priorityMarkets[Math.floor(Math.random() * config.priorityMarkets.length)];

  const sequence = { id: Date.now(), date: new Date().toISOString(), market: market.name };

  try {
    // 1. Immediate follow-up (sent within 5 min of form submission)
    const immediateBody = await callClaude(
      `Write the body of a short follow-up email for ${name}, a garage door repair company in Nassau County / Jacksonville FL. ` +
      `This email is sent automatically within 5 minutes after someone fills the contact form on the website. ` +
      `Phone: ${phone}. Tone: fast, personal, like the owner wrote it from their phone. ` +
      `3 short paragraphs: (1) confirm we got their request (2) what happens next — we call/text within 5 min (3) if urgent, here's the number. ` +
      `Sign off as "904 Garage Doors". Include <a href="tel:+19044683428" class="phone-big">${phone}</a> as a clickable link. HTML paragraphs only.`
    );
    sequence.immediate = {
      subject: `We got your request — calling you shortly`,
      html: wrapHtml('Your Request — 904 Garage Doors', immediateBody),
      sendDelay: 'Within 5 minutes of form submission',
    };
    log(AGENT_ID, 'success', 'Immediate follow-up email generated');

    // 2. No-response follow-up (24 hours later — if they haven't called back)
    const followUpBody = await callClaude(
      `Write a 24-hour follow-up email body for ${name} to a lead who filled a form but hasn't responded yet. ` +
      `Phone: ${phone}. Location: Nassau County / Jacksonville FL. ` +
      `Tone: helpful, zero pressure, short. 2 paragraphs: ` +
      `(1) checking in — still available to help, mention same-day service ` +
      `(2) give them an easy out ("if you got it sorted, no worries") + the phone number again. ` +
      `Make it feel human, not automated. HTML paragraphs only.`
    );
    sequence.followUp24h = {
      subject: `Still here if you need garage door help`,
      html: wrapHtml('Following Up — 904 Garage Doors', followUpBody),
      sendDelay: '24 hours after initial submission (if no response)',
    };
    log(AGENT_ID, 'success', '24h follow-up email generated');

    // 3. Final check-in (3 days out — last touch before moving on)
    const finalBody = await callClaude(
      `Write a final 3-day follow-up email for ${name}. Short — max 3 sentences. ` +
      `Friendly close-out: if they handled it, great. If not, we're still here. ` +
      `End with: "Feel free to save my number: ${phone}. I serve ${market.name} and all of Nassau County." ` +
      `Sign off personally. HTML paragraphs only. No pressure at all.`
    );
    sequence.finalCheckIn = {
      subject: `Last check-in on your garage door`,
      html: wrapHtml('Final Check-In — 904 Garage Doors', finalBody),
      sendDelay: '3 days after initial submission (if still no response)',
    };
    log(AGENT_ID, 'success', 'Final check-in email generated');

    // 4. Monthly nurture tip (for past customers — keeps you top of mind for referrals)
    const nurtureTip = await callClaude(
      `Write a short monthly garage door maintenance tip email for homeowners in ${market.name}, FL. ` +
      `From: ${name}. Phone: ${phone}. ` +
      `Format: subject line on first line labeled SUBJECT:, then email body. ` +
      `Body: 1 short practical tip specific to Florida climate (humidity, heat, occasional salt air). ` +
      `Mention ${market.name} or ${market.county} County. End with: "Questions? Call or text me: ${phone}. —904 Garage Doors." ` +
      `Friendly, useful, not salesy. Max 100 words. HTML paragraphs only.`
    );
    const nurtureLines = nurtureTip.split('\n').filter(Boolean);
    const nurtureSubject = nurtureLines[0].replace(/^SUBJECT:\s*/i, '').trim();
    const nurtureBody = nurtureLines.slice(1).join('\n');
    sequence.monthlyNurture = {
      subject: nurtureSubject || `Your monthly garage door tip — ${name}`,
      html: wrapHtml('Monthly Tip — 904 Garage Doors', nurtureBody),
      sendSchedule: 'Monthly — send to past customers to stay top of mind and generate referrals',
      market: market.name,
    };
    log(AGENT_ID, 'success', `Monthly nurture tip generated for ${market.name}`);

    data.sequences.unshift(sequence);
    data.sequences = data.sequences.slice(0, 20);
    data.lastUpdated = new Date().toISOString();
    fs.writeFileSync(EMAIL_FILE, JSON.stringify(data, null, 2));
    log(AGENT_ID, 'success', 'Email agent run complete. View sequences in data/email-sequences.json');
    log(AGENT_ID, 'info', 'To send automatically: set up Gmail SMTP or SendGrid in .env');
  } catch (err) {
    log(AGENT_ID, 'error', `Email agent error: ${err.message}`);
  }
}

module.exports = { run, AGENT_ID };
