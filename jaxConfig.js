module.exports = {
  business: {
    name: '904 Garage Doors',
    dba: '904 Garage Doors',
    phone: '(904) 468-3428',
    phoneRaw: '+19044683428',
    phoneLink: 'tel:+19044683428',
    email: process.env.BUSINESS_EMAIL || '',
    serviceArea: 'Jacksonville, Yulee & Fernandina Beach, FL',
  },

  // All areas served — used by agents for SEO, lead filtering, and ad targeting
  serviceZones: [
    // Jacksonville proper
    'Jacksonville', 'JAX', 'Mandarin', 'Southside', 'Northside',
    'Avondale', 'San Marco', 'Riverside', 'Atlantic Beach',
    'Neptune Beach', 'Jacksonville Beach', 'Arlington', 'Westside',
    // St. Johns County
    'Ponte Vedra', 'St. Johns', 'Fleming Island',
    // Clay County
    'Orange Park', 'Middleburg',
    // Nassau County — less competition, big opportunity
    'Yulee', 'Fernandina Beach', 'Amelia Island', 'Nassau County',
    'Callahan', 'Hilliard', 'Bryceville',
  ],

  // Priority markets — agents write specific content for these
  priorityMarkets: [
    { name: 'Jacksonville',     county: 'Duval',   competition: 'high',   note: 'Core market' },
    { name: 'Yulee',            county: 'Nassau',  competition: 'low',    note: 'Fast-growing, underserved' },
    { name: 'Fernandina Beach', county: 'Nassau',  competition: 'low',    note: 'Amelia Island — higher income homeowners' },
    { name: 'Orange Park',      county: 'Clay',    competition: 'medium', note: 'Large suburb, family homes' },
    { name: 'Ponte Vedra',      county: 'St. Johns', competition: 'medium', note: 'Affluent, willing to pay premium' },
  ],

  services: [
    { name: 'Spring Replacement', emergency: true,  keywords: ['broken spring', 'snapped spring', 'spring repair'] },
    { name: 'Door Off Track',     emergency: true,  keywords: ['off track', 'derailed', 'door fell'] },
    { name: 'Opener Repair',      emergency: false, keywords: ['opener not working', 'remote broken', 'keypad'] },
    { name: 'Cable Repair',       emergency: true,  keywords: ['broken cable', 'snapped cable'] },
    { name: 'New Door Install',   emergency: false, keywords: ['new door', 'install', 'replace door'] },
    { name: 'Panel Replacement',  emergency: false, keywords: ['dented panel', 'damaged panel'] },
    { name: 'Tune-Up',            emergency: false, keywords: ['tune up', 'maintenance', 'service'] },
    { name: 'Commercial Door',    emergency: false, keywords: ['commercial', 'warehouse', 'business'] },
  ],

  content: {
    taglines: [
      'Fast, Local, Reliable — Jacksonville\'s Garage Door Experts',
      'Same-Day Service Across Jacksonville',
      '904 Garage Doors — Your Neighbor, Your Technician',
    ],
    guarantee: 'Licensed & Insured • Same-Day Emergency Service • Free Estimates',
  },

  social: {
    // Fill these in once pages are created
    facebook:  process.env.FACEBOOK_PAGE_URL  || '',
    instagram: process.env.INSTAGRAM_URL      || '',
    nextdoor:  process.env.NEXTDOOR_URL        || '',
  },
};
