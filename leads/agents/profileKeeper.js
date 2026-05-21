/**
 * Profile Keeper Agent
 *
 * Your free listings are only worth something if they're fresh and complete.
 * Google, Yelp, and Thumbtack all push newer, more active profiles higher in search.
 * This agent generates a weekly to-do list so you never forget to update them.
 *
 * Think of it as a business coach that reminds you to keep your storefront tidy.
 */

const fs = require('fs');
const path = require('path');

const REPORT_FILE = path.join(__dirname, '..', 'data', 'profile_tasks.txt');

// Each platform has different rules for what "active" means.
// We've pre-loaded the direct links so you can click and update without hunting around.
const PLATFORMS = [
  {
    name: 'Google Business Profile',
    importance: 'MOST IMPORTANT — shows up in Google Maps and local search',
    directLink: 'https://business.google.com',
    tasks: [
      'Post a weekly photo of a recent job (even a phone pic works — shows you\'re active)',
      'Reply to any new reviews — good or bad, reply within 24 hours',
      'Check that your hours are current (holidays, vacation, etc.)',
      'Add any new services you offer under the "Services" tab',
      'Answer any new Q&A questions from customers',
    ],
    frequency: 'Weekly posts, daily review checks',
  },
  {
    name: 'Yelp',
    importance: 'HIGH — many homeowners check Yelp before calling',
    directLink: 'https://biz.yelp.com',
    tasks: [
      'Respond to any new reviews (Yelp rewards businesses that engage)',
      'Update your "From the business" section with any new info',
      'Check that your service area and hours are accurate',
      'Add new photos if you have them — before/after shots are best',
    ],
    frequency: 'Weekly check-in, reply to reviews within 48 hours',
  },
  {
    name: 'Thumbtack',
    importance: 'HIGH — customers actively looking for pros come here',
    directLink: 'https://www.thumbtack.com/pro',
    tasks: [
      'Log in and check for any new lead requests in your area',
      'Update your availability calendar so you appear in searches',
      'Respond to any messages within 1 hour (Thumbtack tracks response time)',
      'Ask your last 3 customers to leave a review on Thumbtack',
      'Check your intro and make sure your pricing info is current',
    ],
    frequency: 'Check daily — fast response = more leads shown to you',
  },
  {
    name: 'Angi (formerly Angie\'s List)',
    importance: 'MEDIUM — good for bigger jobs and homeowners with money to spend',
    directLink: 'https://pro.angi.com',
    tasks: [
      'Check for new leads in your dashboard',
      'Update your profile photo and bio if it\'s been over 3 months',
      'Request reviews from recent customers via the Angi email tool',
      'Check that your license and insurance info is still listed',
    ],
    frequency: 'Weekly check-in',
  },
  {
    name: 'HomeAdvisor',
    importance: 'MEDIUM — overlaps with Angi (same company) but different audience',
    directLink: 'https://pro.homeadvisor.com',
    tasks: [
      'Verify your profile is marked as "Taking new jobs"',
      'Update your service area if you\'ve started covering new neighborhoods',
      'Check your average review score — target 4.5+ to stay competitive',
      'Add any certifications or garage door brands you specialize in',
    ],
    frequency: 'Weekly check-in',
  },
  {
    name: 'Nextdoor Business',
    importance: 'HIGH — neighbors trust other neighbors\' recommendations',
    directLink: 'https://business.nextdoor.com',
    tasks: [
      'Post one helpful tip per week (e.g., "How to tell if your spring is about to break")',
      'Respond to any mentions of your business in the neighborhood feed',
      'Check for posts asking for garage door recommendations and reply',
      'Make sure your service area covers all the neighborhoods you serve',
    ],
    frequency: 'Weekly posts, daily monitoring for recommendations',
  },
];

/**
 * Generates the weekly checklist and saves it as a text file.
 * Plain text means you can open it on any phone, email it to yourself,
 * or print it out — no special app needed.
 */
async function runProfileCheck() {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const lines = [
    '============================================================',
    '  JACKSONVILLE GARAGE DOOR — WEEKLY PROFILE MAINTENANCE',
    `  Generated: ${dateStr}`,
    '============================================================',
    '',
    'Keeping your free listings fresh is the single best free marketing',
    'you can do. Google rewards active profiles with higher rankings.',
    'This whole checklist should take about 20-30 minutes per week.',
    '',
    '------------------------------------------------------------',
    '',
  ];

  for (const platform of PLATFORMS) {
    lines.push(`## ${platform.name}`);
    lines.push(`   Importance: ${platform.importance}`);
    lines.push(`   Login here: ${platform.directLink}`);
    lines.push(`   How often:  ${platform.frequency}`);
    lines.push('');
    lines.push('   This week\'s tasks:');
    for (const task of platform.tasks) {
      lines.push(`   [ ] ${task}`);
    }
    lines.push('');
    lines.push('------------------------------------------------------------');
    lines.push('');
  }

  lines.push('## BONUS TIPS FOR THIS WEEK');
  lines.push('');
  lines.push('   [ ] Text your last 5 customers asking for a Google review');
  lines.push('       (Paste this: "Hey [Name]! Would you mind leaving me a quick');
  lines.push('        Google review? It really helps my small business. Here\'s the link:');
  lines.push('        [paste your Google review link]")');
  lines.push('');
  lines.push('   [ ] Take 2-3 photos of jobs you did this week and save them');
  lines.push('       for posting next week — variety keeps your profiles looking active');
  lines.push('');
  lines.push('   [ ] Search "garage door jacksonville" in Google and check where');
  lines.push('       you rank — this tells you if your profile efforts are working');
  lines.push('');
  lines.push('   [ ] Check Craigslist Jacksonville > Services for any garage door posts');
  lines.push('       you can respond to: https://jacksonville.craigslist.org/search/bbb?query=garage+door');
  lines.push('');
  lines.push('============================================================');
  lines.push(`  Next check: ${new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}`);
  lines.push('============================================================');

  const report = lines.join('\n');

  // Make sure data directory exists
  const dir = path.dirname(REPORT_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(REPORT_FILE, report, 'utf8');
  console.log(`[ProfileKeeper] Weekly checklist saved to ${REPORT_FILE}`);
  console.log('[ProfileKeeper] Open the file and work through the checklist — takes about 20-30 min');

  return report;
}

module.exports = { runProfileCheck };
