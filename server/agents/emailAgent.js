const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { log } = require('./logger');

// ─────────────────────────────────────────────────────────────
// NOTE: To send emails, wire up your SENDGRID_API_KEY in .env:
//   SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxx
// Then integrate with @sendgrid/mail or the SendGrid REST API.
// This agent generates and saves email content only — it does
// not send emails. Sending logic should be added here once the
// SENDGRID_API_KEY is configured. Alternatively, replace with
// your Mailchimp / Klaviyo API integration.
// ─────────────────────────────────────────────────────────────

const AGENT_ID = 'email';
const EMAIL_FILE = path.join(__dirname, '../../data/email-sequences.json');

// Run interval: 24 hours (registered in agentRunner)
const INTERVAL_MS = 24 * 60 * 60 * 1000;

/** Generate a random welcome discount code like WELCOME30-A7K2 */
function generateWelcomeCode() {
  const suffix = Math.random().toString(36).toUpperCase().slice(2, 6);
  return `WELCOME30-${suffix}`;
}

/** Generate a random abandoned cart discount code like CART10-X9B3 */
function generateCartCode() {
  const suffix = Math.random().toString(36).toUpperCase().slice(2, 6);
  return `CART10-${suffix}`;
}

async function callClaude(prompt, maxTokens = 1400) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Claude API error: ${res.status}`);
  const data = await res.json();
  return data.content[0].text.trim();
}

function readEmails() {
  try { return JSON.parse(fs.readFileSync(EMAIL_FILE, 'utf8')); }
  catch { return []; }
}

/** Wrap raw body text in a complete WEARIT-branded HTML email shell */
function wrapEmailHtml(bodyContent, previewText = '') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<title>WEARIT</title>
${previewText ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${previewText}</div>` : ''}
<style>
  body { margin:0; padding:0; background:#080808; font-family:'Inter',Arial,sans-serif; color:#f0f0f0; }
  a { color:#e8ff00; text-decoration:none; }
  .wrapper { max-width:600px; margin:0 auto; background:#101010; }
  .header { background:#000; padding:24px 32px; border-bottom:2px solid #e8ff00; text-align:center; }
  .logo { font-family:Impact,'Arial Black',sans-serif; font-size:36px; letter-spacing:4px; color:#f0f0f0; }
  .logo span { color:#e8ff00; }
  .content { padding:40px 32px; }
  .cta-btn { display:inline-block; background:#e8ff00; color:#000 !important; font-family:Impact,sans-serif;
             font-size:16px; letter-spacing:2px; text-transform:uppercase; padding:16px 40px;
             border-radius:3px; margin:24px 0; text-decoration:none; }
  .code-box { background:#1e1e1e; border:1px solid #2a2a2a; border-left:4px solid #e8ff00;
              border-radius:3px; padding:16px 20px; margin:20px 0; text-align:center;
              font-family:monospace; font-size:22px; letter-spacing:4px; color:#e8ff00; }
  .product-row { display:flex; gap:16px; margin:24px 0; }
  .product-item { flex:1; background:#161616; border:1px solid #2a2a2a; border-radius:3px; padding:16px; text-align:center; }
  .product-item h3 { font-family:Impact,sans-serif; color:#e8ff00; font-size:14px; letter-spacing:2px;
                     text-transform:uppercase; margin:0 0 8px; }
  .product-item p { font-size:12px; color:#888; margin:0; line-height:1.5; }
  .divider { border:none; border-top:1px solid #2a2a2a; margin:32px 0; }
  .footer { background:#000; padding:24px 32px; text-align:center; border-top:1px solid #2a2a2a; }
  .footer p { font-size:11px; color:#555; margin:4px 0; line-height:1.6; }
  .footer a { color:#888; }
  h1 { font-family:Impact,'Arial Black',sans-serif; font-size:32px; letter-spacing:2px;
       text-transform:uppercase; color:#f0f0f0; margin:0 0 16px; line-height:1.1; }
  h2 { font-family:Impact,'Arial Black',sans-serif; font-size:20px; letter-spacing:1px;
       text-transform:uppercase; color:#e8ff00; margin:24px 0 12px; }
  p { font-size:15px; color:#888; line-height:1.8; margin:0 0 16px; }
  ul { color:#888; font-size:14px; line-height:1.8; padding-left:20px; margin:0 0 16px; }
  li::marker { color:#e8ff00; }
</style>
</head>
<body>
<table width="100%" cellpadding="0" cellspacing="0" role="presentation">
<tr><td align="center" style="padding:20px 16px; background:#080808;">
<div class="wrapper">
  <div class="header">
    <div class="logo">WEAR<span>IT</span></div>
  </div>
  <div class="content">
    ${bodyContent}
  </div>
  <hr class="divider" />
  <div class="footer">
    <p><a href="https://wearit.com">wearit.com</a> &nbsp;|&nbsp; <a href="mailto:support@wearit.com">support@wearit.com</a></p>
    <p>You're receiving this because you signed up at WEARIT. <a href="{{unsubscribe_url}}">Unsubscribe</a></p>
    <p>WEARIT &copy; 2026. All rights reserved.</p>
  </div>
</div>
</td></tr>
</table>
</body>
</html>`;
}

// ── 1. Welcome Email ─────────────────────────────────────────────

async function generateWelcomeEmail(discountCode) {
  const raw = await callClaude(
    `Write the BODY content for a welcome email for WEARIT, a bold streetwear custom print-on-demand brand.\n` +
    `The subscriber just signed up. Discount code: ${discountCode} (30% off first order).\n\n` +
    `Write HTML snippets (no full <html> shell — just the inner content):\n` +
    `- A warm but bold streetwear-toned greeting (h1 tag)\n` +
    `- 2–3 short paragraphs: welcome them, explain what WEARIT is, tease top products (T-Shirts, Hoodies, Mugs, Caps)\n` +
    `- The discount code in a highlighted .code-box div: <div class="code-box">${discountCode}</div>\n` +
    `- A CTA button: <a href="https://wearit.com/editor.html" class="cta-btn">Start Designing Now</a>\n` +
    `- A brief list (ul) of 3 reasons why WEARIT is different (AI design, no minimums, ships worldwide)\n` +
    `- Close with a punchy sign-off from "The WEARIT Crew"\n\n` +
    `Use the CSS classes defined in the email template (.cta-btn, .code-box, h1, h2, p, ul).\n` +
    `Return ONLY the HTML body content — no <html>, <head>, or <style> tags.`,
    1000
  );

  const subject = `Welcome to WEARIT — Here's 30% Off Your First Order 🔥`;
  return {
    type: 'welcome',
    subject,
    discountCode,
    html: wrapEmailHtml(raw, `Your exclusive 30% discount code is inside — ${discountCode}`),
    textPreview: `Welcome to WEARIT! Use code ${discountCode} for 30% off your first custom order.`,
  };
}

// ── 2. Abandoned Cart Email ──────────────────────────────────────

async function generateAbandonedCartEmail(discountCode) {
  const raw = await callClaude(
    `Write the BODY content for an abandoned cart recovery email for WEARIT.\n` +
    `The shopper left without checking out. Discount code: ${discountCode} (10% off if they complete now).\n\n` +
    `Write HTML snippets (inner content only, use CSS classes from template):\n` +
    `- An attention-grabbing h1 (e.g., "Hey — You Forgot Something")\n` +
    `- 1–2 short paragraphs: remind them of their abandoned custom item, create urgency (designs don't save forever, stock of blanks limited)\n` +
    `- Social proof: mention that thousands of people have already customised with WEARIT\n` +
    `- The discount code: <div class="code-box">${discountCode}</div>\n` +
    `- Urgency note: code expires in 24 hours (p tag, text in neon color: style="color:#e8ff00")\n` +
    `- CTA button: <a href="https://wearit.com/editor.html" class="cta-btn">Complete My Order</a>\n` +
    `- A reassurance list (ul): free reprint on defects, ships worldwide, quality guarantee\n\n` +
    `Return ONLY the HTML body content.`,
    900
  );

  const subject = `You left something behind — complete your WEARIT order (10% off expires soon)`;
  return {
    type: 'abandoned_cart',
    subject,
    discountCode,
    html: wrapEmailHtml(raw, `Your custom design is still waiting — plus 10% off with code ${discountCode}`),
    textPreview: `Your custom design is still in your cart. Use ${discountCode} for 10% off — expires in 24h.`,
  };
}

// ── 3. Post-Purchase Follow-up ───────────────────────────────────

async function generatePostPurchaseEmail() {
  const referralCode = 'FRIEND' + Math.random().toString(36).toUpperCase().slice(2, 6);
  const raw = await callClaude(
    `Write the BODY content for a post-purchase thank-you email for WEARIT.\n` +
    `The customer just received their custom order. Referral discount code: ${referralCode} (15% off for a friend).\n\n` +
    `Write HTML snippets (inner content only):\n` +
    `- A bold thank-you h1 (streetwear tone, e.g., "Your Custom Drop Has Landed")\n` +
    `- 1–2 paragraphs: thank them genuinely, express that you'd love to see them wearing it\n` +
    `- Ask for a review: short paragraph asking them to share a photo and tag @wearit on Instagram\n` +
    `- Product suggestions section (h2): suggest 2–3 complementary products they might like (e.g., if they bought a tee, suggest matching hoodie or mug)\n` +
    `- Referral section: share code with a friend for 15% off. Code: <div class="code-box">${referralCode}</div>\n` +
    `- CTA: <a href="https://wearit.com/editor.html" class="cta-btn">Design Something New</a>\n\n` +
    `Return ONLY the HTML body content.`,
    900
  );

  const subject = `Your WEARIT order is out in the world — what did you think?`;
  return {
    type: 'post_purchase',
    subject,
    referralCode,
    html: wrapEmailHtml(raw, 'Thanks for your order — share with a friend for 15% off.'),
    textPreview: `Thank you for your WEARIT order! Share with a friend using code ${referralCode} for 15% off.`,
  };
}

// ── 4. Weekly Promotional Blast ──────────────────────────────────

async function generateWeeklyPromoEmail() {
  const raw = await callClaude(
    `Write the BODY content for a weekly promotional email for WEARIT, a bold streetwear POD brand.\n\n` +
    `Include all of the following sections (use the CSS class structure):\n` +
    `1. Header h1: a punchy weekly-email subject in headline style (e.g., "This Week At WEARIT")\n` +
    `2. "Spotlight" product section (h2 "Product Spotlight"): Highlight one featured product creatively — write a short, exciting description (2–3 sentences) for it. Products to pick from: Custom Hoodie, Printed Mug, Personalized Tote Bag\n` +
    `3. "New Arrivals" section (h2 "New Arrivals"): Brief teaser for 2 "new" product types or design themes (can be creative/invented, this is AI-generated content)\n` +
    `4. "Deal of the Week" section (h2 "Deal of the Week"): Create a compelling limited-time offer. Use a code box: <div class="code-box">WEEKLY20</div>. State the discount and when it expires (end of week).\n` +
    `5. CTA button: <a href="https://wearit.com" class="cta-btn">Shop This Week's Drops</a>\n` +
    `6. Brief closing paragraph in streetwear voice\n\n` +
    `Return ONLY the HTML body content.`,
    1100
  );

  const weekNum = Math.ceil((new Date() - new Date(new Date().getFullYear(), 0, 1)) / 604800000);
  const subject = `WEARIT Weekly Drop — Week ${weekNum}: New Arrivals + This Week's Deal`;
  return {
    type: 'weekly_promo',
    subject,
    html: wrapEmailHtml(raw, "This week's drops, new arrivals, and an exclusive deal inside."),
    textPreview: "New drops, new deals — your weekly WEARIT newsletter is here.",
    week: weekNum,
  };
}

// ── Main run ─────────────────────────────────────────────────────

async function run() {
  log(AGENT_ID, 'info', 'Email agent starting run…');

  // Ensure data directory exists
  const dataDir = path.join(__dirname, '../../data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  try {
    const welcomeCode  = generateWelcomeCode();
    const cartCode     = generateCartCode();

    log(AGENT_ID, 'info', 'Generating welcome email…');
    const welcomeEmail = await generateWelcomeEmail(welcomeCode);
    log(AGENT_ID, 'success', `Welcome email generated — code: ${welcomeCode}`);

    log(AGENT_ID, 'info', 'Generating abandoned cart email…');
    const cartEmail = await generateAbandonedCartEmail(cartCode);
    log(AGENT_ID, 'success', `Abandoned cart email generated — code: ${cartCode}`);

    log(AGENT_ID, 'info', 'Generating post-purchase email…');
    const postPurchaseEmail = await generatePostPurchaseEmail();
    log(AGENT_ID, 'success', `Post-purchase email generated — referral code: ${postPurchaseEmail.referralCode}`);

    log(AGENT_ID, 'info', 'Generating weekly promo email…');
    const weeklyEmail = await generateWeeklyPromoEmail();
    log(AGENT_ID, 'success', `Weekly promo email generated — week ${weeklyEmail.week}`);

    const batch = {
      id: Date.now(),
      generatedAt: new Date().toISOString(),
      note: 'Wire up SENDGRID_API_KEY from env to enable actual sending. See emailAgent.js header comment.',
      emails: {
        welcome:      welcomeEmail,
        abandonedCart: cartEmail,
        postPurchase: postPurchaseEmail,
        weeklyPromo:  weeklyEmail,
      },
    };

    // Load existing, prepend, trim to keep last 30 batches (30 days of history)
    const existing = readEmails();
    existing.unshift(batch);
    const trimmed = existing.slice(0, 30);
    fs.writeFileSync(EMAIL_FILE, JSON.stringify(trimmed, null, 2), 'utf8');

    log(AGENT_ID, 'success', `Email sequences saved → data/email-sequences.json (${trimmed.length} batches total)`);
    log(AGENT_ID, 'success', 'Email agent run complete. All 4 email templates generated.');
  } catch (err) {
    log(AGENT_ID, 'error', `Email agent error: ${err.message}`);
  }
}

module.exports = { run, AGENT_ID, INTERVAL_MS };
