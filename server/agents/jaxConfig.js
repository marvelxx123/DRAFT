// ── JACKSONVILLE LEAD GEN CONFIG ───────────────────────────────────────────
// Edit this file once. All 5 lead gen agents read from here.

module.exports = {
  businessName: 'Jacksonville Garage Pros',   // ← your business name
  phone:        '(904) 555-0100',              // ← your phone number
  website:      '',                            // ← your website (leave blank if none yet)
  areas:        ['Jacksonville', 'Orange Park', 'Fleming Island', 'Mandarin', 'Southside', 'Arlington', 'Ponte Vedra', 'Middleburg', 'Jacksonville Beach', 'Neptune Beach', 'Atlantic Beach', 'Nocatee'],
  services:     ['garage door repair', 'broken spring replacement', 'opener installation', 'cable repair', 'new door installation', 'emergency service', 'maintenance tune-up', 'off-track door repair', 'hurricane-rated door installation', 'roller replacement'],
  usp:          'Same-day service, licensed & insured, flat-rate pricing, no hidden fees — you get the owner directly, not a call center',
  yearsExp:     5,
  license:      '',                            // ← your contractor license # (optional)
  reviewLink:   '',                            // ← Google Maps review link (optional)

  // Research-backed targets — real Jacksonville companies and communities
  pmCompanies:  ['Navy to Navy Homes', 'Nest Finders', 'Green River Property Management', 'First Place Management', 'Rental Guys Property Management', 'Suncoast Rentals'],
  hoaTargets:   ['Marsh Landing', 'Del Webb Ponte Vedra', 'Sawgrass Country Club', 'Fairfield', 'Plantation Oaks'],
  topZipCodes:  ['32082 (Ponte Vedra Beach)', '32250 (Jacksonville Beach)', '32233 (Atlantic Beach)', '32266 (Neptune Beach)'],

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
