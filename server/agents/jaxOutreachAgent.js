const fs = require('fs');
const path = require('path');
const { log } = require('./logger');
const cfg = require('./jaxConfig');
const { getInstructions } = require('../services/memory');
const { callClaude } = require('../utils/claudeClient');

const AGENT_ID = 'jaxoutreach';
const OUT_FILE = path.join(__dirname, '../../data/jax-outreach.json');

function readData() {
  try { return JSON.parse(fs.readFileSync(OUT_FILE, 'utf8')); }
  catch {
    return {
      sendQueue: [],
      sent: [],
      contactedTargets: {},
      lastRun: null,
    };
  }
}

// ── DUPLICATE GUARD ───────────────────────────────────────────────────────────
const COOLDOWN_DAYS = 60;

function wasRecentlyContacted(data, target) {
  const contacts = data.contactedTargets || {};
  const lastMs = contacts[target];
  if (!lastMs) return false;
  const daysSince = (Date.now() - new Date(lastMs).getTime()) / (1000 * 60 * 60 * 24);
  return daysSince < COOLDOWN_DAYS;
}

function markContacted(data, target) {
  if (!data.contactedTargets) data.contactedTargets = {};
  data.contactedTargets[target] = new Date().toISOString();
}

// ── SUBJECT LINE EXTRACTOR ────────────────────────────────────────────────────
function extractSubject(rawText) {
  const match = rawText.match(/^subject[:\s]+(.+)/im);
  if (match) {
    return match[1].trim();
  }
  // Try first line if it looks like a subject
  const firstLine = rawText.split('\n')[0].trim();
  if (firstLine.length < 120 && !firstLine.includes('Hi ') && !firstLine.startsWith('Dear')) {
    return firstLine;
  }
  return '';
}

function stripSubjectLine(rawText) {
  return rawText.replace(/^subject[:\s]+.+\n?/im, '').trim();
}

const context = `My name is ${cfg.ownerName}, with ${cfg.businessName} in Jacksonville FL. ` +
  `Phone: ${cfg.phone}. Services: ${cfg.services.join(', ')}. USP: ${cfg.usp}.`;

function learnedContext() {
  return `\nPERFORMANCE INTELLIGENCE (use to sharpen targeting and messaging): ${getInstructions('outreach')}`;
}

const month = String(new Date().getMonth() + 1);
const seasonal = cfg.seasonalContext[month] || 'standard season';

async function run() {
  log(AGENT_ID, 'info', 'Outreach agent starting…');
  const data = readData();
  if (!data.sendQueue) data.sendQueue = [];
  if (!data.sent) data.sent = [];
  if (!data.contactedTargets) data.contactedTargets = {};

  const newItems = [];

  // ── 1) REAL ESTATE AGENT COLD DM ─────────────────────────────────────────
  const reTarget = 'Real Estate Agent — Jacksonville FL';
  if (!wasRecentlyContacted(data, reTarget)) {
    try {
      const rawMsg = await callClaude(
        `Write a short cold DM/message to a Jacksonville FL real estate agent, from a local garage door technician. ` +
        `${context} Goal: become their go-to garage door vendor for buyers/sellers. ` +
        `Max 80 words. Friendly, not salesy. Mention we can do quick estimates before listings and same-day fixes for buyers. ` +
        `End with a soft ask ("Would you be open to keeping my number on hand?"). First person. No corporate language.` +
        learnedContext(),
        { agentId: AGENT_ID, maxTokens: 600 }
      );
      newItems.push({
        id: Date.now() + 1,
        type: 'real_estate',
        target: reTarget,
        subject: '',
        message: rawMsg,
        status: 'pending',
        sentAt: null,
        channel: 'dm',
      });
      markContacted(data, reTarget);
      log(AGENT_ID, 'success', 'Real estate agent DM generated');
    } catch (err) {
      log(AGENT_ID, 'error', `Real estate DM failed: ${err.message}`);
    }
  } else {
    log(AGENT_ID, 'info', `Skipping real estate DM — ${reTarget} contacted within 60 days`);
  }

  // ── 2) PROPERTY MANAGER COLD EMAIL ───────────────────────────────────────
  // Pick a PM company not recently contacted
  const availablePMs = cfg.pmCompanies.filter(c => !wasRecentlyContacted(data, c));
  const pmTarget = availablePMs.length > 0
    ? availablePMs[Math.floor(Math.random() * availablePMs.length)]
    : cfg.pmCompanies[Math.floor(Math.random() * cfg.pmCompanies.length)];

  if (!wasRecentlyContacted(data, pmTarget)) {
    try {
      const rawEmail = await callClaude(
        `Write a cold email to the maintenance coordinator at ${pmTarget}, a Jacksonville FL residential property management company, from a local garage door technician. ` +
        `${context} Goal: become their preferred vendor for garage door calls across their properties. ` +
        `Subject line + body. Max 150 words total. Professional but human. ` +
        `Mention volume pricing, fast response, and that we handle both emergency and routine calls. ` +
        `Include phone. End with a simple CTA (a quick call or adding us to their vendor list). ` +
        `Start your response with "Subject: " on the first line.`,
        { agentId: AGENT_ID, maxTokens: 600 }
      );
      const subject = extractSubject(rawEmail);
      const message = stripSubjectLine(rawEmail);
      newItems.push({
        id: Date.now() + 2,
        type: 'property_manager',
        target: pmTarget,
        subject: subject || `Reliable Garage Door Vendor for Your Properties — ${cfg.businessName}`,
        message,
        status: 'pending',
        sentAt: null,
        channel: 'email',
      });
      markContacted(data, pmTarget);
      log(AGENT_ID, 'success', `Property manager email generated for ${pmTarget}`);
    } catch (err) {
      log(AGENT_ID, 'error', `Property manager email failed for ${pmTarget}: ${err.message}`);
    }
  } else {
    log(AGENT_ID, 'info', `Skipping PM email — ${pmTarget} contacted within 60 days`);
  }

  // ── 3) HOA PITCH ─────────────────────────────────────────────────────────
  const availableHOAs = cfg.hoaTargets.filter(h => !wasRecentlyContacted(data, h));
  const hoaTarget = availableHOAs.length > 0
    ? availableHOAs[Math.floor(Math.random() * availableHOAs.length)]
    : cfg.hoaTargets[Math.floor(Math.random() * cfg.hoaTargets.length)];

  if (!wasRecentlyContacted(data, hoaTarget)) {
    try {
      const rawHoa = await callClaude(
        `Write a short message to the community manager at ${hoaTarget} HOA in Ponte Vedra / Jacksonville FL, from a local garage door technician. ` +
        `${context} Goal: get added to the HOA preferred vendor list and/or mentioned in the community newsletter. ` +
        `Max 100 words. Suggest sending their info in the HOA newsletter or vendor list. ` +
        `Mention fast response, professional service, and that we dispatch vetted garage door pros. Professional tone. ` +
        `Start your response with "Subject: " on the first line.`,
        { agentId: AGENT_ID, maxTokens: 600 }
      );
      const subject = extractSubject(rawHoa);
      const message = stripSubjectLine(rawHoa);
      newItems.push({
        id: Date.now() + 3,
        type: 'hoa',
        target: `${hoaTarget} HOA`,
        subject: subject || `Local Garage Door Service for ${hoaTarget} Residents`,
        message,
        status: 'pending',
        sentAt: null,
        channel: 'email',
      });
      markContacted(data, hoaTarget);
      log(AGENT_ID, 'success', `HOA pitch generated for ${hoaTarget}`);
    } catch (err) {
      log(AGENT_ID, 'error', `HOA pitch failed for ${hoaTarget}: ${err.message}`);
    }
  } else {
    log(AGENT_ID, 'info', `Skipping HOA pitch — ${hoaTarget} contacted within 60 days`);
  }

  // ── 4) APARTMENT COMPLEX PITCH ────────────────────────────────────────────
  const apTarget = 'Apartment Complex Maintenance Director — Jacksonville FL';
  if (!wasRecentlyContacted(data, apTarget)) {
    try {
      const rawApt = await callClaude(
        `Write a cold message to an apartment complex maintenance director in Jacksonville FL, from a local garage door tech. ` +
        `${context} Goal: win a recurring vendor contract for garage door maintenance and repairs. ` +
        `Max 120 words. Emphasize volume pricing, fast turn-around, invoicing flexibility. ` +
        `Professional tone. Ask if they can add us to their approved vendor list. ` +
        `Start your response with "Subject: " on the first line.`,
        { agentId: AGENT_ID, maxTokens: 600 }
      );
      const subject = extractSubject(rawApt);
      const message = stripSubjectLine(rawApt);
      newItems.push({
        id: Date.now() + 4,
        type: 'apartment',
        target: apTarget,
        subject: subject || `Garage Door Vendor Partnership — ${cfg.businessName}`,
        message,
        status: 'pending',
        sentAt: null,
        channel: 'email',
      });
      markContacted(data, apTarget);
      log(AGENT_ID, 'success', 'Apartment complex pitch generated');
    } catch (err) {
      log(AGENT_ID, 'error', `Apartment pitch failed: ${err.message}`);
    }
  } else {
    log(AGENT_ID, 'info', 'Skipping apartment pitch — recently contacted within 60 days');
  }

  // ── MERGE INTO QUEUE ──────────────────────────────────────────────────────
  // Pending items first (new ones at front), keep max 50 total
  data.sendQueue = [...newItems, ...data.sendQueue.filter(i => i.status === 'pending')].slice(0, 50);

  data.lastRun = new Date().toISOString();
  fs.writeFileSync(OUT_FILE, JSON.stringify(data, null, 2));
  log(AGENT_ID, 'success', `Outreach agent complete. ${newItems.length} item(s) added to send queue.`);
}

module.exports = { run, AGENT_ID };
