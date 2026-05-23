#!/usr/bin/env node
// Run: node generate-city-pages.js
const fs   = require('fs');
const path = require('path');

const PHONE     = '(904) 468-3428';
const PHONE_RAW = '9044683428';
const DOMAIN    = 'https://904garagedoors.com';
const YEAR      = '2025';

const cities = [
  {
    slug:    'ponte-vedra',
    name:    'Ponte Vedra',
    full:    'Ponte Vedra, FL',
    county:  'St. Johns County',
    zip:     '32082',
    lat:     30.2379, lng: -81.3862,
    heroH:   ["Ponte Vedra's", 'garage door', "crew. We're", '<strong>45 min</strong> away.'],
    heroCopy: 'Same-day garage door repair for Ponte Vedra homeowners. Flat-rate quote before we start — serving 32082, 32081 and all of Sawgrass, Palm Valley, and Ponte Vedra Beach.',
    cityPara: [
      'Ponte Vedra homeowners expect the job done right. We stock parts on the truck so most repairs — broken springs, cable replacements, opener failures — are finished in a single visit. No second trip, no waiting.',
      'We cover all of Ponte Vedra including Ponte Vedra Beach, Sawgrass Players Club, the TPC area, Palm Valley, and the 32082 and 32081 zip codes. If you\'re in the neighborhood, we\'re on our way.'
    ],
    review: {
      text: '"Spring snapped Saturday morning with the car trapped inside. Called 904 at 8am, tech was at the house by 9:45. Fixed in 45 minutes, exact price quoted on the phone. Best service call I\'ve had in years."',
      name: 'James & Karen F.', initials: 'JF', service: 'Spring Replacement · Ponte Vedra Beach'
    },
    faqs: [
      { q: 'Do you cover all of Ponte Vedra?', a: 'Yes — Ponte Vedra Beach, Palm Valley, Sawgrass, TPC area, and both 32082 and 32081 zip codes. Same-day service across all of it.' },
      { q: 'How fast can you arrive in Ponte Vedra?', a: 'Most Ponte Vedra calls are handled the same day, typically within 2–3 hours. Emergency calls get priority dispatch.' },
    ],
    nearby: [
      { name: 'Jacksonville Beach', slug: 'jacksonville-beach' },
      { name: 'Nocatee',            slug: 'nocatee' },
      { name: 'Atlantic Beach',     slug: 'atlantic-beach' },
    ],
  },
  {
    slug:    'jacksonville-beach',
    name:    'Jacksonville Beach',
    full:    'Jacksonville Beach, FL',
    county:  'Duval County',
    zip:     '32250',
    lat:     30.2847, lng: -81.3932,
    heroH:   ['Jax Beach', 'garage door', 'problems?', 'We fix them <strong>today.</strong>'],
    heroCopy: 'Same-day garage door repair in Jacksonville Beach and all of the beach communities. Springs, openers, cables — flat-rate quote, no surprises. Serving 32250.',
    cityPara: [
      'Jacksonville Beach homes deal with salt air, humidity, and the kind of wear that coastal living puts on hardware. Springs corrode faster. Cables fray sooner. We know what to look for and we fix it right.',
      'We serve all of Jacksonville Beach including the pier area, Pablo Creek, the neighborhoods east of A1A, and the full 32250 zip code. One call and we\'re there.'
    ],
    review: {
      text: '"Opener died Sunday morning, car trapped in the garage. They answered immediately, sent someone out within two hours. Got it fixed and even checked the spring tension before leaving. Didn\'t try to upsell me anything."',
      name: 'Mike D.', initials: 'MD', service: 'Opener Repair · Jacksonville Beach'
    },
    faqs: [
      { q: 'Do salt air and humidity affect garage doors more at the beach?', a: 'Yes. Salt air accelerates spring and cable corrosion in coastal areas. We recommend a yearly tune-up for beach homes — it\'s a $99 catch-before-it-breaks investment.' },
      { q: 'Do you serve Jacksonville Beach on weekends?', a: 'Yes, 7 days a week. Weekends included. We prioritize calls where the door won\'t open or close.' },
    ],
    nearby: [
      { name: 'Neptune Beach',  slug: 'neptune-beach' },
      { name: 'Atlantic Beach', slug: 'atlantic-beach' },
      { name: 'Ponte Vedra',   slug: 'ponte-vedra' },
    ],
  },
  {
    slug:    'fernandina-beach',
    name:    'Fernandina Beach',
    full:    'Fernandina Beach, FL',
    county:  'Nassau County',
    zip:     '32034',
    lat:     30.6696, lng: -81.4618,
    heroH:   ['Amelia Island', 'garage door', 'repair.', 'There <strong>today.</strong>'],
    heroCopy: 'Garage door repair on Amelia Island and in Fernandina Beach. Same-day service, flat-rate pricing, no trip fees. Serving all of Nassau County — 32034.',
    cityPara: [
      'Fernandina Beach and the rest of Amelia Island get the same humidity and salt air that ages garage door hardware faster than inland areas. We carry the parts most commonly needed in coastal Nassau County.',
      'We serve Fernandina Beach, Amelia City, American Beach, and the surrounding areas in the 32034 zip code. No trip fees, no add-ons — just a flat-rate quote and the job done right.'
    ],
    review: {
      text: '"Cable snapped on a Friday evening. I figured I\'d be waiting until Monday. Called 904 and they were out Saturday morning, had us back up and running before noon. Fair price, great crew."',
      name: 'Patricia H.', initials: 'PH', service: 'Cable Repair · Fernandina Beach'
    },
    faqs: [
      { q: 'Do you travel to Amelia Island?', a: 'Yes. We serve Fernandina Beach, Amelia Island, and all of Nassau County with no extra trip fees.' },
      { q: 'How quickly can you get to Fernandina Beach?', a: 'Same-day service for most calls. Being in Nassau County, we aim to arrive within 2–4 hours of your call.' },
    ],
    nearby: [
      { name: 'Yulee',          slug: 'yulee' },
      { name: 'Jacksonville',   slug: 'jacksonville' },
    ],
  },
  {
    slug:    'yulee',
    name:    'Yulee',
    full:    'Yulee, FL',
    county:  'Nassau County',
    zip:     '32097',
    lat:     30.6335, lng: -81.5968,
    heroH:   ['Yulee garage', 'door repair.', 'Fast, flat-rate,', '<strong>same day.</strong>'],
    heroCopy: 'Same-day garage door repair in Yulee and Nassau County. Broken springs, openers, cables — we come to you, quote it flat, and fix it today. Serving 32097.',
    cityPara: [
      'Yulee is growing fast and so is the demand for reliable local service. We work with homeowners in the newer subdivisions off I-95 and the more established neighborhoods around town — same fast response either way.',
      'We cover all of Yulee, including Lofton Creek, Nassau Crossing, and the surrounding areas in 32097. One call gets you a real estimate and a same-day appointment.'
    ],
    review: {
      text: '"Door wouldn\'t open at 6:30am with two kids needing to get to school. Called 904, they talked me through a quick check, and when it was clear the spring was broken they had someone out by 10am. Lifesaver."',
      name: 'Robert T.', initials: 'RT', service: 'Emergency Spring Repair · Yulee'
    },
    faqs: [
      { q: 'Do you serve the newer subdivisions in Yulee?', a: 'Yes — all of Yulee including newer developments off I-95, Lofton Creek, and surrounding neighborhoods in 32097.' },
      { q: 'Same-day service in Yulee?', a: 'Yes, same day. We serve Nassau County including Yulee 7 days a week.' },
    ],
    nearby: [
      { name: 'Fernandina Beach', slug: 'fernandina-beach' },
      { name: 'Jacksonville',     slug: 'jacksonville' },
    ],
  },
  {
    slug:    'nocatee',
    name:    'Nocatee',
    full:    'Nocatee, FL',
    county:  'St. Johns County',
    zip:     '32081',
    lat:     30.1263, lng: -81.4132,
    heroH:   ['Nocatee garage', 'door repair.', 'New home,', '<strong>real service.</strong>'],
    heroCopy: 'Same-day garage door repair in Nocatee and Ponte Vedra. New construction issues, opener installs, broken springs — flat-rate quote, no surprises. Serving 32081.',
    cityPara: [
      'Nocatee is one of the fastest-growing master-planned communities in Florida. New construction means new openers — and new opener issues. We\'re familiar with the brands common in newer builds and we fix them right the first time.',
      'We serve all of Nocatee\'s neighborhoods including Crosswater, Twenty Mile, Siena at Nocatee, Heritage Trace, and more. Same-day, flat-rate, no games.'
    ],
    review: {
      text: '"Just moved into our Nocatee home and the garage opener wasn\'t programmed correctly. Called 904, they came out same day, set it all up properly and showed us how to use the smart features. Quick and professional."',
      name: 'Ashley & Tom W.', initials: 'AW', service: 'Opener Installation · Nocatee'
    },
    faqs: [
      { q: 'Do you work on newer homes and new-construction openers in Nocatee?', a: 'Yes. We work on all major brands common in new construction including LiftMaster, Chamberlain, and Genie. Programming, repairs, or full replacements.' },
      { q: 'What neighborhoods in Nocatee do you cover?', a: 'All of them — Crosswater, Twenty Mile, Heritage Trace, Siena at Nocatee, and the rest. All in 32081.' },
    ],
    nearby: [
      { name: 'Ponte Vedra',       slug: 'ponte-vedra' },
      { name: 'Jacksonville Beach', slug: 'jacksonville-beach' },
      { name: 'St. Johns',          slug: 'st-johns' },
    ],
  },
  {
    slug:    'mandarin',
    name:    'Mandarin',
    full:    'Mandarin, FL',
    county:  'Duval County',
    zip:     '32257',
    lat:     30.1452, lng: -81.6203,
    heroH:   ['Mandarin garage', 'door repair.', 'Same-day,', '<strong>no runaround.</strong>'],
    heroCopy: 'Garage door repair in Mandarin — springs, openers, cables, new doors. Flat-rate pricing and same-day service for all of Jacksonville\'s Mandarin area. Serving 32257 and 32258.',
    cityPara: [
      'Mandarin is one of Jacksonville\'s most established neighborhoods, and we\'ve been serving it for years. Whether you\'re near the St. Johns River or off San Jose Boulevard, we know the area and we show up on time.',
      'We serve all of Mandarin including San Jose, Loretto, Beauclerc, and the surrounding neighborhoods in 32257 and 32258. One call, same-day service, real price upfront.'
    ],
    review: {
      text: '"Signed up for the $99 tune-up just to see what it was about. Tech found a fraying cable and a spring that was close to snapping. Fixed both while he was there, saved me from an emergency call down the road. Worth every penny."',
      name: 'Carol B.', initials: 'CB', service: 'Tune-Up & Preventive Repair · Mandarin'
    },
    faqs: [
      { q: 'Do you serve San Jose and the Beauclerc area in Mandarin?', a: 'Yes — all of Mandarin, San Jose, Loretto, Beauclerc, and surrounding areas in 32257 and 32258.' },
      { q: 'Is the $99 tune-up really worth it?', a: 'For most homes that haven\'t had a service in a year or more, yes. We catch fraying cables, worn springs, and alignment issues before they become $300+ emergency repairs.' },
    ],
    nearby: [
      { name: 'Orange Park',    slug: 'orange-park' },
      { name: 'Fleming Island', slug: 'fleming-island' },
      { name: 'Southside',      slug: 'southside' },
    ],
  },
  {
    slug:    'orange-park',
    name:    'Orange Park',
    full:    'Orange Park, FL',
    county:  'Clay County',
    zip:     '32065',
    lat:     30.1668, lng: -81.7062,
    heroH:   ['Orange Park', 'garage door', 'repair. We', '<strong>come to you.</strong>'],
    heroCopy: 'Same-day garage door repair in Orange Park and Clay County. Springs, cables, openers, new installations — flat-rate quotes, no trip fees. Serving 32065 and 32073.',
    cityPara: [
      'Orange Park homeowners need fast, reliable service without the Jacksonville metro markup. We\'re local, we know Clay County, and we charge the same flat rates regardless of where you are in the 904.',
      'We cover all of Orange Park including Oakleaf Plantation, Doctors Lake area, and the neighborhoods along US-17 and Blanding Boulevard. Same-day availability, 7 days a week.'
    ],
    review: {
      text: '"Spring broke at the worst time — car inside, kids\' school pickup in two hours. Called 904 and they got there in time. Tech was efficient, explained what happened, fixed it cleanly. Exactly what you want."',
      name: 'Greg M.', initials: 'GM', service: 'Emergency Spring Repair · Orange Park'
    },
    faqs: [
      { q: 'Do you serve Oakleaf Plantation in Orange Park?', a: 'Yes — Oakleaf Plantation, Doctors Lake area, and all of Orange Park in 32065 and 32073.' },
      { q: 'Are there extra fees for Clay County?', a: 'No. Same flat-rate pricing as everywhere in the 904. No trip fees, no area surcharges.' },
    ],
    nearby: [
      { name: 'Fleming Island', slug: 'fleming-island' },
      { name: 'Mandarin',       slug: 'mandarin' },
      { name: 'Middleburg',     slug: 'middleburg' },
    ],
  },
  {
    slug:    'fleming-island',
    name:    'Fleming Island',
    full:    'Fleming Island, FL',
    county:  'Clay County',
    zip:     '32003',
    lat:     30.1088, lng: -81.7154,
    heroH:   ['Fleming Island', 'garage doors.', 'Fast service,', '<strong>fair price.</strong>'],
    heroCopy: 'Garage door repair in Fleming Island — same-day service, flat-rate pricing for all of Clay County. Springs, openers, cables, new doors. Serving 32003.',
    cityPara: [
      'Fleming Island is one of Clay County\'s most desirable addresses, and homeowners here expect quality work. We show up on time, quote it flat before we start, and get it done in one visit.',
      'We serve all of Fleming Island including Fleming Island Plantation, Eagle Harbor, and the surrounding areas in 32003. Call us and we\'ll be there the same day.'
    ],
    review: {
      text: '"Had a new opener installed — we wanted the quiet belt drive for the bedroom above the garage. They recommended the right LiftMaster model, had it in the next morning, and it\'s so quiet we forget the garage is there."',
      name: 'Jennifer & Paul S.', initials: 'JS', service: 'Opener Installation · Fleming Island'
    },
    faqs: [
      { q: 'Do you serve Fleming Island Plantation and Eagle Harbor?', a: 'Yes — all of Fleming Island including Fleming Island Plantation, Eagle Harbor, and surrounding 32003 neighborhoods.' },
      { q: 'Can you recommend a quiet opener for a bedroom above the garage?', a: 'Absolutely. Belt-drive openers are significantly quieter than chain drives. We stock the top models and can install same-day if you\'re in Fleming Island.' },
    ],
    nearby: [
      { name: 'Orange Park', slug: 'orange-park' },
      { name: 'Middleburg',  slug: 'middleburg' },
      { name: 'Mandarin',    slug: 'mandarin' },
    ],
  },
  {
    slug:    'neptune-beach',
    name:    'Neptune Beach',
    full:    'Neptune Beach, FL',
    county:  'Duval County',
    zip:     '32266',
    lat:     30.3121, lng: -81.4007,
    heroH:   ['Neptune Beach', 'garage door', 'repair. Fast,', '<strong>coastal-ready.</strong>'],
    heroCopy: 'Same-day garage door repair in Neptune Beach. We understand coastal wear on springs and hardware. Flat-rate service, no surprises. Serving 32266.',
    cityPara: [
      'Neptune Beach is a small, tight-knit community — and coastal hardware doesn\'t last as long as it does inland. Salt air is tough on springs, cables, and hinges. We do a thorough check every visit so you\'re not surprised in six months.',
      'We serve all of Neptune Beach including the neighborhoods near the oceanfront, Atlantic Boulevard, and the 32266 zip code. Same-day, 7 days a week.'
    ],
    review: {
      text: '"Door wouldn\'t open — completely stuck. They came out on a Sunday, diagnosed a broken cable, replaced both so I wouldn\'t have the other snap two months later. Good call. Honest service."',
      name: 'Chris A.', initials: 'CA', service: 'Emergency Cable Repair · Neptune Beach'
    },
    faqs: [
      { q: 'How often should beach homeowners service their garage door?', a: 'We recommend every 12 months for homes in Neptune Beach and the beach communities. Salt air accelerates wear, especially on springs and cables.' },
      { q: 'Do you serve Neptune Beach on Sundays?', a: 'Yes, 7 days a week including Sunday. We prioritize emergency calls where the door won\'t move.' },
    ],
    nearby: [
      { name: 'Atlantic Beach',     slug: 'atlantic-beach' },
      { name: 'Jacksonville Beach', slug: 'jacksonville-beach' },
    ],
  },
  {
    slug:    'atlantic-beach',
    name:    'Atlantic Beach',
    full:    'Atlantic Beach, FL',
    county:  'Duval County',
    zip:     '32233',
    lat:     30.3360, lng: -81.3990,
    heroH:   ['Atlantic Beach', 'garage door', 'repair.', '<strong>Today.</strong>'],
    heroCopy: 'Garage door repair in Atlantic Beach — same-day service, coastal hardware expertise, flat-rate pricing. Serving homeowners in 32233 and the beach communities.',
    cityPara: [
      'Atlantic Beach is a quiet neighborhood with real beach character. We\'ve worked on homes here long enough to know that the ocean air accelerates wear faster than homeowners expect. We always check the whole system, not just the part that broke.',
      'We serve all of Atlantic Beach in 32233, including the neighborhoods near Town Center, Howell Park, and the oceanfront streets. Quick response, honest pricing.'
    ],
    review: {
      text: '"Spring replacement done right. Tech arrived in the window promised, replaced the spring, then noticed the cables were starting to fray. Fixed those too while he was there. Proactive, efficient, fair price."',
      name: 'Lisa M.', initials: 'LM', service: 'Spring & Cable Repair · Atlantic Beach'
    },
    faqs: [
      { q: 'Do you serve Atlantic Beach Town Center area?', a: 'Yes — all of Atlantic Beach in 32233, including Town Center, Howell Park, and the surrounding neighborhoods.' },
      { q: 'What\'s the most common repair you see in Atlantic Beach?', a: 'Spring failure and cable wear are the most common calls in the beach communities. Salt air shortens the lifespan of both significantly.' },
    ],
    nearby: [
      { name: 'Neptune Beach',      slug: 'neptune-beach' },
      { name: 'Jacksonville Beach', slug: 'jacksonville-beach' },
      { name: 'Ponte Vedra',        slug: 'ponte-vedra' },
    ],
  },
  {
    slug:    'bartram-park',
    name:    'Bartram Park',
    full:    'Bartram Park, FL',
    county:  'St. Johns County',
    zip:     '32258',
    lat:     30.1010, lng: -81.5620,
    heroH:   ['Bartram Park', 'garage door', 'repair.', '<strong>Same day.</strong>'],
    heroCopy: 'Garage door repair in Bartram Park — fast same-day service for the planned communities of south St. Johns County. Flat-rate pricing, no surprises.',
    cityPara: [
      'Bartram Park and the surrounding master-planned communities in 32258 have seen some of the fastest growth in all of Northeast Florida. Newer construction means a lot of homes with warranty windows closing — and garage doors that were installed quickly during the building boom.',
      'We serve all of Bartram Park, Bartram Springs, Durbin Crossing, and the neighborhoods south along US-1 toward St. Johns. When a spring breaks on a Monday morning and you need to get to work, we get there first.'
    ],
    review: {
      text: '"Brand new house, two-year-old door, spring snapped without warning. 904 came out the same afternoon, had the part on the truck, and explained exactly what happened. Solid crew."',
      name: 'Derek H.', initials: 'DH', service: 'Spring Replacement · Bartram Park'
    },
    faqs: [
      { q: 'Do you serve the Durbin Crossing and Bartram Springs communities?', a: 'Yes — all of Bartram Park, Bartram Springs, Durbin Crossing, and the surrounding neighborhoods in 32258 and South St. Johns County.' },
      { q: 'My garage door is only a few years old — why did the spring break?', a: 'Builder-grade springs in new construction are often rated for fewer cycles than premium replacements. We upgrade to higher-cycle springs so you\'re not calling again in 2 years.' },
    ],
    nearby: [
      { name: 'Nocatee',        slug: 'nocatee' },
      { name: 'Fleming Island', slug: 'fleming-island' },
      { name: 'Orange Park',    slug: 'orange-park' },
    ],
  },
  {
    slug:    'arlington',
    name:    'Arlington',
    full:    'Arlington, Jacksonville FL',
    county:  'Duval County',
    zip:     '32211',
    lat:     30.3350, lng: -81.5700,
    heroH:   ['Arlington', 'garage door', 'repair.', '<strong>Today.</strong>'],
    heroCopy: 'Garage door repair in Arlington, Jacksonville — same-day service for Duval County\'s east side. Honest flat-rate pricing, 7 days a week.',
    cityPara: [
      'Arlington is one of Jacksonville\'s established east-side neighborhoods — mature trees, older homes, and garage doors that have been running for 15 to 20 years. When they finally go, we get there fast.',
      'We cover all of Arlington in 32211, from the Regency Square area through to the St. Johns River waterfront neighborhoods. Springs, openers, cables, full replacements — whatever the door needs, same day.'
    ],
    review: {
      text: '"Called at 8 AM, they were here by 10. Older home with an older door — they knew exactly what it needed, had the springs on the truck, and were done in 45 minutes. No upselling, just fixed it."',
      name: 'Sandra T.', initials: 'ST', service: 'Spring Replacement · Arlington'
    },
    faqs: [
      { q: 'Do you service older homes in Arlington with original garage doors?', a: 'Absolutely. Older Duval County homes are a big part of our work. We stock springs and hardware for legacy doors and can usually complete the repair same day.' },
      { q: 'Do you serve the Regency Square area?', a: 'Yes — all of Arlington including Regency, the waterfront areas, and the neighborhoods along Atlantic Blvd.' },
    ],
    nearby: [
      { name: 'Atlantic Beach',    slug: 'atlantic-beach' },
      { name: 'Neptune Beach',     slug: 'neptune-beach' },
      { name: 'Mandarin',          slug: 'mandarin' },
    ],
  },
  {
    slug:    'southside',
    name:    'Southside',
    full:    'Southside, Jacksonville FL',
    county:  'Duval County',
    zip:     '32256',
    lat:     30.2180, lng: -81.5530,
    heroH:   ['Southside Jacksonville', 'garage door', 'repair.', '<strong>Same day.</strong>'],
    heroCopy: 'Garage door repair in Southside Jacksonville — serving Deerwood, Tinseltown, and the Town Center corridor. Flat-rate pricing, fast response.',
    cityPara: [
      'Southside Jacksonville — including Deerwood, Tinseltown, and the Town Center corridor — is one of the most active residential and commercial zones in the city. We run a lot of calls in 32256 because of the density: townhomes, single-family communities, and new builds all along the 9A corridor.',
      'Whether you\'re in a Deerwood estate or a newer Town Center townhome, we serve all of Southside same day. Quick dispatch from our centrally located team means most calls in this zone get a tech in under two hours.'
    ],
    review: {
      text: '"Townhome in the Town Center area, single car garage, opener died on a Wednesday evening. They had someone out by 8 AM the next day. New opener, tested everything, in and out in an hour. Worth every penny."',
      name: 'Marcus W.', initials: 'MW', service: 'Opener Replacement · Southside'
    },
    faqs: [
      { q: 'Do you serve the Deerwood and Town Center neighborhoods?', a: 'Yes — all of Southside Jacksonville in 32256, including Deerwood, Tinseltown, Town Center, and the surrounding communities.' },
      { q: 'Can you service townhome garage doors in Southside?', a: 'Absolutely. Townhome garages are common in Southside and we carry parts that fit the compact single-car systems typical in those communities.' },
    ],
    nearby: [
      { name: 'Mandarin',       slug: 'mandarin' },
      { name: 'Bartram Park',   slug: 'bartram-park' },
      { name: 'Orange Park',    slug: 'orange-park' },
    ],
  },
  {
    slug:    'st-johns',
    name:    'St. Johns',
    full:    'St. Johns, FL',
    county:  'St. Johns County',
    zip:     '32259',
    lat:     30.1020, lng: -81.6000,
    heroH:   ['St. Johns', 'garage door', 'repair.', '<strong>Same day.</strong>'],
    heroCopy: 'Garage door repair in St. Johns — serving the fastest-growing county in Florida. Same-day service for RiverTown, Julington Creek, and all of 32259.',
    cityPara: [
      'St. Johns County is the fastest-growing county in Florida, and 32259 is at the center of that growth. RiverTown, Julington Creek Plantation, Durbin Crossing South — these master-planned communities are full of homes where the garage door is the main entry point every single day.',
      'We prioritize St. Johns County calls because volume is high and competition is real. Fast response, transparent pricing, and technicians who know the neighborhoods. We\'re not just passing through — this is one of our busiest service zones.'
    ],
    review: {
      text: '"RiverTown community, opener failed and door was stuck halfway. Called at 7 AM, tech was at the house by 9:30. Fixed the opener, checked the springs and cables while he was there. Professional all the way through."',
      name: 'Jennifer B.', initials: 'JB', service: 'Opener Repair · St. Johns'
    },
    faqs: [
      { q: 'Do you serve RiverTown and Julington Creek Plantation?', a: 'Yes — all of St. Johns County in 32259, including RiverTown, Julington Creek, Durbin Crossing South, and the growing communities along the 9B corridor.' },
      { q: 'Is same-day service available in St. Johns?', a: 'Yes. St. Johns is one of our most active service zones and we run multiple techs in the area daily. Same-day is almost always available.' },
    ],
    nearby: [
      { name: 'Nocatee',        slug: 'nocatee' },
      { name: 'Bartram Park',   slug: 'bartram-park' },
      { name: 'Fleming Island', slug: 'fleming-island' },
    ],
  },
  {
    slug:    'middleburg',
    name:    'Middleburg',
    full:    'Middleburg, FL',
    county:  'Clay County',
    zip:     '32068',
    lat:     30.0690, lng: -81.8830,
    heroH:   ['Middleburg', 'garage door', 'repair.', '<strong>Today.</strong>'],
    heroCopy: 'Garage door repair in Middleburg, FL — serving Clay County with same-day service. Spring replacement, openers, cables, and full installations in 32068.',
    cityPara: [
      'Middleburg is Clay County\'s working-class heart — established neighborhoods, newer subdivisions, and a lot of homes where the garage door gets heavy use every day. When it breaks, you need someone who shows up when they say they will.',
      'We serve all of Middleburg in 32068 including the communities along Blanding Blvd and CR-218. Flat-rate pricing, no hidden fees, same-day availability most days. We\'re not the cheapest option, but we\'re the one you won\'t have to call back.'
    ],
    review: {
      text: '"Middleburg homeowner here. Spring broke on a Friday afternoon — called three places, only 904 could come out the same day. Fair price, tech knew what he was doing. Already recommended them to two neighbors."',
      name: 'Kevin P.', initials: 'KP', service: 'Spring Replacement · Middleburg'
    },
    faqs: [
      { q: 'Do you service Middleburg and Clay County?', a: 'Yes — all of Middleburg in 32068 and the surrounding Clay County communities. We run the Blanding Blvd corridor regularly.' },
      { q: 'How quickly can you get to Middleburg?', a: 'Usually same day. Middleburg is a regular service zone for us — we typically have availability within a few hours on weekdays.' },
    ],
    nearby: [
      { name: 'Orange Park',    slug: 'orange-park' },
      { name: 'Fleming Island', slug: 'fleming-island' },
      { name: 'Mandarin',       slug: 'mandarin' },
    ],
  },
  {
    slug:    'ortega',
    name:    'Ortega',
    full:    'Ortega, Jacksonville FL',
    county:  'Duval County',
    zip:     '32210',
    lat:     30.2760, lng: -81.7060,
    heroH:   ['Ortega', 'garage door', 'repair.', '<strong>Today.</strong>'],
    heroCopy: 'Garage door repair in Ortega, Jacksonville — serving one of Duval County\'s most established waterfront neighborhoods. Same-day service, premium results.',
    cityPara: [
      'Ortega is one of Jacksonville\'s most established and storied neighborhoods — large lots, older homes with custom doors, and waterfront estates where presentation matters as much as function. We\'ve done work throughout Ortega and know the difference between a quick fix and the right fix.',
      'We serve all of Ortega in 32210, from the Ortega Forest area through to the Venetia and Tide Water communities. Whether it\'s a 30-year-old door on a classic estate or a newer installation that\'s acting up, same-day service is standard.'
    ],
    review: {
      text: '"Ortega Forest home — original wood carriage doors from the 80s. Found a company willing to work on them instead of just telling me to replace everything. They repaired the springs and hardware, door works better than it has in years."',
      name: 'Patricia L.', initials: 'PL', service: 'Spring & Hardware Repair · Ortega'
    },
    faqs: [
      { q: 'Do you work on older and custom garage doors in Ortega?', a: 'Yes — we work on all door types including older wood carriage doors and custom installations common in Ortega\'s estate homes. We repair first when possible.' },
      { q: 'Do you serve Ortega Forest and the waterfront neighborhoods?', a: 'Yes — all of Ortega in 32210, including Ortega Forest, Venetia, Tide Water, and the surrounding Duval County neighborhoods.' },
    ],
    nearby: [
      { name: 'Orange Park',    slug: 'orange-park' },
      { name: 'Fleming Island', slug: 'fleming-island' },
      { name: 'Mandarin',       slug: 'mandarin' },
    ],
  },
];

/* ─── SHARED CONTENT ─── */
const sharedServices = `
      <div class="svc"><span class="svc-num">01</span><div class="svc-name">Spring Replacement</div><p class="svc-desc">Torsion or extension — springs are the most common failure. We stock both and replace them in under an hour.</p><div class="svc-price">From $150 · Same day</div></div>
      <div class="svc"><span class="svc-num">02</span><div class="svc-name">Opener Repair &amp; Install</div><p class="svc-desc">LiftMaster, Chamberlain, Genie — we repair or replace all major brands including Wi-Fi smart openers.</p><div class="svc-price">From $120 · Same day</div></div>
      <div class="svc"><span class="svc-num">03</span><div class="svc-name">Emergency Repair</div><p class="svc-desc">Car trapped. Door stuck open. We answer 7 days a week and prioritize emergency calls above everything.</p><div class="svc-price">7 days a week · Priority dispatch</div></div>
      <div class="svc"><span class="svc-num">04</span><div class="svc-name">Cable Repair</div><p class="svc-desc">Snapped cables make the door dangerous and unusable. We replace both at once so you're not back here in 6 months.</p><div class="svc-price">From $110 · Same day</div></div>
      <div class="svc"><span class="svc-num">05</span><div class="svc-name">New Door Installation</div><p class="svc-desc">Steel, carriage-house, glass panels — we help you pick the right door for your home, then install it cleanly.</p><div class="svc-price">Free in-home consultation</div></div>
      <div class="svc"><span class="svc-num">06</span><div class="svc-name">Tune-Up &amp; Maintenance</div><p class="svc-desc">A full 20-point inspection and lubrication. Catches problems before they become expensive ones.</p><div class="svc-price">$99 flat rate</div></div>`;

const sharedFaqs = [
  { q: 'What does garage door spring replacement cost?', a: 'Spring replacement runs $150–$350 depending on type and door size. You get a flat-rate quote before we start — no surprises. Most jobs take under an hour.' },
  { q: 'Are you licensed and insured?', a: 'Yes, fully. Florida state licensed, fully insured on every job.' },
  { q: 'What\'s included in a tune-up?', a: 'A 20-point inspection, full lubrication, spring tension check, opener force test, cable inspection, and safety check. $99 flat. It\'s the cheapest way to avoid a $300 repair.' },
];

/* ─── HTML GENERATOR ─── */
function generatePage(c) {
  const heroHtml = c.heroH.map(l => l).join('<br>');
  const allFaqs  = [...c.faqs, ...sharedFaqs];
  const faqItems = allFaqs.map(f => `
      <div class="faq-item">
        <button class="faq-btn" onclick="toggleFaq(this)">
          <span class="faq-q">${f.q}</span>
          <span class="faq-icon">+</span>
        </button>
        <div class="faq-a">${f.a}</div>
      </div>`).join('');

  const nearbyLinks = c.nearby.map(n =>
    `<a class="nearby-link" href="/garage-door-repair-${n.slug}">${n.name}</a>`
  ).join('');

  const schemaAreaServed = JSON.stringify([c.name, 'Jacksonville', ...c.nearby.map(n => n.name)]);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Garage Door Repair ${c.name}, FL | Same-Day Service | 904 Garage Doors</title>
  <meta name="description" content="Expert garage door repair in ${c.name}, FL. Same-day service, flat-rate pricing, licensed &amp; insured. Springs, openers, cables, new doors. Call ${PHONE}." />
  <meta name="keywords" content="garage door repair ${c.name} FL, garage door repair ${c.name}, broken spring ${c.name}, garage door opener ${c.name}, emergency garage door ${c.name}, 904 garage doors ${c.name}" />
  <link rel="canonical" href="${DOMAIN}/garage-door-repair-${c.slug}" />
  <meta property="og:title" content="Garage Door Repair ${c.name} FL | 904 Garage Doors" />
  <meta property="og:description" content="Same-day garage door repair in ${c.name}. Licensed, insured, flat-rate pricing. Call ${PHONE}." />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${DOMAIN}/garage-door-repair-${c.slug}" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"LocalBusiness","name":"904 Garage Doors","telephone":"${PHONE}","url":"${DOMAIN}","address":{"@type":"PostalAddress","addressLocality":"${c.name}","addressRegion":"FL","postalCode":"${c.zip}","addressCountry":"US"},"geo":{"@type":"GeoCoordinates","latitude":${c.lat},"longitude":${c.lng}},"areaServed":${schemaAreaServed},"priceRange":"$$","openingHoursSpecification":{"@type":"OpeningHoursSpecification","dayOfWeek":["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],"opens":"07:00","closes":"21:00"},"aggregateRating":{"@type":"AggregateRating","ratingValue":"5","reviewCount":"47"}}
  </script>

  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --ink:     #0d1117;
      --ink-2:   #1c2333;
      --ink-3:   #2d3748;
      --white:   #ffffff;
      --off:     #f7f8fa;
      --light:   #eef0f4;
      --border:  #dde1e8;
      --sub:     #6b7280;
      --red:     #d63b2f;
      --red-d:   #b52e24;
      --gold:    #c9a84c;
      --green:   #16a34a;
    }
    html { scroll-behavior: smooth; }
    body { background: var(--white); color: var(--ink); font-family: 'Inter', sans-serif; -webkit-font-smoothing: antialiased; overflow-x: hidden; }
    a { text-decoration: none; color: inherit; }
    img { display: block; max-width: 100%; }

    .reveal { opacity: 0; transform: translateY(28px); transition: opacity 0.65s ease, transform 0.65s ease; }
    .reveal.d1 { transition-delay: 0.1s; }
    .reveal.d2 { transition-delay: 0.2s; }
    .reveal.d3 { transition-delay: 0.3s; }
    .reveal.d4 { transition-delay: 0.4s; }
    .reveal.visible { opacity: 1; transform: none; }
    .wrap { max-width: 1100px; margin: 0 auto; padding: 0 1.5rem; }

    /* CALL BAR */
    .call-bar { display: none; position: fixed; bottom: 0; left: 0; right: 0; z-index: 999; background: var(--red); color: #fff; padding: 1rem; text-align: center; font-weight: 800; font-size: 1rem; letter-spacing: 0.04em; box-shadow: 0 -4px 24px rgba(214,59,47,0.35); }
    @media (max-width: 600px) { .call-bar { display: block; } }

    /* BREADCRUMB */
    .breadcrumb { background: var(--off); border-bottom: 1px solid var(--border); padding: 0.6rem 0; margin-top: 66px; }
    .breadcrumb-inner { font-size: 0.72rem; color: var(--sub); display: flex; gap: 0.4rem; align-items: center; }
    .breadcrumb-inner a { color: var(--sub); }
    .breadcrumb-inner a:hover { color: var(--ink); }
    .breadcrumb-inner span { color: var(--ink); font-weight: 600; }

    /* NAV */
    .nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; background: rgba(13,17,23,0.96); backdrop-filter: blur(10px); border-bottom: 1px solid rgba(255,255,255,0.06); }
    .nav-inner { max-width: 1100px; margin: 0 auto; padding: 0 1.5rem; height: 66px; display: flex; align-items: center; gap: 1rem; }
    .nav-logo { font-family: 'Bebas Neue', sans-serif; font-size: 1.5rem; letter-spacing: 0.08em; color: #fff; text-decoration: none; flex-shrink: 0; }
    .nav-logo em { color: var(--gold); font-style: normal; }
    .nav-links { display: flex; align-items: center; list-style: none; gap: 0.25rem; margin-left: auto; }
    .nav-links a { font-family: 'Inter', sans-serif; font-size: 0.875rem; font-weight: 500; letter-spacing: 0.01em; color: rgba(255,255,255,0.6); padding: 0.5rem 0.85rem; border-radius: 5px; transition: color 0.18s; text-decoration: none; }
    .nav-links a:hover { color: #fff; }
    .nav-call { margin-left: 0.5rem; background: var(--red); color: #fff !important; padding: 0.5rem 1.2rem !important; border-radius: 6px; font-family: 'Inter', sans-serif !important; font-size: 0.875rem !important; font-weight: 700 !important; letter-spacing: 0.01em !important; transition: background 0.18s !important; }
    .nav-call:hover { background: var(--red-d) !important; }
    .hamburger { display: none; flex-direction: column; gap: 5px; cursor: pointer; margin-left: auto; padding: 4px; }
    .hamburger span { display: block; width: 22px; height: 2px; background: #fff; border-radius: 2px; }
    @media (max-width: 780px) {
      .hamburger { display: flex; }
      .nav-links { display: none; position: fixed; top: 66px; left: 0; right: 0; background: var(--ink); border-bottom: 1px solid rgba(255,255,255,0.08); flex-direction: column; align-items: stretch; padding: 1rem 1.5rem; gap: 0.25rem; }
      .nav-links.open { display: flex; }
      .nav-links a { padding: 0.8rem 0.5rem; }
      .nav-call { margin-left: 0; text-align: center; }
    }

    /* HERO */
    .hero { background: var(--ink); padding: 60px 0 80px; position: relative; overflow: hidden; }
    .hero-lines { position: absolute; inset: 0; pointer-events: none; background-image: linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px); background-size: 80px 80px; }
    .hero-accent { position: absolute; top: 0; right: 0; width: 50%; height: 100%; background: linear-gradient(135deg, transparent 40%, rgba(214,59,47,0.06) 100%); pointer-events: none; }
    .hero-inner { position: relative; z-index: 1; display: grid; grid-template-columns: 1fr 400px; gap: 5rem; align-items: center; }
    .hero-eyebrow { display: inline-flex; align-items: center; gap: 0.5rem; font-size: 0.68rem; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: var(--gold); margin-bottom: 1.5rem; }
    .hero-eyebrow::before { content: ''; display: block; width: 24px; height: 1px; background: var(--gold); }
    .hero-h1 { font-family: 'Bebas Neue', sans-serif; font-size: clamp(3rem, 6vw, 5rem); line-height: 0.95; letter-spacing: 0.02em; color: #fff; margin-bottom: 1.5rem; }
    .hero-h1 strong { color: var(--red); }
    .hero-sub { font-size: 1rem; color: rgba(255,255,255,0.5); line-height: 1.75; max-width: 480px; margin-bottom: 2.5rem; }
    .hero-phone { display: block; font-family: 'Bebas Neue', sans-serif; font-size: clamp(2rem, 4vw, 3rem); letter-spacing: 0.06em; color: #fff; margin-bottom: 0.75rem; transition: color 0.2s; }
    .hero-phone:hover { color: var(--gold); }
    .hero-ctas { display: flex; gap: 0.75rem; flex-wrap: wrap; }
    .btn-red { display: inline-flex; align-items: center; gap: 0.5rem; background: var(--red); color: #fff; font-weight: 700; font-size: 0.88rem; letter-spacing: 0.04em; padding: 0.85rem 1.75rem; border-radius: 7px; transition: background 0.2s, transform 0.15s; box-shadow: 0 4px 20px rgba(214,59,47,0.4); }
    .btn-red:hover { background: var(--red-d); transform: translateY(-2px); }
    .btn-ghost { display: inline-flex; align-items: center; gap: 0.5rem; background: transparent; color: rgba(255,255,255,0.7); font-weight: 600; font-size: 0.88rem; letter-spacing: 0.04em; padding: 0.85rem 1.75rem; border-radius: 7px; border: 1px solid rgba(255,255,255,0.15); transition: border-color 0.2s, color 0.2s; }
    .btn-ghost:hover { border-color: rgba(255,255,255,0.4); color: #fff; }
    .hero-trust { display: flex; flex-wrap: wrap; gap: 1.5rem; margin-top: 2.5rem; padding-top: 2rem; border-top: 1px solid rgba(255,255,255,0.07); }
    .hero-trust-item { font-size: 0.78rem; color: rgba(255,255,255,0.45); font-weight: 600; }
    .hero-trust-item b { color: rgba(255,255,255,0.85); }

    /* FORM CARD */
    .hero-form-card { background: #fff; border-radius: 14px; padding: 2rem; box-shadow: 0 24px 80px rgba(0,0,0,0.35); }
    .hfc-title { font-size: 0.65rem; font-weight: 800; letter-spacing: 0.2em; text-transform: uppercase; color: var(--sub); margin-bottom: 0.35rem; }
    .hfc-heading { font-family: 'Bebas Neue', sans-serif; font-size: 1.6rem; letter-spacing: 0.04em; color: var(--ink); margin-bottom: 1.5rem; line-height: 1.1; }
    .hfc-field { margin-bottom: 0.85rem; }
    .hfc-label { display: block; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--sub); margin-bottom: 0.35rem; }
    .hfc-input, .hfc-select { width: 100%; padding: 0.75rem 1rem; background: var(--off); border: 1.5px solid var(--border); border-radius: 7px; font-family: 'Inter', sans-serif; font-size: 0.88rem; color: var(--ink); outline: none; transition: border-color 0.2s; -webkit-appearance: none; }
    .hfc-input:focus, .hfc-select:focus { border-color: var(--ink-2); }
    .hfc-input::placeholder { color: #aab; }
    .hfc-select { cursor: pointer; }
    .hfc-submit { width: 100%; padding: 0.95rem; background: var(--red); color: #fff; font-weight: 800; font-size: 0.95rem; letter-spacing: 0.05em; border: none; border-radius: 7px; cursor: pointer; transition: background 0.2s; margin-top: 0.25rem; }
    .hfc-submit:hover { background: var(--red-d); }
    .hfc-fine { font-size: 0.68rem; color: var(--sub); text-align: center; margin-top: 0.6rem; }
    .hfc-success { display: none; text-align: center; padding: 2rem 1rem; }
    .hfc-success.show { display: block; }
    .hfc-success-h { font-family: 'Bebas Neue', sans-serif; font-size: 2rem; color: var(--green); margin-bottom: 0.35rem; }
    .hfc-success-sub { font-size: 0.82rem; color: var(--sub); }
    .hfc-success-phone { display: inline-block; margin-top: 0.75rem; font-family: 'Bebas Neue', sans-serif; font-size: 1.5rem; color: var(--red); }
    @media (max-width: 900px) { .hero-inner { grid-template-columns: 1fr; gap: 3rem; } .hero-form-card { max-width: 480px; } .hero { padding: 40px 0 60px; } }

    /* STATS */
    .stats { background: var(--off); border-bottom: 1px solid var(--border); padding: 2.5rem 0; }
    .stats-inner { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; text-align: center; }
    .stat-n { font-family: 'Bebas Neue', sans-serif; font-size: 2.8rem; color: var(--ink); letter-spacing: 0.03em; line-height: 1; }
    .stat-n span { color: var(--red); }
    .stat-l { font-size: 0.78rem; font-weight: 600; color: var(--sub); margin-top: 0.25rem; }
    @media (max-width: 560px) { .stats-inner { grid-template-columns: 1fr 1fr; gap: 1.5rem; } }

    /* SECTIONS */
    .section { padding: 90px 0; }
    .section.bg-off { background: var(--off); }
    .section.bg-dark { background: var(--ink); }
    .section-label { font-size: 0.65rem; font-weight: 800; letter-spacing: 0.22em; text-transform: uppercase; color: var(--red); margin-bottom: 0.75rem; }
    .section-label.light { color: var(--gold); }
    .section-title { font-family: 'Bebas Neue', sans-serif; font-size: clamp(2rem, 4vw, 2.8rem); letter-spacing: 0.03em; line-height: 1.05; }
    .section-title.light { color: #fff; }
    .section-sub { font-size: 0.95rem; color: var(--sub); line-height: 1.75; margin-top: 0.65rem; }

    /* CITY INTRO */
    .city-intro { padding: 60px 0; }
    .city-intro-inner { display: grid; grid-template-columns: 1fr 1fr; gap: 4rem; align-items: start; }
    .city-intro-text p { font-size: 0.95rem; color: var(--ink-3); line-height: 1.85; margin-bottom: 1.25rem; }
    .city-intro-text p:last-child { margin-bottom: 0; }
    .city-stat-box { background: var(--ink); border-radius: 12px; padding: 2rem; }
    .csb-row { display: flex; justify-content: space-between; align-items: center; padding: 1rem 0; border-bottom: 1px solid rgba(255,255,255,0.06); }
    .csb-row:last-child { border-bottom: none; }
    .csb-label { font-size: 0.75rem; color: rgba(255,255,255,0.4); font-weight: 600; }
    .csb-val { font-family: 'Bebas Neue', sans-serif; font-size: 1.1rem; letter-spacing: 0.05em; color: #fff; }
    .csb-val.red { color: var(--red); }
    @media (max-width: 760px) { .city-intro-inner { grid-template-columns: 1fr; gap: 2rem; } }

    /* SERVICES */
    .services-head { margin-bottom: 3rem; }
    .services-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: var(--border); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
    .svc { background: var(--white); padding: 2rem 1.75rem; transition: background 0.2s; }
    .svc:hover { background: var(--off); }
    .svc-num { font-family: 'Bebas Neue', sans-serif; font-size: 0.85rem; letter-spacing: 0.15em; color: var(--red); margin-bottom: 1rem; display: block; }
    .svc-name { font-size: 1rem; font-weight: 800; color: var(--ink); margin-bottom: 0.5rem; }
    .svc-desc { font-size: 0.82rem; color: var(--sub); line-height: 1.65; }
    .svc-price { font-size: 0.72rem; font-weight: 700; color: var(--ink-3); margin-top: 1rem; letter-spacing: 0.04em; }
    @media (max-width: 820px) { .services-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 480px) { .services-grid { grid-template-columns: 1fr; } }

    /* HOW IT WORKS */
    .steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3rem; position: relative; }
    .steps::before { content: ''; position: absolute; top: 24px; left: calc(16.66% + 1rem); right: calc(16.66% + 1rem); height: 1px; background: rgba(255,255,255,0.1); }
    .step-num { width: 48px; height: 48px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.12); display: flex; align-items: center; justify-content: center; font-family: 'Bebas Neue', sans-serif; font-size: 1.1rem; color: var(--gold); margin-bottom: 1.25rem; background: var(--ink-2); }
    .step-title { font-size: 0.95rem; font-weight: 700; color: #fff; margin-bottom: 0.5rem; }
    .step-desc { font-size: 0.82rem; color: rgba(255,255,255,0.4); line-height: 1.65; }
    @media (max-width: 620px) { .steps { grid-template-columns: 1fr; gap: 2rem; } .steps::before { display: none; } }

    /* REVIEW */
    .review { background: var(--white); border: 1.5px solid var(--border); border-radius: 12px; padding: 1.75rem; }
    .review-stars { color: #f5a623; font-size: 0.85rem; letter-spacing: 0.1em; margin-bottom: 1rem; }
    .review-text { font-size: 0.9rem; color: var(--ink-3); line-height: 1.75; margin-bottom: 1.25rem; }
    .review-bottom { display: flex; align-items: center; gap: 0.75rem; padding-top: 1rem; border-top: 1px solid var(--border); }
    .review-av { width: 36px; height: 36px; border-radius: 50%; background: var(--ink); display: flex; align-items: center; justify-content: center; font-family: 'Bebas Neue', sans-serif; font-size: 0.9rem; color: var(--gold); flex-shrink: 0; }
    .review-name { font-size: 0.82rem; font-weight: 700; color: var(--ink); }
    .review-loc { font-size: 0.7rem; color: var(--sub); margin-top: 0.1rem; }

    /* NEARBY */
    .nearby-section { padding: 50px 0; background: var(--off); border-top: 1px solid var(--border); }
    .nearby-grid { display: flex; flex-wrap: wrap; gap: 0.65rem; margin-top: 1.5rem; }
    .nearby-link { padding: 0.65rem 1.1rem; background: var(--white); border: 1.5px solid var(--border); border-radius: 7px; font-size: 0.82rem; font-weight: 600; color: var(--ink-3); transition: border-color 0.2s, color 0.2s; display: flex; align-items: center; gap: 0.4rem; }
    .nearby-link::before { content: '→'; font-size: 0.7rem; color: var(--red); }
    .nearby-link:hover { border-color: var(--red); color: var(--ink); }

    /* FAQ */
    .faq-list { max-width: 700px; margin: 2.5rem auto 0; }
    .faq-item { border-bottom: 1px solid var(--border); }
    .faq-btn { width: 100%; text-align: left; background: none; border: none; padding: 1.25rem 0; cursor: pointer; display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
    .faq-q { font-size: 0.9rem; font-weight: 700; color: var(--ink); line-height: 1.4; }
    .faq-icon { width: 24px; height: 24px; border-radius: 50%; border: 1.5px solid var(--border); flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; color: var(--sub); transition: transform 0.3s, background 0.2s, border-color 0.2s; }
    .faq-item.open .faq-icon { transform: rotate(45deg); background: var(--red); border-color: var(--red); color: #fff; }
    .faq-a { display: none; padding-bottom: 1.25rem; font-size: 0.85rem; color: var(--sub); line-height: 1.75; }
    .faq-item.open .faq-a { display: block; }

    /* EMERGENCY CTA */
    .emergency-cta { background: var(--ink); padding: 90px 0; text-align: center; }
    .emergency-inner { max-width: 640px; margin: 0 auto; }
    .emergency-label { display: inline-flex; align-items: center; gap: 0.5rem; font-size: 0.65rem; font-weight: 800; letter-spacing: 0.2em; text-transform: uppercase; color: var(--red); margin-bottom: 1.25rem; }
    .emergency-dot { width: 6px; height: 6px; background: var(--red); border-radius: 50%; animation: pulse 1.5s infinite; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
    .emergency-h { font-family: 'Bebas Neue', sans-serif; font-size: clamp(2.2rem, 5vw, 3.5rem); letter-spacing: 0.03em; line-height: 1; color: #fff; margin-bottom: 1rem; }
    .emergency-sub { font-size: 0.95rem; color: rgba(255,255,255,0.4); line-height: 1.7; margin-bottom: 2rem; }
    .btn-emergency { display: inline-flex; align-items: center; gap: 0.6rem; background: var(--red); color: #fff; font-weight: 800; font-size: 1.05rem; letter-spacing: 0.04em; padding: 1.1rem 2.5rem; border-radius: 8px; box-shadow: 0 6px 30px rgba(214,59,47,0.5); transition: background 0.2s, transform 0.15s; }
    .btn-emergency:hover { background: var(--red-d); transform: translateY(-2px); }

    /* FOOTER */
    .footer { background: var(--ink-2); border-top: 1px solid rgba(255,255,255,0.05); padding: 60px 0 0; }
    .footer-inner { display: grid; grid-template-columns: 1.5fr 1fr 1fr; gap: 3rem; padding-bottom: 3rem; }
    .footer-logo { font-family: 'Bebas Neue', sans-serif; font-size: 1.5rem; letter-spacing: 0.1em; color: #fff; margin-bottom: 0.65rem; }
    .footer-logo em { color: var(--gold); font-style: normal; }
    .footer-tag { font-size: 0.8rem; color: rgba(255,255,255,0.35); line-height: 1.65; margin-bottom: 1rem; max-width: 240px; }
    .footer-num a { font-family: 'Bebas Neue', sans-serif; font-size: 1.3rem; letter-spacing: 0.06em; color: var(--gold); }
    .footer-col-title { font-size: 0.62rem; font-weight: 800; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(255,255,255,0.3); margin-bottom: 1rem; }
    .footer-links { list-style: none; display: flex; flex-direction: column; gap: 0.5rem; }
    .footer-links a { font-size: 0.8rem; color: rgba(255,255,255,0.4); transition: color 0.2s; }
    .footer-links a:hover { color: #fff; }
    .footer-bottom { border-top: 1px solid rgba(255,255,255,0.05); padding: 1.25rem 0; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem; }
    .footer-copy { font-size: 0.72rem; color: rgba(255,255,255,0.2); }
    @media (max-width: 680px) { .footer-inner { grid-template-columns: 1fr 1fr; } }
    @media (max-width: 420px) { .footer-inner { grid-template-columns: 1fr; } }
  </style>
</head>
<body>

<a class="call-bar" href="tel:${PHONE_RAW}">Call Now — ${PHONE}</a>

<nav class="nav" id="mainNav">
  <div class="nav-inner">
    <a class="nav-logo" href="/">904 <em>Garage Doors</em></a>
    <ul class="nav-links" id="navLinks">
      <li><a href="#services">Services</a></li>
      <li><a href="#how">How It Works</a></li>
      <li><a href="#reviews">Reviews</a></li>
      <li><a href="#faq">FAQ</a></li>
      <li><a href="/">All Areas</a></li>
      <li><a class="nav-call" href="tel:${PHONE_RAW}">${PHONE}</a></li>
    </ul>
    <div class="hamburger" id="hamburger" onclick="toggleNav()">
      <span></span><span></span><span></span>
    </div>
  </div>
</nav>

<div class="breadcrumb">
  <div class="wrap">
    <div class="breadcrumb-inner">
      <a href="/">904 Garage Doors</a>
      <span>›</span>
      <span>Garage Door Repair ${c.name}</span>
    </div>
  </div>
</div>

<!-- HERO -->
<section class="hero">
  <div class="hero-lines"></div>
  <div class="hero-accent"></div>
  <div class="wrap">
    <div class="hero-inner">
      <div>
        <div class="hero-eyebrow reveal">${c.full} — ${c.county}</div>
        <h1 class="hero-h1 reveal d1">${heroHtml}</h1>
        <p class="hero-sub reveal d2">${c.heroCopy}</p>
        <a class="hero-phone reveal d2" href="tel:${PHONE_RAW}">${PHONE}</a>
        <div class="hero-ctas reveal d3">
          <a class="btn-red" href="tel:${PHONE_RAW}">Call Now</a>
          <a class="btn-ghost" href="#quote">Get a Free Quote</a>
        </div>
        <div class="hero-trust reveal d4">
          <span class="hero-trust-item"><b>5.0</b> stars · 47 reviews</span>
          <span class="hero-trust-item"><b>Same-day</b> service</span>
          <span class="hero-trust-item"><b>7 days</b> a week</span>
          <span class="hero-trust-item"><b>Free</b> estimates</span>
        </div>
      </div>

      <div class="hero-form-card reveal d2" id="quote">
        <div class="hfc-title">Free Estimate · ${c.name}</div>
        <div class="hfc-heading">We'll Call You<br>in 30 Minutes</div>
        <form id="heroForm" onsubmit="submitForm(event)">
          <div class="hfc-field">
            <label class="hfc-label" for="hf-name">Your name</label>
            <input class="hfc-input" id="hf-name" type="text" placeholder="John Smith" required />
          </div>
          <div class="hfc-field">
            <label class="hfc-label" for="hf-phone">Phone number</label>
            <input class="hfc-input" id="hf-phone" type="tel" placeholder="${PHONE}" required />
          </div>
          <div class="hfc-field">
            <label class="hfc-label" for="hf-service">What's the problem?</label>
            <select class="hfc-select" id="hf-service" required>
              <option value="">Select…</option>
              <option>Broken spring</option>
              <option>Opener not working</option>
              <option>Door off track</option>
              <option>Cable snapped</option>
              <option>Door won't open at all</option>
              <option>New door installation</option>
              <option>Tune-up / maintenance</option>
              <option>Not sure — needs inspection</option>
            </select>
          </div>
          <div class="hfc-field">
            <label class="hfc-label" for="hf-urgency">How soon do you need us?</label>
            <select class="hfc-select" id="hf-urgency" required>
              <option value="">Select…</option>
              <option>Right now — emergency</option>
              <option>Today</option>
              <option>This week</option>
              <option>Just getting a quote</option>
            </select>
          </div>
          <button class="hfc-submit" type="submit" id="hfBtn">Get My Free Quote — ${c.name}</button>
          <p class="hfc-fine">We call back within 30 minutes · No obligation</p>
        </form>
        <div class="hfc-success" id="hfSuccess">
          <div style="font-size:2.5rem;margin-bottom:0.5rem">✅</div>
          <div class="hfc-success-h">Got it.</div>
          <p class="hfc-success-sub">We'll call you back within 30 minutes. Can't wait?</p>
          <a class="hfc-success-phone" href="tel:${PHONE_RAW}">${PHONE}</a>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- STATS -->
<div class="stats">
  <div class="wrap">
    <div class="stats-inner">
      <div class="reveal"><div class="stat-n">7<span>+</span></div><div class="stat-l">Years in Jacksonville</div></div>
      <div class="reveal d1"><div class="stat-n">1,200<span>+</span></div><div class="stat-l">Jobs completed</div></div>
      <div class="reveal d2"><div class="stat-n">5.0<span>★</span></div><div class="stat-l">Average rating</div></div>
      <div class="reveal d3"><div class="stat-n">&lt;2<span>h</span></div><div class="stat-l">Avg response time</div></div>
    </div>
  </div>
</div>

<!-- CITY INTRO -->
<section class="city-intro">
  <div class="wrap">
    <div class="city-intro-inner">
      <div class="city-intro-text reveal">
        <div class="section-label">Serving ${c.name}</div>
        <h2 class="section-title" style="margin-bottom:1.5rem">Local crew.<br>Real service.</h2>
        ${c.cityPara.map(p => `<p>${p}</p>`).join('\n        ')}
      </div>
      <div class="reveal d2">
        <div class="city-stat-box">
          <div class="csb-row"><div class="csb-label">Service Area</div><div class="csb-val">${c.full}</div></div>
          <div class="csb-row"><div class="csb-label">Zip Code</div><div class="csb-val">${c.zip}</div></div>
          <div class="csb-row"><div class="csb-label">County</div><div class="csb-val">${c.county}</div></div>
          <div class="csb-row"><div class="csb-label">Response Time</div><div class="csb-val red">2–4 Hours</div></div>
          <div class="csb-row"><div class="csb-label">Availability</div><div class="csb-val">7 Days a Week</div></div>
          <div class="csb-row"><div class="csb-label">Pricing</div><div class="csb-val">Flat-Rate Quote</div></div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- SERVICES -->
<section class="section bg-off" id="services">
  <div class="wrap">
    <div class="services-head">
      <div class="section-label reveal">Services</div>
      <h2 class="section-title reveal d1">Everything your garage door needs.</h2>
      <p class="section-sub reveal d2">One call. Parts on the truck. Fixed the same day in ${c.name}.</p>
    </div>
    <div class="services-grid reveal d2">${sharedServices}
    </div>
  </div>
</section>

<!-- HOW IT WORKS -->
<section class="section bg-dark" id="how">
  <div class="wrap">
    <div style="margin-bottom:3.5rem;">
      <div class="section-label light reveal">Process</div>
      <h2 class="section-title light reveal d1">Simple. Fast. Done.</h2>
    </div>
    <div class="steps">
      <div class="reveal">
        <div class="step-num">01</div>
        <div class="step-title">You call or submit the form</div>
        <p class="step-desc">We answer immediately or call you back within 30 minutes. Tell us what's happening — we'll give you a ballpark before we even arrive.</p>
      </div>
      <div class="reveal d1">
        <div class="step-num">02</div>
        <div class="step-title">We give you a flat-rate quote</div>
        <p class="step-desc">No surprises. You see the full price before we start. If you don't like the number, you owe us nothing.</p>
      </div>
      <div class="reveal d2">
        <div class="step-num">03</div>
        <div class="step-title">Fixed today, guaranteed</div>
        <p class="step-desc">We carry parts on the truck. Most ${c.name} jobs are done in under 90 minutes. We clean up and get out of your way.</p>
      </div>
    </div>
  </div>
</section>

<!-- REVIEW -->
<section class="section" id="reviews">
  <div class="wrap">
    <div style="margin-bottom:2.5rem;">
      <div class="section-label reveal">Reviews</div>
      <h2 class="section-title reveal d1">What ${c.name} homeowners say.</h2>
    </div>
    <div class="review reveal d2" style="max-width:680px">
      <div class="review-stars">★★★★★</div>
      <p class="review-text">${c.review.text}</p>
      <div class="review-bottom">
        <div class="review-av">${c.review.initials}</div>
        <div>
          <div class="review-name">${c.review.name}</div>
          <div class="review-loc">${c.review.service}</div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- FAQ -->
<section class="section bg-off" id="faq">
  <div class="wrap">
    <div style="text-align:center;">
      <div class="section-label reveal">FAQ</div>
      <h2 class="section-title reveal d1">${c.name} garage door questions.</h2>
    </div>
    <div class="faq-list reveal d2">${faqItems}
    </div>
  </div>
</section>

<!-- NEARBY -->
<div class="nearby-section">
  <div class="wrap">
    <div class="section-label">Also serving nearby</div>
    <div class="nearby-grid">${nearbyLinks}
      <a class="nearby-link" href="/">All Jacksonville Areas</a>
    </div>
  </div>
</div>

<!-- EMERGENCY CTA -->
<section class="emergency-cta">
  <div class="wrap">
    <div class="emergency-inner">
      <div class="emergency-label reveal">
        <span class="emergency-dot"></span>
        Available 7 days a week · ${c.name}
      </div>
      <h2 class="emergency-h reveal d1">Door stuck in ${c.name}?<br>Call right now.</h2>
      <p class="emergency-sub reveal d2">We answer every day. A real person picks up, not voicemail. Tell us what's happening and we'll get to ${c.name} today.</p>
      <a class="btn-emergency reveal d3" href="tel:${PHONE_RAW}">${PHONE}</a>
    </div>
  </div>
</section>

<!-- FOOTER -->
<footer class="footer">
  <div class="wrap">
    <div class="footer-inner">
      <div>
        <div class="footer-logo">904 <em>Garage Doors</em></div>
        <p class="footer-tag">Jacksonville's own garage door crew — serving ${c.name} and all of the 904.</p>
        <div class="footer-num"><a href="tel:${PHONE_RAW}">${PHONE}</a></div>
      </div>
      <div>
        <div class="footer-col-title">Services</div>
        <ul class="footer-links">
          <li><a href="#services">Spring Replacement</a></li>
          <li><a href="#services">Opener Repair &amp; Install</a></li>
          <li><a href="#services">Emergency Repair</a></li>
          <li><a href="#services">Cable Repair</a></li>
          <li><a href="#services">New Door Installation</a></li>
          <li><a href="#services">Tune-Up &amp; Maintenance</a></li>
        </ul>
      </div>
      <div>
        <div class="footer-col-title">Nearby Areas</div>
        <ul class="footer-links">
          ${c.nearby.map(n => `<li><a href="/garage-door-repair-${n.slug}">${n.name}</a></li>`).join('\n          ')}
          <li><a href="/">All Areas</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <div class="footer-copy">© ${YEAR} 904 Garage Doors · ${c.full}</div>
      <div class="footer-copy">Licensed &amp; Insured · Florida State Certified</div>
    </div>
  </div>
</footer>

<script>
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach(el => obs.observe(el));

  function toggleNav() { document.getElementById('navLinks').classList.toggle('open'); }
  document.querySelectorAll('#navLinks a').forEach(a => a.addEventListener('click', () => document.getElementById('navLinks').classList.remove('open')));

  window.addEventListener('scroll', () => {
    document.getElementById('mainNav').style.background = window.scrollY > 50 ? 'rgba(13,17,23,0.99)' : 'rgba(13,17,23,0.96)';
  }, { passive: true });

  function toggleFaq(btn) {
    const item = btn.closest('.faq-item');
    const open = item.classList.contains('open');
    document.querySelectorAll('.faq-item.open').forEach(el => el.classList.remove('open'));
    if (!open) item.classList.add('open');
  }

  async function submitForm(e) {
    e.preventDefault();
    const btn = document.getElementById('hfBtn');
    btn.disabled = true; btn.textContent = 'Sending…';
    try {
      await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:    document.getElementById('hf-name').value,
          phone:   document.getElementById('hf-phone').value,
          service: document.getElementById('hf-service').value,
          urgency: document.getElementById('hf-urgency').value,
          city:    '${c.name}',
          source:  'city-page',
        }),
      });
    } catch (_) {}
    document.getElementById('heroForm').style.display = 'none';
    document.getElementById('hfSuccess').classList.add('show');
  }
</script>
</body>
</html>`;
}

/* ─── RUN ─── */
let count = 0;
cities.forEach(city => {
  const filename = `garage-door-repair-${city.slug}.html`;
  fs.writeFileSync(path.join(__dirname, filename), generatePage(city), 'utf8');
  console.log(`  ✓  ${filename}`);
  count++;
});

/* ─── SITEMAP ─── */
const today = new Date().toISOString().split('T')[0];
const sitemapUrls = [
  `  <url><loc>${DOMAIN}/</loc><changefreq>weekly</changefreq><priority>1.0</priority><lastmod>${today}</lastmod></url>`,
  ...cities.map(c =>
    `  <url><loc>${DOMAIN}/garage-door-repair-${c.slug}</loc><changefreq>monthly</changefreq><priority>0.8</priority><lastmod>${today}</lastmod></url>`
  )
].join('\n');

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls}
</urlset>`;

fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), sitemap, 'utf8');
console.log(`  ✓  sitemap.xml`);
console.log(`\nDone — ${count} city pages + sitemap generated.`);
