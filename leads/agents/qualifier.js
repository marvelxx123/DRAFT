/**
 * Qualifier Agent
 *
 * Not every lead is worth chasing. This agent reads each lead and figures out:
 * - Is this an EMERGENCY? (someone trapped, broken spring, needs help NOW)
 * - Is this STANDARD? (wants a quote, needs a new door, not urgent)
 * - Is this an OPPORTUNITY? (commercial job, referral potential, upgrade project)
 *
 * Emergency leads get the highest score — these people need you TODAY and will
 * pay whatever it costs to get their car out of the garage.
 */

// Keywords that signal someone needs help RIGHT NOW.
// These people are frustrated and will call the first person who responds.
const EMERGENCY_KEYWORDS = [
  'stuck',
  'broken spring',
  "can't open",
  'car trapped',
  'urgent',
  'emergency',
  'not working',
  'off track',
  'snapped',
  "won't close",
  "won't open",
  'wont close',
  'wont open',
  'stuck open',
  'stuck closed',
  'spring broke',
  'cable broke',
  'cable snapped',
  'broken cable',
  'help asap',
  'need help now',
  'today',
  'tonight',
  'right now',
  'asap',
];

// Keywords that signal a planned project — still good leads, just not urgent.
// These people are comparing prices, so professionalism and a clear estimate win.
const NON_URGENT_KEYWORDS = [
  'new door',
  'install',
  'quote',
  'estimate',
  'upgrade',
  'replace',
  'commercial',
  'renovation',
  'remodel',
  'addition',
  'builder',
  'contractor',
  'looking for',
  'recommendation',
  'suggest',
  'best price',
  'cheapest',
];

// Jacksonville metro area locations.
// If a post doesn't mention a location, we assume it's local — most Craigslist
// and Facebook Group posts are from people in the area they're posting to.
const JACKSONVILLE_LOCATIONS = [
  'jacksonville',
  'jax',
  'ponte vedra',
  'fleming island',
  'orange park',
  'mandarin',
  'southside',
  'northside',
  'neptune beach',
  'atlantic beach',
  'jacksonville beach',
  'jax beach',
  'fernandina',
  'yulee',
  'middleburg',
  'macclenny',
  'palatka',
  'st augustine', // 45 min away — worth a trip for a big job
  'clay county',
  'duval county',
  'nassau county',
  'st johns county',
];

/**
 * Checks if a lead is in the Jacksonville area.
 * If no location is mentioned at all, we assume it's local — people posting
 * to Jacksonville Craigslist are almost always in Jacksonville.
 */
function isJacksonvilleArea(rawText) {
  const hasLocation = JACKSONVILLE_LOCATIONS.some((loc) => rawText.includes(loc));

  // If they mention ANY specific location and it's not in our list, filter it out.
  // But if they don't mention a location at all, keep it — they're probably local.
  const locationWords = ['florida', 'georgia', 'alabama', 'miami', 'orlando', 'tampa', 'tallahassee', 'gainesville'];
  const mentionsOtherCity = locationWords.some((city) => rawText.includes(city) && !rawText.includes('jacksonville'));

  return hasLocation || !mentionsOtherCity;
}

/**
 * Scores a single lead and returns it with priority, score, and reason.
 * Score is 0-100. Higher = respond first.
 *
 * Scoring logic:
 * - EMERGENCY: 75-100 (depending on how many urgent keywords match)
 * - STANDARD: 40-74
 * - OPPORTUNITY: 20-39
 * - Filtered out: returns null (not in Jacksonville area)
 */
function qualifyLead(lead) {
  const text = lead.rawText || `${lead.title} ${lead.description}`.toLowerCase();

  // First check if this is even in our service area
  if (!isJacksonvilleArea(text)) {
    return null; // Not local — skip it
  }

  // Count how many emergency and non-urgent keywords match
  const emergencyMatches = EMERGENCY_KEYWORDS.filter((kw) => text.includes(kw));
  const nonUrgentMatches = NON_URGENT_KEYWORDS.filter((kw) => text.includes(kw));

  let priority, score, qualificationReason;

  if (emergencyMatches.length > 0) {
    // EMERGENCY — respond within minutes if possible!
    priority = 'EMERGENCY';
    // Score scales up with more matching keywords, maxing at 100
    score = Math.min(100, 75 + emergencyMatches.length * 5);
    qualificationReason = `Emergency signals detected: ${emergencyMatches.slice(0, 3).join(', ')}`;
  } else if (nonUrgentMatches.length > 0) {
    // Could be commercial work or a planned install — good but not urgent
    const isCommercial = text.includes('commercial') || text.includes('business') || text.includes('warehouse');
    priority = isCommercial ? 'OPPORTUNITY' : 'STANDARD';
    score = isCommercial ? 60 : 45 + nonUrgentMatches.length * 3;
    qualificationReason = isCommercial
      ? `Potential commercial job: ${nonUrgentMatches.slice(0, 2).join(', ')}`
      : `Planned project: ${nonUrgentMatches.slice(0, 2).join(', ')}`;
  } else {
    // General inquiry — could still be a good lead, just unclear
    priority = 'STANDARD';
    score = 35;
    qualificationReason = 'General garage door inquiry — needs follow-up to determine scope';
  }

  return {
    ...lead,
    priority,
    score,
    qualificationReason,
    qualifiedAt: new Date().toISOString(),
  };
}

/**
 * Qualifies a list of leads and returns only the ones in Jacksonville,
 * sorted by score so the most urgent leads are always at the top.
 */
function qualifyAll(leads) {
  const results = leads
    .map(qualifyLead)
    .filter(Boolean) // Remove nulls (leads outside service area)
    .sort((a, b) => b.score - a.score); // Highest score first

  const counts = {
    emergency: results.filter((l) => l.priority === 'EMERGENCY').length,
    standard: results.filter((l) => l.priority === 'STANDARD').length,
    opportunity: results.filter((l) => l.priority === 'OPPORTUNITY').length,
  };

  console.log(
    `[Qualifier] ${results.length} local leads qualified: ${counts.emergency} emergency, ${counts.standard} standard, ${counts.opportunity} opportunity`
  );

  return results;
}

module.exports = { qualifyLead, qualifyAll };
