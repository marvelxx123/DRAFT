/**
 * Follow-Up Agent
 *
 * Most sales are lost because nobody followed up. This agent checks your outreach log,
 * finds leads you haven't heard back from after 24 hours, and writes a follow-up message.
 *
 * One polite follow-up doubles your response rate. Don't skip this step.
 */

const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'data', 'outreach_log.json');

// How long to wait before following up (in milliseconds)
// 24 hours = enough time for them to see your first message without being pushy
const FOLLOW_UP_DELAY_MS = 24 * 60 * 60 * 1000;

/**
 * Reads the current outreach log.
 * Returns an empty array if the file doesn't exist yet — no crash on first run.
 */
function readLog() {
  if (!fs.existsSync(LOG_FILE)) {
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
  } catch (err) {
    console.log('[FollowUp] Could not read log file — it may be empty or corrupted');
    return [];
  }
}

/**
 * Saves the updated log back to disk.
 */
function writeLog(log) {
  const dir = path.dirname(LOG_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
}

/**
 * Generates a follow-up message for a lead you haven't heard from.
 * Keep it short — one or two sentences. You already introduced yourself.
 * This is just a gentle nudge to make sure they saw your first message.
 */
function generateFollowUpTemplate(lead) {
  const title = lead.title || 'your garage door issue';
  const platform = lead.platform || 'your post';

  if (lead.priority === 'EMERGENCY') {
    return `Hi again — just wanted to check in on your garage door situation from ${platform}. If you still need help, I'm available today and can usually make it out within a few hours. Give me a text at [YOUR PHONE NUMBER] and we'll get it sorted. — [YOUR NAME]`;
  }

  if (lead.priority === 'OPPORTUNITY') {
    return `Hi again — following up on your garage door project from ${platform}. I'm still happy to come out for a free estimate. Just let me know what day works for you and I'll make it happen. — [YOUR NAME], Jacksonville Garage Door Services`;
  }

  // STANDARD follow-up — friendly, no pressure
  return `Hi — just checking back about "${title}" from ${platform}. Still happy to come out for a free look and honest estimate. Text or call me at [YOUR PHONE NUMBER] whenever works for you. — [YOUR NAME], Jacksonville Garage Door Services`;
}

/**
 * The main follow-up function. Call this after your outreach cycle.
 * It finds old, uncontacted leads and generates follow-up messages for them.
 *
 * The log is updated so you can see which leads have been flagged for follow-up.
 */
async function runFollowUps() {
  const log = readLog();

  if (log.length === 0) {
    console.log('[FollowUp] No leads in log yet — nothing to follow up on');
    return [];
  }

  const now = Date.now();
  const followUpsNeeded = [];

  const updatedLog = log.map((entry) => {
    // Skip leads that are already contacted or already followed up
    if (entry.contacted || entry.followedUp) {
      return entry;
    }

    // Check if the original outreach was more than 24 hours ago
    const outreachTime = new Date(entry.outreachAt).getTime();
    const timeSinceOutreach = now - outreachTime;

    if (timeSinceOutreach >= FOLLOW_UP_DELAY_MS) {
      const followUpTemplate = generateFollowUpTemplate(entry);

      followUpsNeeded.push({
        ...entry,
        followUpTemplate,
        hoursOld: Math.round(timeSinceOutreach / (60 * 60 * 1000)),
      });

      // Mark this entry as followed up so we don't follow up again
      return {
        ...entry,
        followedUp: true,
        followedUpAt: new Date().toISOString(),
        followUpTemplate,
      };
    }

    return entry;
  });

  // Save the updated log with follow-up timestamps
  writeLog(updatedLog);

  if (followUpsNeeded.length === 0) {
    console.log('[FollowUp] No leads old enough to follow up on yet — check back tomorrow');
  } else {
    console.log(`[FollowUp] ${followUpsNeeded.length} leads flagged for follow-up:`);
    for (const lead of followUpsNeeded) {
      console.log(`  - "${lead.title}" (${lead.priority}, ${lead.hoursOld}h old) from ${lead.platform}`);
      console.log(`    Follow-up message: "${lead.followUpTemplate.slice(0, 80)}..."`);
    }
  }

  return followUpsNeeded;
}

module.exports = { runFollowUps, generateFollowUpTemplate };
