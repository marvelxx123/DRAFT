module.exports = {
  business: {
    name: '904 Garage Doors',
    dba: '904 Garage Doors',
    phone: '(904) 468-3428',
    phoneRaw: '+19044683428',
    phoneLink: 'tel:+19044683428',
    email: process.env.BUSINESS_EMAIL || '',
    serviceArea: 'Jacksonville, FL',
  },

  // Neighborhoods and suburbs to target for SEO and lead filtering
  serviceZones: [
    'Jacksonville', 'JAX', 'Ponte Vedra', 'Fleming Island',
    'Orange Park', 'Mandarin', 'Southside', 'Northside',
    'Avondale', 'San Marco', 'Riverside', 'Atlantic Beach',
    'Neptune Beach', 'Jacksonville Beach', 'St. Johns', 'Middleburg',
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
