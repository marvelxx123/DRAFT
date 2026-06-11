// ── JACKSONVILLE LEAD GEN CONFIG ───────────────────────────────────────────
// Edit this file once. All 5 lead gen agents read from here.

module.exports = {
  businessName: '904 Garage Doors',
  ownerName:    'Tal',
  phone:        '(904) 468-3428',
  website:      'https://904garagedoors.com',
  areas:        ['Jacksonville', 'Orange Park', 'Fleming Island', 'Mandarin', 'Southside', 'Arlington', 'Ponte Vedra', 'Middleburg', 'Jacksonville Beach', 'Neptune Beach', 'Atlantic Beach', 'Nocatee', 'Palm Coast'],
  services:     ['new garage door installation', 'opener installation', 'garage door issues and troubleshooting', 'off-track door service', 'hurricane-rated door installation', 'garage door spring service', 'cable service', 'same-day garage door service'],
  usp:          'We connect Jacksonville homeowners with trusted garage door pros — fast response',
  reviewLink:   '',

  // AGENT AWARENESS — all agents must operate within these boundaries
  platformRules: [
    'We are a lead generation and dispatch platform, not a direct service company',
    'Never say "we fix", "we repair", "our technician" or imply hands-on work by the platform',
    'Always use language like: "we will get someone to you", "we connect you with a pro", "a technician will be dispatched"',
    'Never promise specific outcomes, pricing, or timelines as guarantees',
    'Never claim to be licensed, insured, or bonded as a platform',
    'The customer experience is: they contact us → we dispatch a qualified pro → pro does the work',
    'Tone: professional service platform, not a local handyman or buddy',
    'Never create liability by making specific repair promises on behalf of technicians',
  ],

  // Research-backed targets — real Jacksonville companies and communities
  pmCompanies:  ['Navy to Navy Homes', 'Nest Finders', 'Green River Property Management', 'First Place Management', 'Rental Guys Property Management', 'Suncoast Rentals'],
  hoaTargets:   ['Marsh Landing', 'Del Webb Ponte Vedra', 'Sawgrass Country Club', 'Fairfield', 'Plantation Oaks'],

  // Outreach contacts — verified business emails for auto-send
  // Add email: null to skip auto-send until you verify the address
  outreachContacts: [
    // Property managers
    { name: 'Navy to Navy Homes',              type: 'property_manager', email: 'info@navytonavyhomes.com' },
    { name: 'Nest Finders',                    type: 'property_manager', email: 'info@nestfinders.com' },
    { name: 'Green River Property Management', type: 'property_manager', email: 'info@greenriverpm.com' },
    { name: 'First Place Management',          type: 'property_manager', email: 'info@firstplacemgt.com' },
    { name: 'Rental Guys Property Management', type: 'property_manager', email: 'info@rentalguyspm.com' },
    { name: 'Suncoast Property Management',    type: 'property_manager', email: 'info@suncoastproperty.com' },
    { name: 'Ponte Vedra Management Group',    type: 'property_manager', email: null },
    { name: 'Willow Creek Property Mgmt',      type: 'property_manager', email: null },
    // HOAs
    { name: 'Marsh Landing Community',         type: 'hoa',              email: 'office@marshlanding.com' },
    { name: 'Plantation Oaks HOA',             type: 'hoa',              email: null },
    { name: 'Nocatee Community HOA',           type: 'hoa',              email: 'info@nocatee.com' },
    { name: 'Sawgrass Players Club HOA',       type: 'hoa',              email: null },
    // Apartment complexes
    { name: 'The District Southside',          type: 'apartment',        email: 'maintenance@thedistrictjax.com' },
    { name: 'Camden Property Management JAX',  type: 'apartment',        email: null },
    { name: 'Greystar Jacksonville',           type: 'apartment',        email: null },
  ],
  topZipCodes:  ['32082 (Ponte Vedra Beach)', '32250 (Jacksonville Beach)', '32233 (Atlantic Beach)', '32266 (Neptune Beach)'],

  markets: {
    'Ponte Vedra':        { zipCodes: ['32082','32081'], incomeLevel: 'premium', housingAge: 'mixed', notes: 'Sawgrass, Del Webb, Palm Valley — high-value replacement customers' },
    'Jacksonville Beach': { zipCodes: ['32250'], incomeLevel: 'mid-high', housingAge: 'older-coastal', notes: 'Salt air destroys springs and cables faster — maintenance upsell opportunity' },
    'Neptune Beach':      { zipCodes: ['32266'], incomeLevel: 'mid-high', housingAge: 'older-coastal', notes: 'Small tight community, word-of-mouth market' },
    'Atlantic Beach':     { zipCodes: ['32233'], incomeLevel: 'mid-high', housingAge: 'older-coastal', notes: 'Coastal corrosion market — stainless hardware upsell' },
    'Nocatee':            { zipCodes: ['32081'], incomeLevel: 'high', housingAge: 'new-construction', notes: 'New homes — opener installs, warranty work, HOA compliance' },
    'Mandarin':           { zipCodes: ['32257','32258'], incomeLevel: 'mid', housingAge: 'mature', notes: '1990s-2000s homes — spring replacement cycle, opener upgrades' },
    'Orange Park':        { zipCodes: ['32065','32073'], incomeLevel: 'mid', housingAge: 'mature', notes: 'Value-conscious market — speed and reliability messaging' },
    'Palm Coast':         { zipCodes: ['32164','32137','32137'], incomeLevel: 'mid', housingAge: 'mixed', notes: 'Fast-growing retirement and family market, underserved by competitors' },
    'Fleming Island':     { zipCodes: ['32003'], incomeLevel: 'mid-high', housingAge: 'mature', notes: 'Established families, quality-focused' },
    'Arlington':          { zipCodes: ['32211'], incomeLevel: 'mid', housingAge: 'older', notes: 'Older homes, high repair demand' },
    'Southside':          { zipCodes: ['32256','32224'], incomeLevel: 'mid-high', housingAge: 'mixed', notes: 'Town Center corridor, busy professionals want fast service' },
  },

  customerTypes: {
    emergency:    { signals: ['won\'t open','stuck','broken spring','cable snapped','car trapped','right now','emergency'], message: 'speed, same-day, we answer now', scoreBoost: 10 },
    replacement:  { signals: ['new door','replace','upgrade','renovation','remodel','planning','quote'], message: 'quality brands, professional install, curb appeal', scoreBoost: 6 },
    maintenance:  { signals: ['tune-up','maintenance','inspection','noise','slow','check'], message: 'preventive care, extend life, avoid emergency costs', scoreBoost: 4 },
    commercial:   { signals: ['warehouse','business','commercial','multiple doors','property manager','hoa'], message: 'reliability, contracts, fast turnaround, volume', scoreBoost: 8 },
  },

  leadScoring: {
    urgency:  { 'Right now — emergency': 10, 'Today': 7, 'This week': 4, 'Just getting a quote': 1 },
    service:  { 'Broken spring': 9, 'Door won\'t open at all': 10, 'Cable snapped': 9, 'Door off track': 8, 'Opener not working': 7, 'New door installation': 8, 'Tune-up / maintenance': 3, 'Not sure — needs inspection': 5 },
    zipBonus: { '32082': 3, '32081': 3, '32250': 2, '32266': 2, '32233': 2, '32003': 2, '32256': 2 },
  },

  // ── GMB SETUP GUIDE (Google Business Profile) ────────────────────────────
  // Based on Wes McDowell / Semrush local SEO best practices
  gmbSetup: {
    primaryCategory:     'Garage Door Supplier',
    secondaryCategories: ['Garage Door Service and Repair Company', 'Overhead Door Supplier'],
    descriptionNote:     'Write a natural business description. Do NOT keyword-stuff — the description is NOT a ranking factor.',
    photoNote:           'Upload real job photos. Do NOT geotag — not a ranking factor and looks manipulative.',
    reviewTargetRange:   '4.7–4.8 stars is the sweet spot. 5.0 looks fake to Google and customers.',
    respondToAllReviews: true,
    offerIdea:           'Add a recurring GMB "offer" — e.g. "Free inspection with any spring replacement" — refresh monthly',
    coworkingTactic:     'A co-working space address near Jacksonville city center (Regus, WeWork, Industrious, etc.) improves proximity ranking for Jacksonville searches. Cost: ~$50-350/month. Discuss with CFO before committing.',
    qnaTemplates: [
      { q: 'Do you offer same-day garage door repair in Jacksonville?', a: 'Yes — we dispatch technicians same day across all Jacksonville neighborhoods, 7 days a week.' },
      { q: 'Do you service Ponte Vedra?', a: 'Yes, Ponte Vedra Beach and Ponte Vedra are among our primary service areas.' },
      { q: 'What types of garage door problems do you fix?', a: 'Springs, cables, openers, panels, tracks, and full door replacements — all brands.' },
      { q: 'Are you available on weekends and holidays?', a: 'Yes — 7 days a week including weekends.' },
      { q: 'How do I get a free estimate?', a: 'Call (904) 468-3428 or submit the form at 904garagedoors.com — we respond fast.' },
      { q: 'Do you handle emergency garage door repairs?', a: 'Yes — emergency same-day service is our specialty. Call (904) 468-3428 right now.' },
    ],
  },

  // ── ON-PAGE SEO CHECKLIST (apply to every city page) ─────────────────────
  onPageSeoChecklist: [
    'Primary keyword in <title> tag (e.g. "Garage Door Repair Ponte Vedra FL | 904 Garage Doors")',
    'Primary keyword in H1',
    'Secondary keywords in H2/H3 (e.g. "Garage Door Spring Replacement Ponte Vedra")',
    'Primary keyword in first 100 words of body copy',
    'NAP (Business Name, Phone, Service Area) in footer with LocalBusiness schema markup',
    'Google Map embed showing Jacksonville service area',
    'Image alt text: keyword + city name (e.g. "garage door repair ponte vedra fl")',
    'FAQ section using exact long-tail questions from keyword research',
    'Internal links to other city pages',
    'Video on page (even a 60-second explainer improves time-on-page)',
  ],

  // ── CITATION DIRECTORIES (NAP must be 100% consistent) ───────────────────
  // Name: 904 Garage Doors | Phone: (904) 468-3428 | Website: 904garagedoors.com
  citationDirectories: [
    { name: 'Google Business Profile', priority: 1, status: 'pending-verification' },
    { name: 'Bing Places',             priority: 1, status: 'todo' },
    { name: 'Apple Maps',              priority: 1, status: 'todo' },
    { name: 'Yelp',                    priority: 1, status: 'todo' },
    { name: 'Facebook Business',       priority: 1, status: 'todo' },
    { name: 'Angi (Angie\'s List)',    priority: 2, status: 'todo' },
    { name: 'HomeAdvisor',             priority: 2, status: 'todo' },
    { name: 'Thumbtack',               priority: 2, status: 'todo' },
    { name: 'Better Business Bureau',  priority: 2, status: 'todo' },
    { name: 'Nextdoor Business',       priority: 2, status: 'todo' },
    { name: 'YellowPages.com',         priority: 3, status: 'todo' },
    { name: 'Foursquare',              priority: 3, status: 'todo' },
    { name: 'Manta',                   priority: 3, status: 'todo' },
    { name: 'Alignable',               priority: 3, status: 'todo' },
    { name: 'Jacksonville Chamber of Commerce', priority: 2, status: 'todo' },
  ],

  // Seasonal focus — agents use this to tailor content to the time of year
  seasonalContext: {
    '1': 'post-holiday, snowbirds settling in, real estate season starting',
    '2': 'peak real estate listing season — realtors need garage fixes for pre-sale inspections',
    '3': 'spring home improvement season, real estate activity high',
    '4': 'spring listings peak, pre-hurricane prep beginning',
    '5': 'pre-hurricane season — promote door inspections and hurricane-rated upgrades',
    '6': 'hurricane season starts — safety and preparedness messaging',
    '7': 'deep summer heat causes opener malfunctions and seal failures',
    '8': 'hurricane season peak — be available 24/7, storm damage repairs',
    '9': 'post-storm damage surge, insurance claim work',
    '10': 'snowbirds returning to Ponte Vedra — doors unused all summer now failing',
    '11': 'holiday season, increased door usage, cold snaps cause spring failures',
    '12': 'year-end, holiday gifting of smart openers, maintenance before new year',
  },
};
