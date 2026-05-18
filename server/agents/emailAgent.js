const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { log } = require('./logger');

const AGENT_ID = 'email';
const EMAIL_FILE = path.join(__dirname, '../../data/email-sequences.json');

// To actually SEND emails, set SENDGRID_API_KEY in your .env and wire up the
// sendEmail() function below using the SendGrid Node.js client.

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

function genCode(prefix) {
  return prefix + Math.random().toString(36).slice(2, 7).toUpperCase();
}

function readEmails() {
  try { return JSON.parse(fs.readFileSync(EMAIL_FILE, 'utf8')); }
  catch { return { sequences: [] }; }
}

function wrapHtml(title, body) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title>
<style>body{font-family:Arial,sans-serif;background:#080808;color:#f0f0f0;margin:0;padding:0}
.wrap{max-width:600px;margin:0 auto;padding:40px 24px}
.logo{font-size:32px;font-weight:900;letter-spacing:2px;color:#fff;margin-bottom:32px}
.logo span{color:#e8ff00}.btn{display:inline-block;background:#e8ff00;color:#000;
font-weight:700;padding:14px 28px;text-decoration:none;font-size:14px;letter-spacing:1px;
text-transform:uppercase;margin:24px 0}.footer{margin-top:40px;font-size:11px;color:#555;
border-top:1px solid #2a2a2a;padding-top:20px}</style></head>
<body><div class="wrap"><div class="logo">WEAR<span>IT</span></div>${body}
<div class="footer">© 2026 WEARIT · <a href="https://wearit.com/privacy.html" style="color:#555">Privacy Policy</a> · <a href="https://wearit.com/terms.html" style="color:#555">Terms</a> · You received this because you signed up at wearit.com. <a href="[unsubscribe_link]" style="color:#555">Unsubscribe</a></div>
</div></body></html>`;
}

async function run() {
  log(AGENT_ID, 'info', 'Email agent starting — generating 4 email sequences…');
  const data = readEmails();
  const welcomeCode   = genCode('WELCOME30-');
  const cartCode      = genCode('SAVE10-');
  const referralCode  = genCode('REFER15-');

  const sequence = { id: Date.now(), date: new Date().toISOString(), codes: { welcome: welcomeCode, cart: cartCode, referral: referralCode } };

  try {
    // 1. Welcome email
    const welcomeBody = await callClaude(
      `Write a welcome email body (HTML paragraphs only, no full HTML doc) for a new WEARIT subscriber. ` +
      `Tone: bold, warm, streetwear. Introduce: 20 customizable products, AI design studio, 48h fulfillment. ` +
      `Include a 30% off first order discount code: ${welcomeCode}. ` +
      `End with a clear CTA button placeholder: <a href="https://wearit.com/editor.html" class="btn">START DESIGNING →</a>. Max 200 words of body text.`
    );
    sequence.welcome = {
      subject: `Welcome to WEARIT — Here's 30% off your first order 🎨`,
      html: wrapHtml('Welcome to WEARIT', welcomeBody),
      discountCode: welcomeCode,
    };
    log(AGENT_ID, 'success', `Welcome email generated (code: ${welcomeCode})`);

    // 2. Abandoned cart email
    const cartBody = await callClaude(
      `Write an abandoned cart recovery email body (HTML paragraphs only) for WEARIT. ` +
      `The customer left without completing their order. Create urgency. Mention: designs don't get saved forever, limited spots. ` +
      `Include 10% off code: ${cartCode}. ` +
      `Include button: <a href="https://wearit.com/editor.html" class="btn">COMPLETE YOUR ORDER →</a>. Max 150 words. Streetwear tone.`
    );
    sequence.abandonedCart = {
      subject: `You left something behind — 10% off to finish your order`,
      html: wrapHtml('Complete Your Order', cartBody),
      discountCode: cartCode,
      sendDelay: '2 hours after cart abandonment',
    };
    log(AGENT_ID, 'success', `Abandoned cart email generated (code: ${cartCode})`);

    // 3. Post-purchase follow-up
    const postBody = await callClaude(
      `Write a post-purchase follow-up email body (HTML paragraphs only) for WEARIT. ` +
      `Customer just received their order. Thank them, ask for a review (link: https://wearit.com#reviews). ` +
      `Suggest 2-3 complementary products. Include a referral code ${referralCode} that gives them 15% off their next order and gives their friend 15% off. ` +
      `CTA: <a href="https://wearit.com/editor.html" class="btn">DESIGN SOMETHING NEW →</a>. Max 180 words. Warm but bold tone.`
    );
    sequence.postPurchase = {
      subject: `How's your WEARIT order looking? 👀`,
      html: wrapHtml('Thank You For Your Order', postBody),
      referralCode,
      sendDelay: '5 days after delivery',
    };
    log(AGENT_ID, 'success', 'Post-purchase follow-up email generated');

    // 4. Weekly promotional blast
    const promoBody = await callClaude(
      `Write a weekly promotional email body (HTML paragraphs only) for WEARIT. ` +
      `Highlight 3 trending products this week (pick from: Custom Hoodies, Sunglasses, Canvas Prints, Socks, Keychains). ` +
      `Create a limited-time deal (e.g. free shipping this weekend, 20% off mugs). ` +
      `Mention: new arrivals, personalization options. ` +
      `CTA: <a href="https://wearit.com/editor.html" class="btn">SHOP NOW →</a>. Max 200 words. High energy, streetwear editorial tone.`
    );
    const promoSubject = await callClaude(
      `Write a punchy email subject line for a WEARIT weekly promotional email. Max 50 chars. No emoji spam. Streetwear tone. Options: urgency, curiosity, exclusivity.`
    );
    sequence.weeklyPromo = {
      subject: promoSubject,
      html: wrapHtml('This Week at WEARIT', promoBody),
      sendSchedule: 'Every Thursday 10am',
    };
    log(AGENT_ID, 'success', 'Weekly promo email generated');

    data.sequences.unshift(sequence);
    data.sequences = data.sequences.slice(0, 20);
    data.lastUpdated = new Date().toISOString();
    fs.writeFileSync(EMAIL_FILE, JSON.stringify(data, null, 2));
    log(AGENT_ID, 'success', 'All 4 email sequences saved to data/email-sequences.json');
    log(AGENT_ID, 'info', 'To send emails: set SENDGRID_API_KEY in .env and connect SendGrid client');
    log(AGENT_ID, 'success', 'Email agent run complete.');
  } catch (err) {
    log(AGENT_ID, 'error', `Email agent error: ${err.message}`);
  }
}

module.exports = { run, AGENT_ID };
