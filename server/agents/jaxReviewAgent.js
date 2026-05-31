const fs   = require('fs');
const path = require('path');
const { log } = require('./logger');
const { callClaude } = require('../utils/claudeClient');
const { addEntry } = require('../utils/knowledgeBase');

const AGENT_ID  = 'jaxreview';
const DATA_FILE = path.join(__dirname, '../../data/jax-reviews.json');
const LEADS_FILE = path.join(__dirname, '../../data/leads.json');

// Jacksonville domination milestones — reviews needed per month
const REVIEW_MILESTONES = [
  { month: 1, target: 3,  label: 'Google trust starts' },
  { month: 2, target: 10, label: 'Local Pack eligibility' },
  { month: 3, target: 20, label: 'Local Pack appearing' },
  { month: 4, target: 30, label: 'Consistent Local Pack' },
  { month: 5, target: 45, label: 'Top 3 Jacksonville' },
  { month: 6, target: 60, label: 'Jacksonville dominated' },
];

// Key Jacksonville keywords to track Local Pack position
const TARGET_KEYWORDS = [
  'garage door repair Jacksonville FL',
  'garage door repair Ponte Vedra',
  'garage door spring replacement Jacksonville',
  'emergency garage door repair Jacksonville',
  'garage door opener installation Jacksonville',
];

function readLeads() {
  try {
    const raw = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8'));
    return Array.isArray(raw) ? raw : [];
  } catch { return []; }
}

function calcReviewMetrics(existing) {
  const startDate   = existing.startDate || new Date().toISOString();
  const monthsIn    = Math.max(1, Math.round((Date.now() - new Date(startDate).getTime()) / (30 * 24 * 60 * 60 * 1000)));
  const currentReviews = existing.currentReviewCount || 0;

  // Find current milestone
  const currentMilestone = REVIEW_MILESTONES.find(m => m.month === Math.min(monthsIn, 6)) || REVIEW_MILESTONES[0];
  const nextMilestone    = REVIEW_MILESTONES.find(m => m.target > currentReviews) || REVIEW_MILESTONES[REVIEW_MILESTONES.length - 1];

  const reviewsNeeded   = Math.max(0, nextMilestone.target - currentReviews);
  const onTrack         = currentReviews >= currentMilestone.target;
  const weeklyTarget    = Math.ceil(reviewsNeeded / Math.max(1, (6 - monthsIn) * 4));

  // Reviews per closed job rate
  const leads       = readLeads();
  const closedJobs  = leads.filter(l => l.status === 'closed').length;
  const reviewRate  = closedJobs > 0 ? Math.round((currentReviews / closedJobs) * 100) : 0;

  return {
    startDate,
    monthsIn,
    currentReviews,
    closedJobs,
    reviewRate,
    onTrack,
    weeklyTarget,
    nextMilestone,
    currentMilestone,
    milestones: REVIEW_MILESTONES.map(m => ({
      ...m,
      achieved: currentReviews >= m.target,
      current:  m.month === Math.min(monthsIn, 6),
    })),
  };
}

async function generateReviewStrategy(metrics) {
  const prompt = `You are the review growth strategist for 904 Garage Doors in Jacksonville, FL.

Current status:
- Reviews: ${metrics.currentReviews} (need ${metrics.nextMilestone.target} for "${metrics.nextMilestone.label}")
- Closed jobs: ${metrics.closedJobs}
- Review conversion rate: ${metrics.reviewRate}% of closed jobs left a review
- On track: ${metrics.onTrack ? 'YES' : 'NO — BEHIND'}
- Weekly review target: ${metrics.weeklyTarget} new reviews needed per week
- Months into plan: ${metrics.monthsIn}

Context: Owner has ADHD. Needs specific, simple actions. Goal is top 3 Jacksonville Local Pack in 6 months.

Give 3 specific tactics to get more Google reviews THIS WEEK. Be concrete — exact words to say, exact timing, exact channel.
Also flag: is the current review velocity enough to hit month 6 goal?

Return as JSON: {"onTrack": true/false, "urgency": "high/medium/low", "tactics": ["...", "...", "..."], "keyInsight": "one sentence"}
Return ONLY the JSON.`;

  try {
    const raw = await callClaude(prompt, { agentId: AGENT_ID, maxTokens: 600 });
    const clean = raw.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    return {
      onTrack:    metrics.onTrack,
      urgency:    metrics.currentReviews < 5 ? 'high' : 'medium',
      tactics:    [
        'After every closed job, text the customer: "Hi [name], glad we could help! If you have 60 seconds, a Google review means everything to a small business: [link]"',
        'Ask in person before you leave — "Would you mind leaving us a quick Google review? It really helps us grow."',
        'Follow up 24 hours after job via SMS if no review yet.',
      ],
      keyInsight: `You need ${metrics.weeklyTarget} reviews per week to stay on track for Jacksonville domination.`,
    };
  }
}

async function run() {
  log(AGENT_ID, 'info', 'Review Velocity Agent starting — tracking Jacksonville domination progress…');

  const existing = (() => { try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch { return {}; } })();
  if (!existing.startDate) existing.startDate = new Date().toISOString();

  const metrics  = calcReviewMetrics(existing);
  const strategy = await generateReviewStrategy(metrics);

  const report = {
    lastRun:    new Date().toISOString(),
    runNumber:  (existing.runNumber || 0) + 1,
    startDate:  existing.startDate,
    currentReviewCount: existing.currentReviewCount || 0,
    metrics,
    strategy,
    targetKeywords: TARGET_KEYWORDS,
    history: existing.history || [],
  };

  // Track history
  report.history.unshift({
    date:    new Date().toISOString(),
    reviews: metrics.currentReviews,
    onTrack: metrics.onTrack,
  });
  if (report.history.length > 90) report.history.length = 90;

  // Alert if behind
  if (!metrics.onTrack) {
    log(AGENT_ID, 'warn', `REVIEW ALERT: Behind target — need ${metrics.weeklyTarget} reviews/week. Currently at ${metrics.currentReviews}/${metrics.currentMilestone.target}`);
  } else {
    log(AGENT_ID, 'success', `Reviews on track: ${metrics.currentReviews}/${metrics.nextMilestone.target} toward "${metrics.nextMilestone.label}"`);
  }

  addEntry({
    type:    'review_progress',
    content: `Review count: ${metrics.currentReviews}. On track: ${metrics.onTrack}. Next milestone: ${metrics.nextMilestone.target} reviews for "${metrics.nextMilestone.label}"`,
    tags:    ['reviews', 'gmb', 'jacksonville', 'local-pack'],
    source:  AGENT_ID,
  });

  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(report, null, 2));
  log(AGENT_ID, 'success', `Review Velocity Agent complete — ${metrics.currentReviews} reviews, ${metrics.onTrack ? 'on track' : 'BEHIND'}`);
}

// Allow manual review count update
function updateReviewCount(count) {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    data.currentReviewCount = count;
    data.lastManualUpdate = new Date().toISOString();
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch { return false; }
}

module.exports = { run, updateReviewCount, AGENT_ID };
