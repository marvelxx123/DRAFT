const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { log } = require('./logger');
const config = require('../../jaxConfig');

const AGENT_ID = 'content';
const CONTENT_FILE = path.join(__dirname, '../../data/generated-content.json');

// ---------------------------------------------------------------------------
// Competitor-informed content strategy (researched 2026-05)
// Sources: a1aoverheaddoors.com (county pages + Nassau County page),
//          garagedoorsjd.com (service copy), precisiondoor.net (location template)
//
// Key insight: competitors write ENVIRONMENTAL copy (salt air, humidity, storms)
// rather than just swapping city names. Each market gets unique angles.
// ---------------------------------------------------------------------------

/**
 * Market profiles — unique content angles per location, not just name swaps.
 * Based on competitor research: A1A's strongest pages mention specific Florida
 * environmental factors and specific community types.
 */
const MARKET_PROFILES = {
  Yulee: {
    name: 'Yulee',
    zip: '32097',
    county: 'Nassau',
    housingType: 'newer construction subdivisions (Wildlight, Tributary, Nassau Crossing)',
    primaryPain: 'builder-grade springs from 2018–2024 are now hitting their rated lifespan',
    environmentalFactor: 'Nassau County humidity and indirect salt air from the coast',
    urgencyAngle: 'morning commuter community — a broken spring at 6:45 AM traps the car before work',
    differentiator: 'Nassau County based, not a Jacksonville company adding 45 minutes of drive time',
    competitionLevel: 'low',
  },
  'Fernandina Beach': {
    name: 'Fernandina Beach',
    zip: '32034',
    county: 'Nassau',
    housingType: 'mix of historic homes downtown and premium resort communities (Amelia Island Plantation, Summer Beach)',
    primaryPain: 'direct Atlantic salt air destroys bare steel springs in 2–4 years — faster than almost anywhere in Florida',
    environmentalFactor: 'ocean-front salt air, humidity, and coastal wind-borne debris hurricane exposure',
    urgencyAngle: 'premium properties where a broken door is both a security concern and curb appeal issue',
    differentiator: 'we use galvanized coastal-rated springs, not the same hardware that just failed; also offer hurricane-rated door options',
    competitionLevel: 'low',
  },
  Jacksonville: {
    name: 'Jacksonville',
    zip: '32099',
    county: 'Duval',
    housingType: 'diverse — from beach communities (Jacksonville Beach, Neptune Beach) to established neighborhoods (Mandarin, Avondale) to new construction (Northside)',
    primaryPain: 'franchise companies dominate ads but add cost and impersonal service; homeowners want a local tech who answers the phone',
    environmentalFactor: 'North Florida humidity and heat cycles, some coastal exposure near beaches',
    urgencyAngle: 'large metro where a broken spring means no car for a full day while waiting for a big company\'s schedule',
    differentiator: 'solo tech who picks up live, quotes upfront, and works weekends at no extra charge',
    competitionLevel: 'high',
  },
  'Orange Park': {
    name: 'Orange Park',
    zip: '32073',
    county: 'Clay',
    housingType: 'established family suburbs — Foxridge, Lake Asbury, Oakleaf, Fleming Island — homes from 1990s through 2010s',
    primaryPain: 'high-use commuter households cycling doors 8–10 times/day; older torsion springs well past rated lifespan',
    environmentalFactor: 'inland Florida heat and humidity accelerate hardware wear; no salt air but summer humidity is intense',
    urgencyAngle: 'family-oriented community where the garage is the main entry point — a broken spring locks out the whole household',
    differentiator: 'honest assessment of repair vs replace; no upsell pressure; 1-year warranty on everything',
    competitionLevel: 'medium',
  },
};

async function callClaude(prompt) {
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
      max_tokens: 900,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Claude API error: ${res.status}`);
  return (await res.json()).content[0].text.trim();
}

function readContent() {
  try { return JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf8')); }
  catch { return {}; }
}

// Pick a random market from the priority list
function randomMarket() {
  const names = Object.keys(MARKET_PROFILES);
  return MARKET_PROFILES[names[Math.floor(Math.random() * names.length)]];
}

/**
 * Generate a location intro paragraph structured like the best competitor pages.
 * Key principles from competitor research:
 * 1. Lead with the Florida environmental context (salt air, humidity, heat)
 * 2. Name specific neighborhoods/communities — makes it feel local, not templated
 * 3. Connect the environment to the specific problem (spring failure, corrosion)
 * 4. End with the differentiator (local, fast, right hardware)
 * This is what separates A1A's best pages from a generic city-swap template.
 */
async function generateLocationIntro(market) {
  const phone = config.business.phone;
  return callClaude(
    `You are writing a location intro paragraph for 904 Garage Doors, a solo garage door technician in Nassau County / Jacksonville FL. Phone: ${phone}.\n\n` +
    `Market: ${market.name}, FL (zip ${market.zip}, ${market.county} County)\n` +
    `Housing type: ${market.housingType}\n` +
    `Primary pain point: ${market.primaryPain}\n` +
    `Environmental factor: ${market.environmentalFactor}\n` +
    `Urgency angle: ${market.urgencyAngle}\n` +
    `Our differentiator: ${market.differentiator}\n\n` +
    `Write a 3-sentence intro paragraph that:\n` +
    `1. Opens with the environmental or local context specific to ${market.name} (NOT generic Florida)\n` +
    `2. Names at least one specific neighborhood or community type from the housing description\n` +
    `3. Connects the environment to the specific problem homeowners face\n` +
    `4. Ends with why 904 Garage Doors is the right call for ${market.name} specifically\n\n` +
    `Do NOT just swap a city name into a generic template. Make it feel like it was written specifically for ${market.name}. No quotes around the output.`
  );
}

/**
 * Generate a service description for a specific market.
 * Based on competitor pattern: A1A writes service descriptions that reference
 * local conditions (salty air, storm damage, new construction hardware).
 */
async function generateServiceBlurb(market, service) {
  const phone = config.business.phone;
  return callClaude(
    `Write 2 sentences describing "${service.name}" garage door service for homes in ${market.name}, FL. ` +
    `Context: ${market.environmentalFactor}. Housing: ${market.housingType}. ` +
    `Tone: direct, practical, local. Mention a specific local detail if natural. ` +
    `End with a soft CTA including ${phone}. No bullet points.`
  );
}

async function run() {
  log(AGENT_ID, 'info', 'Content agent starting run…');
  const content = readContent();
  const market  = randomMarket();
  const phone   = config.business.phone;

  try {
    // 1. Hero tagline for the selected market
    // Pattern from competitor research: use the urgency angle + local specificity
    const tagline = await callClaude(
      `Write ONE punchy headline for 904 Garage Doors targeting homeowners in ${market.name}, FL. ` +
      `Max 10 words. No quotes. Emphasize: ${market.urgencyAngle}. ` +
      `Reference: ${market.differentiator}. ` +
      `Examples of the right voice: "Yulee's Garage Door Tech — We're Already Close" or ` +
      `"${market.name} Spring Repair — Same Day, No Waiting on Jacksonville Traffic."`
    );
    content.heroTagline = tagline;
    content.heroMarket  = market.name;
    log(AGENT_ID, 'success', `Hero tagline for ${market.name}: "${tagline}"`);

    // 2. Location intro paragraph — structured like competitor's best location pages
    // This is the key upgrade: unique environmental + neighborhood copy per market
    const locationIntro = await generateLocationIntro(market);
    if (!content.locationIntros) content.locationIntros = {};
    content.locationIntros[market.name] = locationIntro;
    log(AGENT_ID, 'success', `Location intro for ${market.name} written`);

    // 3. Emergency service description — market-specific
    const emergency = await callClaude(
      `Write 2 sentences for the emergency section of a garage door repair website targeting ${market.name}, FL. ` +
      `Business: 904 Garage Doors. Phone: ${phone}. ` +
      `Urgency context: ${market.urgencyAngle}. ` +
      `Tone: urgent but reassuring. Focus on: broken springs, doors off track, car trapped. ` +
      `End with the phone number. No fluff.`
    );
    content.emergencyBlurb = emergency;
    content.emergencyMarket = market.name;
    log(AGENT_ID, 'success', `Emergency blurb updated for ${market.name}`);

    // 4. Service blurb for an emergency service — market-specific copy
    const emergencyServices = config.services.filter(s => s.emergency);
    const randomService = emergencyServices[Math.floor(Math.random() * emergencyServices.length)];
    const serviceBlurb = await generateServiceBlurb(market, randomService);
    if (!content.serviceBlurbs) content.serviceBlurbs = {};
    if (!content.serviceBlurbs[market.name]) content.serviceBlurbs[market.name] = {};
    content.serviceBlurbs[market.name][randomService.name] = serviceBlurb;
    log(AGENT_ID, 'success', `Service blurb for ${randomService.name} in ${market.name}`);

    // 5. Meta description for the landing page
    const metaDesc = await callClaude(
      `Write a Google meta description (max 155 chars) for 904 Garage Doors. ` +
      `Keywords: garage door repair, ${market.name} FL, zip ${market.zip}, same-day service, free estimate. ` +
      `Include a call to action. No quotes. Do NOT start with the business name.`
    );
    content.metaDescription = metaDesc;
    content.metaMarket = market.name;
    log(AGENT_ID, 'success', 'Meta description updated');

    // 6. FAQ answer — rotates market and question
    // Updated question bank uses competitor-research-informed questions
    const faqs = [
      `How fast can you get to ${market.name} for an emergency garage door repair?`,
      `Are you licensed and insured in ${market.county} County FL?`,
      `Do you charge extra for weekends or holidays in ${market.name}?`,
      `Why does my garage door spring keep breaking in ${market.name}?`,
      `What garage door brands do you service in ${market.name}?`,
      `How much does broken spring repair cost in ${market.name} FL?`,
    ];
    const faqQuestion = faqs[new Date().getDay() % faqs.length];
    const faqAnswer = await callClaude(
      `Answer this customer question for 904 Garage Doors in ${market.name}, FL: "${faqQuestion}". ` +
      `Context for accurate answer: ${market.environmentalFactor}. ` +
      `2-3 sentences. Honest, confident, no corporate fluff. ` +
      `End with the phone number ${phone} if it fits naturally.`
    );
    if (!content.faqs) content.faqs = {};
    content.faqs[faqQuestion] = faqAnswer;
    log(AGENT_ID, 'success', `FAQ updated: ${faqQuestion}`);

    // 7. Location-specific trust line (for use in trust strips or callouts)
    const trustLine = await callClaude(
      `Write a single short trust phrase (max 12 words) for 904 Garage Doors in ${market.name}, FL. ` +
      `Reference: ${market.differentiator}. No quotes. Example: "Nassau County Based — Shorter Drive to Your Door."`
    );
    if (!content.trustLines) content.trustLines = {};
    content.trustLines[market.name] = trustLine;
    log(AGENT_ID, 'success', `Trust line for ${market.name}: "${trustLine}"`);

    content.lastUpdated   = new Date().toISOString();
    content.lastMarket    = market.name;
    fs.writeFileSync(CONTENT_FILE, JSON.stringify(content, null, 2));
    log(AGENT_ID, 'success', 'Content agent run complete.');
  } catch (err) {
    log(AGENT_ID, 'error', `Content agent error: ${err.message}`);
  }
}

module.exports = { run, AGENT_ID, MARKET_PROFILES };
