/**
 * Outreach Agent
 *
 * Once we know a lead is worth pursuing, this agent writes the message for you.
 * It customizes the message based on whether the situation is urgent or not.
 * All you have to do is copy the message and send it — the hard part is done.
 *
 * The messages are intentionally friendly and personal, not robotic.
 * People hire people they trust, especially for their home.
 */

const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'data', 'outreach_log.json');

/**
 * Makes sure the data directory and log file exist before we try to write to them.
 * This prevents crashes on first run when the directory is brand new.
 */
function ensureLogFile() {
  const dir = path.dirname(LOG_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(LOG_FILE)) {
    fs.writeFileSync(LOG_FILE, JSON.stringify([], null, 2));
  }
}

/**
 * Generates a personalized outreach message based on the lead's priority.
 * The EMERGENCY template is direct and reassuring — someone in a panic needs
 * to know you can solve their problem TODAY, not next week.
 */
function generateTemplate(lead) {
  const platform = lead.platform || 'your post';
  const title = lead.title || 'your garage door issue';

  if (lead.priority === 'EMERGENCY') {
    return `Hi! I saw your post about "${title}" on ${platform}.

I'm a local Jacksonville garage door technician and I can help you today — same-day service is what I do.

Broken springs, cables off track, door stuck open or closed — I've fixed hundreds of these in Jacksonville, Orange Park, and Ponte Vedra. I carry the most common parts on my truck so I can usually fix it in one visit.

I can be out to you within a few hours. Give me a call or text anytime at [YOUR PHONE NUMBER] and we'll get your door working again fast.

— [YOUR NAME]
Jacksonville Garage Door Services
Licensed & Insured`;
  }

  if (lead.priority === 'OPPORTUNITY') {
    return `Hi! I came across your post about "${title}" on ${platform}.

I specialize in garage door installation and commercial work throughout Jacksonville and the surrounding areas. I'd love to give you a free estimate — no pressure, just honest numbers.

Whether you need a single residential door or multiple commercial units, I work directly with homeowners and businesses to get the job done right.

Feel free to reach out at [YOUR PHONE NUMBER] or reply here with your address and the best time to swing by. I'll come take a look and get you a quote the same day.

— [YOUR NAME]
Jacksonville Garage Door Services
Licensed & Insured | Free Estimates`;
  }

  // STANDARD template — professional, helpful, no pressure
  return `Hi! I saw your post about "${title}" on ${platform}.

I'm a local garage door technician serving Jacksonville, Orange Park, Fleming Island, and Ponte Vedra. I offer free estimates with no obligation, and I'm happy to explain exactly what the job involves before you commit to anything.

Whether it's a repair, a new door install, or a tune-up, I'll give you a straight answer on what it needs and what it'll cost.

Give me a call or text at [YOUR PHONE NUMBER] and we can set up a time that works for you. I'm usually flexible on evenings and weekends too.

— [YOUR NAME]
Jacksonville Garage Door Services
Licensed & Insured | Free Estimates | No Hidden Fees`;
}

/**
 * Saves a record of this outreach to the log file.
 * This is how the Follow-Up agent knows which leads haven't been responded to yet.
 * Think of it as your CRM — a simple list of who you reached out to and when.
 */
function logOutreach(lead, template) {
  ensureLogFile();

  const log = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));

  // Check if we already logged this lead — don't add duplicates
  const existing = log.find((entry) => entry.id === lead.id);
  if (existing) {
    console.log(`[Outreach] Lead ${lead.id} already in log — skipping duplicate`);
    return existing;
  }

  const entry = {
    id: lead.id,
    title: lead.title,
    url: lead.url,
    platform: lead.platform,
    priority: lead.priority,
    score: lead.score,
    qualificationReason: lead.qualificationReason,
    postedAt: lead.postedAt,
    outreachAt: new Date().toISOString(),
    template,
    contacted: false,      // You'll mark this true after you reach out
    contactedAt: null,
    followedUp: false,     // The FollowUp agent will mark this true
    followedUpAt: null,
    response: null,        // Did they reply? You can update this manually
    notes: '',             // Add any notes here about the conversation
  };

  log.push(entry);
  fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
  console.log(`[Outreach] Logged ${lead.priority} lead: "${lead.title}"`);

  return entry;
}

/**
 * TODO: Email Alert Setup with Gmail (free)
 *
 * To get an email in your inbox every time an EMERGENCY lead comes in:
 *
 * 1. Install nodemailer: npm install nodemailer
 *    (or add it to package.json and run npm install)
 *
 * 2. Set up a Gmail App Password (not your regular password):
 *    - Go to https://myaccount.google.com/security
 *    - Enable 2-Step Verification if you haven't already
 *    - Go to "App passwords" and create one for "Mail"
 *    - Copy the 16-character password
 *
 * 3. Add these to your .env file:
 *    ALERT_EMAIL_USER=your.gmail@gmail.com
 *    ALERT_EMAIL_PASS=your-16-char-app-password
 *    ALERT_EMAIL_TO=your.phone@carrier.com  (use SMS gateway for phone alerts!)
 *
 *    SMS Gateway addresses (send email to these for a text message):
 *    - AT&T: number@txt.att.net
 *    - T-Mobile: number@tmomail.net
 *    - Verizon: number@vtext.com
 *    - Example: 9045551234@txt.att.net
 *
 * 4. Uncomment the code below and install nodemailer
 */
async function sendEmailAlert(lead) {
  // TODO: Uncomment this when you have nodemailer installed and .env configured
  /*
  const nodemailer = require('nodemailer');

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.ALERT_EMAIL_USER,
      pass: process.env.ALERT_EMAIL_PASS,
    },
  });

  const subject = lead.priority === 'EMERGENCY'
    ? `🚨 EMERGENCY GARAGE DOOR LEAD — ${lead.title}`
    : `New garage door lead: ${lead.title}`;

  await transporter.sendMail({
    from: process.env.ALERT_EMAIL_USER,
    to: process.env.ALERT_EMAIL_TO,
    subject,
    text: `
Priority: ${lead.priority} (Score: ${lead.score}/100)
Source: ${lead.platform}
Posted: ${lead.postedAt}

${lead.title}
${lead.description}

View post: ${lead.url}

Reason: ${lead.qualificationReason}

---
Your outreach message:
${lead.template}
    `.trim(),
  });

  console.log(`[Outreach] Email alert sent for ${lead.priority} lead`);
  */

  // For now, just log to console so you can see the alert
  if (lead.priority === 'EMERGENCY') {
    console.log(`\n[Outreach] *** EMERGENCY LEAD *** "${lead.title}" from ${lead.platform}`);
    console.log(`[Outreach] URL: ${lead.url}`);
    console.log(`[Outreach] Email alerts not yet configured — see TODO in outreach.js\n`);
  }
}

/**
 * Processes a single qualified lead — generates a template, logs it, and
 * sends an alert for urgent ones. This is the main function the orchestrator calls.
 */
async function processOutreach(lead) {
  const template = generateTemplate(lead);

  // Save to log and check if it's new
  const logEntry = logOutreach(lead, template);

  // Only send alerts for new entries and emergency leads
  // (logOutreach returns the existing entry for duplicates)
  if (logEntry.outreachAt && lead.priority === 'EMERGENCY') {
    await sendEmailAlert({ ...lead, template });
  }

  return { ...lead, template };
}

module.exports = { generateTemplate, processOutreach, logOutreach, sendEmailAlert };
