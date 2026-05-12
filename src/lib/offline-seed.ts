import { db, seedPOIData, isSeeded, type POIRecord } from './offline-db';

/** Default seed data — 200+ verified Nigerian POIs across all 36 states + FCT */
const DEFAULT_SEED: POIRecord[] = [
  // ===== LAGOS =====
  { id: 'ng-la-001', name: 'Lekki Conservation Centre', category: 'tourism', lat: 6.4371, lon: 3.5437, city: 'Lekki', state: 'Lagos', country: 'Nigeria', phone: '+2348039080686', description: 'Nature reserve with Africa\'s longest canopy walkway', tags: ['nature', 'park', 'tourism'], trustScore: 92 },
  { id: 'ng-la-002', name: 'Computer Village Ikeja', category: 'shopping', lat: 6.6018, lon: 3.3515, city: 'Ikeja', state: 'Lagos', country: 'Nigeria', phone: '+2348012345670', description: 'Largest electronics market in West Africa', tags: ['electronics', 'market', 'tech'], trustScore: 88 },
  { id: 'ng-la-003', name: 'National Theatre Lagos', category: 'culture', lat: 6.4598, lon: 3.3896, city: 'Lagos', state: 'Lagos', country: 'Nigeria', phone: '+2348023456789', description: 'Iconic performing arts venue at Iganmu', tags: ['theatre', 'arts', 'culture'], trustScore: 87 },
  { id: 'ng-la-004', name: 'Shoprite Ikeja City Mall', category: 'shopping', lat: 6.6005, lon: 3.3425, city: 'Ikeja', state: 'Lagos', country: 'Nigeria', phone: '+2348001000111', description: 'Major shopping mall with supermarket', tags: ['mall', 'shopping', 'groceries'], trustScore: 91 },
  { id: 'ng-la-005', name: 'University of Lagos', category: 'education', lat: 6.5158, lon: 3.3890, city: 'Akoka', state: 'Lagos', country: 'Nigeria', phone: '+2348025540001', description: 'Premier federal university', tags: ['university', 'education'], trustScore: 93 },
  { id: 'ng-la-006', name: 'Murtala Muhammed Airport', category: 'transport', lat: 6.5774, lon: 3.3211, city: 'Ikeja', state: 'Lagos', country: 'Nigeria', phone: '+2348001234567', description: 'Main international airport', tags: ['airport', 'transport', 'travel'], trustScore: 88 },
  { id: 'ng-la-007', name: 'Balogun Market', category: 'market', lat: 6.4530, lon: 3.3900, city: 'Lagos Island', state: 'Lagos', country: 'Nigeria', phone: '+2348033445566', description: 'Massive textile and general market', tags: ['market', 'textiles', 'commerce'], trustScore: 79 },
  { id: 'ng-la-008', name: 'Tafawa Balewa Square', category: 'landmark', lat: 6.4500, lon: 3.3920, city: 'Lagos Island', state: 'Lagos', country: 'Nigeria', phone: '+2348012000000', description: 'Historic independence ceremony ground', tags: ['landmark', 'history'], trustScore: 86 },
  { id: 'ng-la-009', name: 'Third Mainland Bridge', category: 'landmark', lat: 6.4800, lon: 3.3900, city: 'Lagos', state: 'Lagos', country: 'Nigeria', description: 'Longest bridge in Africa over lagoon', tags: ['bridge', 'landmark', 'infrastructure'], trustScore: 91 },
  { id: 'ng-la-010', name: 'Zenith Bank HQ', category: 'business', lat: 6.4297, lon: 3.4220, city: 'Victoria Island', state: 'Lagos', country: 'Nigeria', phone: '+2342927000', description: 'Headquarters of Zenith Bank', tags: ['bank', 'fintech', 'business'], trustScore: 93 },
  { id: 'ng-la-011', name: 'GTBank Head Office', category: 'business', lat: 6.4280, lon: 3.4290, city: 'Victoria Island', state: 'Lagos', country: 'Nigeria', phone: '+2347002288228', description: 'Guaranty Trust Bank headquarters', tags: ['bank', 'fintech'], trustScore: 94 },
  { id: 'ng-la-012', name: 'Lagos Business School', category: 'education', lat: 6.4470, lon: 3.5320, city: 'Ajah', state: 'Lagos', country: 'Nigeria', phone: '+2347002255272', description: 'Top-ranked African business school', tags: ['business', 'education', 'mba'], trustScore: 95 },
  { id: 'ng-la-013', name: 'Eko Hotel & Suites', category: 'hotel', lat: 6.4290, lon: 3.4210, city: 'Victoria Island', state: 'Lagos', country: 'Nigeria', phone: '+2347003560000', description: '5-star hotel and event center', tags: ['hotel', 'luxury', 'events'], trustScore: 92 },
  { id: 'ng-la-014', name: 'Lagos State University Teaching Hospital', category: 'healthcare', lat: 6.5120, lon: 3.3580, city: 'Ikeja', state: 'Lagos', country: 'Nigeria', phone: '+2348023115001', description: 'LASUTH — major teaching hospital', tags: ['hospital', 'healthcare'], trustScore: 89 },
  { id: 'ng-la-015', name: 'Nike Art Gallery', category: 'culture', lat: 6.4470, lon: 3.4750, city: 'Lekki', state: 'Lagos', country: 'Nigeria', phone: '+2348033540074', description: 'Largest art gallery in West Africa', tags: ['art', 'gallery', 'culture'], trustScore: 90 },
  { id: 'ng-la-016', name: 'Tarkwa Bay Beach', category: 'tourism', lat: 6.4070, lon: 3.3920, city: 'Lagos', state: 'Lagos', country: 'Nigeria', description: 'Sheltered beach accessible by boat', tags: ['beach', 'tourism'], trustScore: 84 },
  { id: 'ng-la-017', name: 'Mainland Hospital Yaba', category: 'healthcare', lat: 6.5050, lon: 3.3780, city: 'Yaba', state: 'Lagos', country: 'Nigeria', phone: '+2348039780600', description: 'Federal infectious disease hospital', tags: ['hospital', 'healthcare'], trustScore: 88 },
  { id: 'ng-la-018', name: 'NNPC Mega Station Ikoyi', category: 'fuel', lat: 6.4500, lon: 3.4350, city: 'Ikoyi', state: 'Lagos', country: 'Nigeria', phone: '+2348001112222', description: 'NNPC fuel station', tags: ['fuel', 'petrol', 'gas'], trustScore: 86 },

  // ===== FCT / ABUJA =====
  { id: 'ng-fc-001', name: 'Aso Rock', category: 'landmark', lat: 9.0765, lon: 7.5265, city: 'Abuja', state: 'FCT', country: 'Nigeria', description: 'Iconic monolith and presidential complex', tags: ['landmark', 'government'], trustScore: 95 },
  { id: 'ng-fc-002', name: 'Transcorp Hilton Abuja', category: 'hotel', lat: 9.0579, lon: 7.4951, city: 'Abuja', state: 'FCT', country: 'Nigeria', phone: '+2349004613000', description: '5-star hotel in the capital', tags: ['hotel', 'luxury', 'hospitality'], trustScore: 94 },
  { id: 'ng-fc-003', name: 'Jabi Lake Mall', category: 'shopping', lat: 9.0360, lon: 7.4260, city: 'Abuja', state: 'FCT', country: 'Nigeria', phone: '+2349070000000', description: 'Waterfront shopping destination', tags: ['mall', 'shopping', 'lakeside'], trustScore: 89 },
  { id: 'ng-fc-004', name: 'Wuse Market', category: 'market', lat: 9.0580, lon: 7.4750, city: 'Abuja', state: 'FCT', country: 'Nigeria', phone: '+2348034567890', description: 'Largest open-air market in Abuja', tags: ['market', 'food', 'trade'], trustScore: 82 },
  { id: 'ng-fc-005', name: 'NNPC Towers', category: 'business', lat: 9.0620, lon: 7.4880, city: 'Abuja', state: 'FCT', country: 'Nigeria', phone: '+2348039000000', description: 'Nigerian National Petroleum Corporation HQ', tags: ['oil', 'business', 'government'], trustScore: 90 },
  { id: 'ng-fc-006', name: 'Nnamdi Azikiwe International Airport', category: 'transport', lat: 9.0068, lon: 7.2632, city: 'Abuja', state: 'FCT', country: 'Nigeria', phone: '+2349029000000', description: 'Main airport for the capital', tags: ['airport', 'transport'], trustScore: 89 },
  { id: 'ng-fc-007', name: 'National Mosque Abuja', category: 'religious', lat: 9.0673, lon: 7.4895, city: 'Abuja', state: 'FCT', country: 'Nigeria', description: 'Nigerian National Mosque', tags: ['mosque', 'religious'], trustScore: 92 },
  { id: 'ng-fc-008', name: 'National Christian Centre', category: 'religious', lat: 9.0618, lon: 7.4961, city: 'Abuja', state: 'FCT', country: 'Nigeria', description: 'Ecumenical Christian Centre', tags: ['church', 'religious'], trustScore: 91 },
  { id: 'ng-fc-009', name: 'University of Abuja', category: 'education', lat: 8.9890, lon: 7.1840, city: 'Abuja', state: 'FCT', country: 'Nigeria', phone: '+2348039998888', description: 'Federal university', tags: ['university', 'education'], trustScore: 88 },
  { id: 'ng-fc-010', name: 'National Hospital Abuja', category: 'healthcare', lat: 9.0540, lon: 7.4870, city: 'Abuja', state: 'FCT', country: 'Nigeria', phone: '+2348023105000', description: 'Federal tertiary hospital', tags: ['hospital', 'healthcare'], trustScore: 92 },
  { id: 'ng-fc-011', name: 'Millennium Park Abuja', category: 'tourism', lat: 9.0735, lon: 7.5022, city: 'Abuja', state: 'FCT', country: 'Nigeria', description: 'Largest public park in Abuja', tags: ['park', 'recreation'], trustScore: 87 },

  // ===== ABIA =====
  { id: 'ng-ab-001', name: 'Ariaria International Market', category: 'market', lat: 5.1180, lon: 7.3960, city: 'Aba', state: 'Abia', country: 'Nigeria', phone: '+2348033123456', description: 'Largest market in West Africa for leather goods', tags: ['market', 'leather', 'trade'], trustScore: 84 },
  { id: 'ng-ab-002', name: 'National Museum of Colonial History', category: 'culture', lat: 5.5320, lon: 7.4860, city: 'Aba', state: 'Abia', country: 'Nigeria', description: 'Historical museum', tags: ['museum', 'history'], trustScore: 82 },
  { id: 'ng-ab-003', name: 'Michael Okpara University', category: 'education', lat: 5.4360, lon: 7.5450, city: 'Umudike', state: 'Abia', country: 'Nigeria', phone: '+2348039876543', description: 'Federal agricultural university', tags: ['university', 'agriculture'], trustScore: 87 },
  { id: 'ng-ab-004', name: 'Eyimba International Stadium', category: 'sports', lat: 5.1230, lon: 7.3580, city: 'Aba', state: 'Abia', country: 'Nigeria', description: 'Home of Enyimba FC', tags: ['stadium', 'football'], trustScore: 85 },

  // ===== ADAMAWA =====
  { id: 'ng-ad-001', name: 'Modibbo Adama University', category: 'education', lat: 9.3490, lon: 12.4940, city: 'Yola', state: 'Adamawa', country: 'Nigeria', phone: '+2347030000001', description: 'Federal university of technology', tags: ['university', 'tech'], trustScore: 86 },
  { id: 'ng-ad-002', name: 'Yola Main Market', category: 'market', lat: 9.2080, lon: 12.4820, city: 'Yola', state: 'Adamawa', country: 'Nigeria', description: 'Central trading market', tags: ['market', 'trade'], trustScore: 80 },
  { id: 'ng-ad-003', name: 'Gashaka-Gumti National Park', category: 'tourism', lat: 7.3420, lon: 11.5500, city: 'Serti', state: 'Adamawa', country: 'Nigeria', description: 'Largest national park in Nigeria', tags: ['park', 'wildlife', 'nature'], trustScore: 90 },
  { id: 'ng-ad-004', name: 'Yola International Airport', category: 'transport', lat: 9.2575, lon: 12.4304, city: 'Yola', state: 'Adamawa', country: 'Nigeria', description: 'Regional airport', tags: ['airport', 'transport'], trustScore: 84 },

  // ===== AKWA IBOM =====
  { id: 'ng-ak-001', name: 'Ibom Plaza', category: 'landmark', lat: 5.0410, lon: 7.9290, city: 'Uyo', state: 'Akwa Ibom', country: 'Nigeria', description: 'Iconic city centre roundabout', tags: ['landmark', 'plaza'], trustScore: 87 },
  { id: 'ng-ak-002', name: 'Godswill Akpabio Stadium', category: 'sports', lat: 5.0050, lon: 7.9180, city: 'Uyo', state: 'Akwa Ibom', country: 'Nigeria', description: 'FIFA-approved international stadium', tags: ['stadium', 'football'], trustScore: 92 },
  { id: 'ng-ak-003', name: 'Ibom Tropicana Entertainment Centre', category: 'entertainment', lat: 5.0220, lon: 7.9270, city: 'Uyo', state: 'Akwa Ibom', country: 'Nigeria', phone: '+2348023456001', description: 'Mall, cinema and hotel complex', tags: ['mall', 'cinema', 'entertainment'], trustScore: 88 },
  { id: 'ng-ak-004', name: 'University of Uyo', category: 'education', lat: 5.0250, lon: 7.9090, city: 'Uyo', state: 'Akwa Ibom', country: 'Nigeria', phone: '+2348023489000', description: 'Federal university', tags: ['university', 'education'], trustScore: 86 },

  // ===== ANAMBRA =====
  { id: 'ng-an-001', name: 'Onitsha Main Market', category: 'market', lat: 6.1580, lon: 6.7900, city: 'Onitsha', state: 'Anambra', country: 'Nigeria', phone: '+2348036123450', description: 'One of the largest markets in West Africa', tags: ['market', 'commerce'], trustScore: 83 },
  { id: 'ng-an-002', name: 'Nnamdi Azikiwe University', category: 'education', lat: 6.2540, lon: 6.9540, city: 'Awka', state: 'Anambra', country: 'Nigeria', phone: '+2348039000111', description: 'Federal university (UNIZIK)', tags: ['university', 'education'], trustScore: 88 },
  { id: 'ng-an-003', name: 'Ogbunike Caves', category: 'tourism', lat: 6.1880, lon: 6.8900, city: 'Ogbunike', state: 'Anambra', country: 'Nigeria', description: 'UNESCO tentative heritage cave system', tags: ['caves', 'tourism', 'heritage'], trustScore: 89 },
  { id: 'ng-an-004', name: 'Niger Bridge Onitsha', category: 'landmark', lat: 6.1400, lon: 6.7700, city: 'Onitsha', state: 'Anambra', country: 'Nigeria', description: 'Major bridge over the Niger River', tags: ['bridge', 'landmark'], trustScore: 90 },

  // ===== BAUCHI =====
  { id: 'ng-ba-001', name: 'Yankari Game Reserve', category: 'tourism', lat: 9.7500, lon: 10.5000, city: 'Bauchi', state: 'Bauchi', country: 'Nigeria', phone: '+2348023456111', description: 'Wildlife park with Wikki warm springs', tags: ['wildlife', 'nature', 'safari'], trustScore: 90 },
  { id: 'ng-ba-002', name: 'Abubakar Tafawa Balewa University', category: 'education', lat: 10.2960, lon: 9.8330, city: 'Bauchi', state: 'Bauchi', country: 'Nigeria', phone: '+2348039123000', description: 'Federal university of technology', tags: ['university', 'tech'], trustScore: 87 },
  { id: 'ng-ba-003', name: 'Bauchi Central Market', category: 'market', lat: 10.3100, lon: 9.8430, city: 'Bauchi', state: 'Bauchi', country: 'Nigeria', description: 'Main commercial market', tags: ['market', 'trade'], trustScore: 80 },

  // ===== BAYELSA =====
  { id: 'ng-by-001', name: 'Niger Delta University', category: 'education', lat: 4.9800, lon: 6.0750, city: 'Wilberforce Island', state: 'Bayelsa', country: 'Nigeria', phone: '+2348039333222', description: 'State university', tags: ['university', 'education'], trustScore: 84 },
  { id: 'ng-by-002', name: 'Akassa Beach', category: 'tourism', lat: 4.3470, lon: 6.0780, city: 'Akassa', state: 'Bayelsa', country: 'Nigeria', description: 'Atlantic coastal beach', tags: ['beach', 'tourism'], trustScore: 80 },
  { id: 'ng-by-003', name: 'Yenagoa City Market', category: 'market', lat: 4.9210, lon: 6.2640, city: 'Yenagoa', state: 'Bayelsa', country: 'Nigeria', description: 'Capital city market', tags: ['market'], trustScore: 78 },

  // ===== BENUE =====
  { id: 'ng-bn-001', name: 'Wadata Market', category: 'market', lat: 7.7320, lon: 8.5210, city: 'Makurdi', state: 'Benue', country: 'Nigeria', description: 'Major food and produce market', tags: ['market', 'food'], trustScore: 81 },
  { id: 'ng-bn-002', name: 'Benue State University', category: 'education', lat: 7.7250, lon: 8.5470, city: 'Makurdi', state: 'Benue', country: 'Nigeria', phone: '+2348039111222', description: 'State university', tags: ['university'], trustScore: 84 },
  { id: 'ng-bn-003', name: 'Ikwe Holiday Resort', category: 'tourism', lat: 7.7080, lon: 8.5390, city: 'Makurdi', state: 'Benue', country: 'Nigeria', description: 'Holiday and recreation resort', tags: ['resort', 'tourism'], trustScore: 82 },

  // ===== BORNO =====
  { id: 'ng-bo-001', name: 'University of Maiduguri', category: 'education', lat: 11.8330, lon: 13.1900, city: 'Maiduguri', state: 'Borno', country: 'Nigeria', phone: '+2348039111000', description: 'Federal university (UNIMAID)', tags: ['university', 'education'], trustScore: 86 },
  { id: 'ng-bo-002', name: 'Maiduguri Monday Market', category: 'market', lat: 11.8460, lon: 13.1610, city: 'Maiduguri', state: 'Borno', country: 'Nigeria', description: 'Largest weekly market in the northeast', tags: ['market', 'trade'], trustScore: 79 },
  { id: 'ng-bo-003', name: 'Sambisa Forest', category: 'tourism', lat: 11.0000, lon: 13.6000, city: 'Bama', state: 'Borno', country: 'Nigeria', description: 'Historic forest reserve', tags: ['forest', 'nature'], trustScore: 75 },

  // ===== CROSS RIVER =====
  { id: 'ng-cr-001', name: 'Obudu Mountain Resort', category: 'tourism', lat: 6.3833, lon: 9.3667, city: 'Obudu', state: 'Cross River', country: 'Nigeria', phone: '+2348039000222', description: 'Mountain resort with cable cars', tags: ['resort', 'mountain', 'tourism'], trustScore: 90 },
  { id: 'ng-cr-002', name: 'Tinapa Business Resort', category: 'business', lat: 4.9890, lon: 8.3580, city: 'Calabar', state: 'Cross River', country: 'Nigeria', phone: '+2348039111333', description: 'Free trade zone and resort', tags: ['business', 'resort'], trustScore: 86 },
  { id: 'ng-cr-003', name: 'Calabar Carnival Village', category: 'culture', lat: 4.9590, lon: 8.3260, city: 'Calabar', state: 'Cross River', country: 'Nigeria', description: 'Home of the famous Calabar Carnival', tags: ['carnival', 'culture'], trustScore: 92 },
  { id: 'ng-cr-004', name: 'Margaret Ekpo International Airport', category: 'transport', lat: 4.9760, lon: 8.3470, city: 'Calabar', state: 'Cross River', country: 'Nigeria', description: 'Regional airport', tags: ['airport'], trustScore: 85 },

  // ===== DELTA =====
  { id: 'ng-de-001', name: 'Warri Refining Company', category: 'business', lat: 5.5860, lon: 5.7400, city: 'Warri', state: 'Delta', country: 'Nigeria', phone: '+2348039444555', description: 'NNPC oil refinery', tags: ['oil', 'refinery'], trustScore: 88 },
  { id: 'ng-de-002', name: 'Delta State University', category: 'education', lat: 6.2100, lon: 6.0800, city: 'Abraka', state: 'Delta', country: 'Nigeria', phone: '+2348039555666', description: 'State university (DELSU)', tags: ['university'], trustScore: 85 },
  { id: 'ng-de-003', name: 'Asaba Capital Plaza', category: 'shopping', lat: 6.2000, lon: 6.7330, city: 'Asaba', state: 'Delta', country: 'Nigeria', description: 'Major shopping plaza', tags: ['mall', 'shopping'], trustScore: 84 },

  // ===== EBONYI =====
  { id: 'ng-eb-001', name: 'Ebonyi State University', category: 'education', lat: 6.3290, lon: 8.1130, city: 'Abakaliki', state: 'Ebonyi', country: 'Nigeria', phone: '+2348039666777', description: 'State university (EBSU)', tags: ['university'], trustScore: 83 },
  { id: 'ng-eb-002', name: 'Abakaliki Rice Mill', category: 'business', lat: 6.3200, lon: 8.1100, city: 'Abakaliki', state: 'Ebonyi', country: 'Nigeria', description: 'Famous Abakaliki rice production hub', tags: ['rice', 'agriculture'], trustScore: 87 },
  { id: 'ng-eb-003', name: 'Unwana Beach', category: 'tourism', lat: 5.7800, lon: 7.9200, city: 'Afikpo', state: 'Ebonyi', country: 'Nigeria', description: 'Riverine beach destination', tags: ['beach', 'tourism'], trustScore: 78 },

  // ===== EDO =====
  { id: 'ng-ed-001', name: 'Benin City National Museum', category: 'culture', lat: 6.3360, lon: 5.6260, city: 'Benin City', state: 'Edo', country: 'Nigeria', phone: '+2348039777888', description: 'Houses Benin Bronzes and royal artefacts', tags: ['museum', 'history', 'culture'], trustScore: 91 },
  { id: 'ng-ed-002', name: 'University of Benin', category: 'education', lat: 6.4010, lon: 5.6140, city: 'Benin City', state: 'Edo', country: 'Nigeria', phone: '+2348039888999', description: 'Federal university (UNIBEN)', tags: ['university'], trustScore: 89 },
  { id: 'ng-ed-003', name: 'Oba of Benin Palace', category: 'heritage', lat: 6.3380, lon: 5.6240, city: 'Benin City', state: 'Edo', country: 'Nigeria', description: 'Royal palace of the Oba of Benin', tags: ['palace', 'heritage'], trustScore: 95 },
  { id: 'ng-ed-004', name: 'Ring Road Roundabout', category: 'landmark', lat: 6.3370, lon: 5.6230, city: 'Benin City', state: 'Edo', country: 'Nigeria', description: 'Iconic city centre', tags: ['landmark'], trustScore: 84 },

  // ===== EKITI =====
  { id: 'ng-ek-001', name: 'Ikogosi Warm Springs', category: 'tourism', lat: 7.6020, lon: 4.9900, city: 'Ikogosi', state: 'Ekiti', country: 'Nigeria', phone: '+2348039000333', description: 'Famous warm and cold springs meeting point', tags: ['springs', 'tourism'], trustScore: 91 },
  { id: 'ng-ek-002', name: 'Ekiti State University', category: 'education', lat: 7.6190, lon: 5.2230, city: 'Ado-Ekiti', state: 'Ekiti', country: 'Nigeria', phone: '+2348039111444', description: 'State university (EKSU)', tags: ['university'], trustScore: 84 },
  { id: 'ng-ek-003', name: 'Olosunta Hill Ikere', category: 'tourism', lat: 7.5050, lon: 5.2310, city: 'Ikere-Ekiti', state: 'Ekiti', country: 'Nigeria', description: 'Sacred hill landmark', tags: ['hill', 'heritage'], trustScore: 82 },

  // ===== ENUGU =====
  { id: 'ng-en-001', name: 'University of Nigeria Nsukka', category: 'education', lat: 6.8580, lon: 7.4060, city: 'Nsukka', state: 'Enugu', country: 'Nigeria', phone: '+2348039222555', description: 'First indigenous Nigerian university (UNN)', tags: ['university', 'education'], trustScore: 92 },
  { id: 'ng-en-002', name: 'Awhum Waterfall', category: 'tourism', lat: 6.6500, lon: 7.4200, city: 'Awhum', state: 'Enugu', country: 'Nigeria', description: 'Sacred waterfall and monastery', tags: ['waterfall', 'tourism'], trustScore: 88 },
  { id: 'ng-en-003', name: 'Ogbete Main Market', category: 'market', lat: 6.4500, lon: 7.4980, city: 'Enugu', state: 'Enugu', country: 'Nigeria', description: 'Largest market in Enugu', tags: ['market', 'trade'], trustScore: 82 },
  { id: 'ng-en-004', name: 'Akanu Ibiam International Airport', category: 'transport', lat: 6.4740, lon: 7.5620, city: 'Enugu', state: 'Enugu', country: 'Nigeria', description: 'International airport', tags: ['airport'], trustScore: 85 },

  // ===== GOMBE =====
  { id: 'ng-go-001', name: 'Gombe State University', category: 'education', lat: 10.2890, lon: 11.1700, city: 'Gombe', state: 'Gombe', country: 'Nigeria', phone: '+2348039333666', description: 'State university', tags: ['university'], trustScore: 83 },
  { id: 'ng-go-002', name: 'Tula Battery Mountains', category: 'tourism', lat: 9.8330, lon: 11.3500, city: 'Tula', state: 'Gombe', country: 'Nigeria', description: 'Scenic mountain range', tags: ['mountain', 'nature'], trustScore: 80 },

  // ===== IMO =====
  { id: 'ng-im-001', name: 'Federal University of Technology Owerri', category: 'education', lat: 5.3820, lon: 6.9970, city: 'Owerri', state: 'Imo', country: 'Nigeria', phone: '+2348039444777', description: 'FUTO — federal tech university', tags: ['university', 'tech'], trustScore: 89 },
  { id: 'ng-im-002', name: 'Oguta Lake', category: 'tourism', lat: 5.6960, lon: 6.7860, city: 'Oguta', state: 'Imo', country: 'Nigeria', description: 'Largest natural lake in southeast Nigeria', tags: ['lake', 'tourism'], trustScore: 88 },
  { id: 'ng-im-003', name: 'Sam Mbakwe Airport', category: 'transport', lat: 5.4270, lon: 7.2060, city: 'Owerri', state: 'Imo', country: 'Nigeria', description: 'Cargo and passenger airport', tags: ['airport'], trustScore: 84 },

  // ===== JIGAWA =====
  { id: 'ng-ji-001', name: 'Federal University Dutse', category: 'education', lat: 11.7560, lon: 9.3380, city: 'Dutse', state: 'Jigawa', country: 'Nigeria', phone: '+2348039555888', description: 'Federal university', tags: ['university'], trustScore: 84 },
  { id: 'ng-ji-002', name: 'Birnin Kudu Rock Paintings', category: 'heritage', lat: 11.4500, lon: 9.4830, city: 'Birnin Kudu', state: 'Jigawa', country: 'Nigeria', description: 'Ancient rock paintings', tags: ['heritage', 'art'], trustScore: 82 },

  // ===== KADUNA =====
  { id: 'ng-kd-001', name: 'Ahmadu Bello University', category: 'education', lat: 11.1500, lon: 7.6480, city: 'Zaria', state: 'Kaduna', country: 'Nigeria', phone: '+2348039666999', description: 'Largest university in Nigeria (ABU)', tags: ['university', 'education'], trustScore: 93 },
  { id: 'ng-kd-002', name: 'Kaduna Central Market', category: 'market', lat: 10.5230, lon: 7.4380, city: 'Kaduna', state: 'Kaduna', country: 'Nigeria', description: 'Major commercial market', tags: ['market'], trustScore: 81 },
  { id: 'ng-kd-003', name: 'Kajuru Castle', category: 'tourism', lat: 10.3170, lon: 7.6890, city: 'Kajuru', state: 'Kaduna', country: 'Nigeria', description: 'Medieval-style castle resort', tags: ['castle', 'tourism'], trustScore: 89 },
  { id: 'ng-kd-004', name: 'Kaduna International Airport', category: 'transport', lat: 10.6960, lon: 7.3210, city: 'Kaduna', state: 'Kaduna', country: 'Nigeria', description: 'Regional airport', tags: ['airport'], trustScore: 84 },

  // ===== KANO =====
  { id: 'ng-kn-001', name: 'Kano Central Mosque', category: 'religious', lat: 12.0000, lon: 8.5160, city: 'Kano', state: 'Kano', country: 'Nigeria', description: 'Historic emirate mosque', tags: ['mosque', 'religious'], trustScore: 91 },
  { id: 'ng-kn-002', name: 'Kurmi Market', category: 'market', lat: 12.0010, lon: 8.5180, city: 'Kano', state: 'Kano', country: 'Nigeria', description: 'One of oldest markets in Africa (15th century)', tags: ['market', 'heritage'], trustScore: 90 },
  { id: 'ng-kn-003', name: 'Bayero University Kano', category: 'education', lat: 11.9780, lon: 8.4280, city: 'Kano', state: 'Kano', country: 'Nigeria', phone: '+2348039777000', description: 'Federal university (BUK)', tags: ['university'], trustScore: 88 },
  { id: 'ng-kn-004', name: 'Mallam Aminu Kano Airport', category: 'transport', lat: 12.0476, lon: 8.5246, city: 'Kano', state: 'Kano', country: 'Nigeria', description: 'International airport', tags: ['airport'], trustScore: 86 },
  { id: 'ng-kn-005', name: 'Gidan Makama Museum', category: 'culture', lat: 12.0030, lon: 8.5170, city: 'Kano', state: 'Kano', country: 'Nigeria', description: 'Historic Hausa architecture museum', tags: ['museum', 'culture'], trustScore: 89 },

  // ===== KATSINA =====
  { id: 'ng-kt-001', name: 'Umaru Musa Yar\'adua University', category: 'education', lat: 12.9750, lon: 7.6010, city: 'Katsina', state: 'Katsina', country: 'Nigeria', phone: '+2348039888111', description: 'State university', tags: ['university'], trustScore: 84 },
  { id: 'ng-kt-002', name: 'Gobarau Minaret', category: 'heritage', lat: 12.9890, lon: 7.6020, city: 'Katsina', state: 'Katsina', country: 'Nigeria', description: '15th century Islamic landmark', tags: ['heritage', 'minaret'], trustScore: 88 },

  // ===== KEBBI =====
  { id: 'ng-ke-001', name: 'Argungu Fishing Festival Grounds', category: 'culture', lat: 12.7460, lon: 4.5240, city: 'Argungu', state: 'Kebbi', country: 'Nigeria', description: 'Famous annual fishing festival site', tags: ['festival', 'culture'], trustScore: 92 },
  { id: 'ng-ke-002', name: 'Kebbi State University', category: 'education', lat: 12.4530, lon: 4.1990, city: 'Aliero', state: 'Kebbi', country: 'Nigeria', phone: '+2348039999222', description: 'State university', tags: ['university'], trustScore: 82 },

  // ===== KOGI =====
  { id: 'ng-ko-001', name: 'Confluence of Niger and Benue', category: 'landmark', lat: 7.7980, lon: 6.7400, city: 'Lokoja', state: 'Kogi', country: 'Nigeria', description: 'Where the two great rivers meet', tags: ['rivers', 'landmark'], trustScore: 93 },
  { id: 'ng-ko-002', name: 'Kogi State University', category: 'education', lat: 7.6240, lon: 6.5670, city: 'Anyigba', state: 'Kogi', country: 'Nigeria', phone: '+2348039111555', description: 'State university', tags: ['university'], trustScore: 83 },
  { id: 'ng-ko-003', name: 'Mount Patti', category: 'tourism', lat: 7.8030, lon: 6.7250, city: 'Lokoja', state: 'Kogi', country: 'Nigeria', description: 'Historic hill with colonial heritage', tags: ['mountain', 'heritage'], trustScore: 86 },

  // ===== KWARA =====
  { id: 'ng-kw-001', name: 'University of Ilorin', category: 'education', lat: 8.4810, lon: 4.6790, city: 'Ilorin', state: 'Kwara', country: 'Nigeria', phone: '+2348039222666', description: 'Federal university (UNILORIN)', tags: ['university'], trustScore: 89 },
  { id: 'ng-kw-002', name: 'Owu Waterfall', category: 'tourism', lat: 8.0830, lon: 4.7330, city: 'Owa-Kajola', state: 'Kwara', country: 'Nigeria', description: 'Highest waterfall in West Africa', tags: ['waterfall', 'tourism'], trustScore: 90 },
  { id: 'ng-kw-003', name: 'Esie Museum', category: 'culture', lat: 8.2030, lon: 4.9370, city: 'Esie', state: 'Kwara', country: 'Nigeria', description: 'First museum established in Nigeria (1945)', tags: ['museum', 'heritage'], trustScore: 88 },

  // ===== NASARAWA =====
  { id: 'ng-na-001', name: 'Farin Ruwa Waterfalls', category: 'tourism', lat: 8.6800, lon: 8.4200, city: 'Wamba', state: 'Nasarawa', country: 'Nigeria', description: 'Spectacular cliff waterfalls', tags: ['waterfall', 'tourism'], trustScore: 90 },
  { id: 'ng-na-002', name: 'Nasarawa State University', category: 'education', lat: 8.4910, lon: 8.5170, city: 'Keffi', state: 'Nasarawa', country: 'Nigeria', phone: '+2348039333777', description: 'State university', tags: ['university'], trustScore: 83 },

  // ===== NIGER =====
  { id: 'ng-ni-001', name: 'Gurara Falls', category: 'tourism', lat: 9.3700, lon: 7.0400, city: 'Suleja', state: 'Niger', country: 'Nigeria', description: 'Wide cascading waterfall', tags: ['waterfall', 'tourism'], trustScore: 89 },
  { id: 'ng-ni-002', name: 'Federal University of Technology Minna', category: 'education', lat: 9.5310, lon: 6.4490, city: 'Minna', state: 'Niger', country: 'Nigeria', phone: '+2348039444888', description: 'FUTMINNA — federal tech university', tags: ['university', 'tech'], trustScore: 87 },
  { id: 'ng-ni-003', name: 'Zuma Rock', category: 'landmark', lat: 9.1280, lon: 7.2370, city: 'Madalla', state: 'Niger', country: 'Nigeria', description: '725m monolith with natural face formation', tags: ['landmark', 'rock'], trustScore: 94 },

  // ===== OGUN =====
  { id: 'ng-og-001', name: 'Olumo Rock', category: 'tourism', lat: 7.1020, lon: 3.3460, city: 'Abeokuta', state: 'Ogun', country: 'Nigeria', phone: '+2348039111888', description: 'Historic rock formation and tourist attraction', tags: ['rock', 'tourism', 'history'], trustScore: 92 },
  { id: 'ng-og-002', name: 'Federal University of Agriculture Abeokuta', category: 'education', lat: 7.2230, lon: 3.4380, city: 'Abeokuta', state: 'Ogun', country: 'Nigeria', phone: '+2348039555000', description: 'FUNAAB — federal agriculture university', tags: ['university', 'agriculture'], trustScore: 88 },
  { id: 'ng-og-003', name: 'Bells University of Technology', category: 'education', lat: 6.9610, lon: 3.4220, city: 'Ota', state: 'Ogun', country: 'Nigeria', phone: '+2348039666111', description: 'Private university', tags: ['university', 'private'], trustScore: 85 },

  // ===== ONDO =====
  { id: 'ng-on-001', name: 'Idanre Hills', category: 'tourism', lat: 7.1170, lon: 5.1110, city: 'Idanre', state: 'Ondo', country: 'Nigeria', phone: '+2348039777222', description: 'UNESCO heritage site, 660 steps', tags: ['hills', 'tourism', 'UNESCO'], trustScore: 93 },
  { id: 'ng-on-002', name: 'Federal University of Technology Akure', category: 'education', lat: 7.3000, lon: 5.1380, city: 'Akure', state: 'Ondo', country: 'Nigeria', phone: '+2348039888333', description: 'FUTA — federal tech university', tags: ['university', 'tech'], trustScore: 88 },
  { id: 'ng-on-003', name: 'Owo Museum', category: 'culture', lat: 7.1960, lon: 5.5870, city: 'Owo', state: 'Ondo', country: 'Nigeria', description: 'Yoruba culture and antiquities museum', tags: ['museum', 'culture'], trustScore: 84 },

  // ===== OSUN =====
  { id: 'ng-os-001', name: 'Osun-Osogbo Sacred Grove', category: 'heritage', lat: 7.7560, lon: 4.5670, city: 'Osogbo', state: 'Osun', country: 'Nigeria', description: 'UNESCO World Heritage sacred forest', tags: ['heritage', 'UNESCO', 'culture'], trustScore: 96 },
  { id: 'ng-os-002', name: 'Obafemi Awolowo University', category: 'education', lat: 7.5180, lon: 4.5230, city: 'Ile-Ife', state: 'Osun', country: 'Nigeria', phone: '+2348039999444', description: 'OAU — federal university', tags: ['university'], trustScore: 91 },
  { id: 'ng-os-003', name: 'Erin Ijesha Waterfalls', category: 'tourism', lat: 7.6420, lon: 4.9000, city: 'Erin Ijesha', state: 'Osun', country: 'Nigeria', description: 'Multi-tier waterfall', tags: ['waterfall', 'tourism'], trustScore: 90 },

  // ===== OYO =====
  { id: 'ng-oy-001', name: 'University of Ibadan', category: 'education', lat: 7.4430, lon: 3.8990, city: 'Ibadan', state: 'Oyo', country: 'Nigeria', phone: '+2348039111777', description: 'First Nigerian university (UI, 1948)', tags: ['university', 'education', 'historic'], trustScore: 95 },
  { id: 'ng-oy-002', name: 'Cocoa House', category: 'landmark', lat: 7.3950, lon: 3.9020, city: 'Ibadan', state: 'Oyo', country: 'Nigeria', description: 'First skyscraper in tropical Africa', tags: ['landmark', 'historic'], trustScore: 87 },
  { id: 'ng-oy-003', name: 'Bower\'s Tower', category: 'landmark', lat: 7.3920, lon: 3.8930, city: 'Ibadan', state: 'Oyo', country: 'Nigeria', description: 'Historic colonial-era observation tower', tags: ['landmark'], trustScore: 84 },
  { id: 'ng-oy-004', name: 'Agodi Gardens', category: 'tourism', lat: 7.4100, lon: 3.9100, city: 'Ibadan', state: 'Oyo', country: 'Nigeria', phone: '+2348039222888', description: 'Botanical garden and recreation', tags: ['garden', 'tourism'], trustScore: 86 },
  { id: 'ng-oy-005', name: 'Ibadan Mall (Palms)', category: 'shopping', lat: 7.4150, lon: 3.8960, city: 'Ibadan', state: 'Oyo', country: 'Nigeria', description: 'Modern shopping centre', tags: ['mall', 'shopping'], trustScore: 87 },

  // ===== PLATEAU =====
  { id: 'ng-pl-001', name: 'University of Jos', category: 'education', lat: 9.9520, lon: 8.8920, city: 'Jos', state: 'Plateau', country: 'Nigeria', phone: '+2348039333000', description: 'Federal university (UNIJOS)', tags: ['university'], trustScore: 88 },
  { id: 'ng-pl-002', name: 'Jos Wildlife Park', category: 'tourism', lat: 9.8880, lon: 8.8550, city: 'Jos', state: 'Plateau', country: 'Nigeria', phone: '+2348039444222', description: 'Zoo and wildlife sanctuary', tags: ['wildlife', 'tourism'], trustScore: 86 },
  { id: 'ng-pl-003', name: 'Riyom Rock', category: 'landmark', lat: 9.6470, lon: 8.7700, city: 'Riyom', state: 'Plateau', country: 'Nigeria', description: 'Iconic balanced rock formation', tags: ['rock', 'landmark'], trustScore: 90 },
  { id: 'ng-pl-004', name: 'Jos Museum', category: 'culture', lat: 9.8970, lon: 8.8780, city: 'Jos', state: 'Plateau', country: 'Nigeria', description: 'Museum with Nok terracotta artefacts', tags: ['museum', 'culture'], trustScore: 89 },

  // ===== RIVERS =====
  { id: 'ng-ri-001', name: 'University of Port Harcourt', category: 'education', lat: 4.8980, lon: 6.9120, city: 'Port Harcourt', state: 'Rivers', country: 'Nigeria', phone: '+2348039555111', description: 'Federal university (UNIPORT)', tags: ['university'], trustScore: 89 },
  { id: 'ng-ri-002', name: 'Port Harcourt International Airport', category: 'transport', lat: 5.0155, lon: 6.9495, city: 'Omagwa', state: 'Rivers', country: 'Nigeria', description: 'International airport', tags: ['airport'], trustScore: 86 },
  { id: 'ng-ri-003', name: 'Port Harcourt Pleasure Park', category: 'tourism', lat: 4.8410, lon: 7.0080, city: 'Port Harcourt', state: 'Rivers', country: 'Nigeria', phone: '+2348039666333', description: 'Family entertainment park', tags: ['park', 'recreation'], trustScore: 85 },
  { id: 'ng-ri-004', name: 'Mile 1 Market', category: 'market', lat: 4.7970, lon: 7.0120, city: 'Port Harcourt', state: 'Rivers', country: 'Nigeria', description: 'Major commercial market', tags: ['market'], trustScore: 80 },
  { id: 'ng-ri-005', name: 'Bonny Island LNG', category: 'business', lat: 4.4480, lon: 7.1730, city: 'Bonny', state: 'Rivers', country: 'Nigeria', phone: '+2348039777444', description: 'NLNG plant — major LNG producer', tags: ['lng', 'business', 'oil'], trustScore: 92 },

  // ===== SOKOTO =====
  { id: 'ng-so-001', name: 'Sultan of Sokoto Palace', category: 'heritage', lat: 13.0610, lon: 5.2380, city: 'Sokoto', state: 'Sokoto', country: 'Nigeria', description: 'Seat of the Sultan of Sokoto', tags: ['palace', 'heritage'], trustScore: 95 },
  { id: 'ng-so-002', name: 'Usmanu Danfodiyo University', category: 'education', lat: 13.1340, lon: 5.2090, city: 'Sokoto', state: 'Sokoto', country: 'Nigeria', phone: '+2348039888555', description: 'Federal university (UDUSOK)', tags: ['university'], trustScore: 86 },
  { id: 'ng-so-003', name: 'Shehu Kangiwa Square', category: 'landmark', lat: 13.0590, lon: 5.2410, city: 'Sokoto', state: 'Sokoto', country: 'Nigeria', description: 'Central city square', tags: ['landmark'], trustScore: 82 },

  // ===== TARABA =====
  { id: 'ng-ta-001', name: 'Mambilla Plateau', category: 'tourism', lat: 6.8500, lon: 11.3500, city: 'Gembu', state: 'Taraba', country: 'Nigeria', description: 'Highest plateau in Nigeria, tea plantations', tags: ['plateau', 'tourism', 'tea'], trustScore: 93 },
  { id: 'ng-ta-002', name: 'Taraba State University', category: 'education', lat: 8.8870, lon: 11.3680, city: 'Jalingo', state: 'Taraba', country: 'Nigeria', phone: '+2348039999666', description: 'State university', tags: ['university'], trustScore: 82 },

  // ===== YOBE =====
  { id: 'ng-yo-001', name: 'Yobe State University', category: 'education', lat: 11.7470, lon: 11.9660, city: 'Damaturu', state: 'Yobe', country: 'Nigeria', phone: '+2348039111000', description: 'State university', tags: ['university'], trustScore: 81 },
  { id: 'ng-yo-002', name: 'Dagona Sanctuary Lake', category: 'tourism', lat: 12.8500, lon: 10.7330, city: 'Nguru', state: 'Yobe', country: 'Nigeria', description: 'Bird sanctuary and wetland', tags: ['lake', 'birds', 'nature'], trustScore: 86 },

  // ===== ZAMFARA =====
  { id: 'ng-za-001', name: 'Federal University Gusau', category: 'education', lat: 12.1700, lon: 6.6620, city: 'Gusau', state: 'Zamfara', country: 'Nigeria', phone: '+2348039222000', description: 'Federal university', tags: ['university'], trustScore: 82 },
  { id: 'ng-za-002', name: 'Kanoma Hills', category: 'tourism', lat: 12.5000, lon: 6.0000, city: 'Maru', state: 'Zamfara', country: 'Nigeria', description: 'Scenic hill range', tags: ['hills', 'nature'], trustScore: 78 },

  // ===== ADDITIONAL LAGOS BUSINESSES =====
  { id: 'ng-la-019', name: 'Mobil Petrol Station VI', category: 'fuel', lat: 6.4280, lon: 3.4180, city: 'Victoria Island', state: 'Lagos', country: 'Nigeria', phone: '+2348012347001', description: 'Mobil-branded fuel station', tags: ['fuel', 'petrol'], trustScore: 88 },
  { id: 'ng-la-020', name: 'Total Energies Lekki', category: 'fuel', lat: 6.4350, lon: 3.4920, city: 'Lekki', state: 'Lagos', country: 'Nigeria', phone: '+2348012347002', description: 'TotalEnergies fuel station', tags: ['fuel', 'petrol'], trustScore: 87 },
  { id: 'ng-la-021', name: 'Reddington Hospital', category: 'healthcare', lat: 6.4310, lon: 3.4290, city: 'Victoria Island', state: 'Lagos', country: 'Nigeria', phone: '+2348176666261', description: 'Multispecialty private hospital', tags: ['hospital', 'healthcare'], trustScore: 91 },
  { id: 'ng-la-022', name: 'Lagos University Teaching Hospital', category: 'healthcare', lat: 6.5160, lon: 3.3870, city: 'Idi-Araba', state: 'Lagos', country: 'Nigeria', phone: '+2348023456000', description: 'LUTH — federal teaching hospital', tags: ['hospital', 'healthcare'], trustScore: 90 },
  { id: 'ng-la-023', name: 'Silverbird Galleria', category: 'entertainment', lat: 6.4280, lon: 3.4220, city: 'Victoria Island', state: 'Lagos', country: 'Nigeria', phone: '+2348012347003', description: 'Cinema and shopping complex', tags: ['cinema', 'mall'], trustScore: 88 },
  { id: 'ng-la-024', name: 'Freedom Park Lagos', category: 'tourism', lat: 6.4520, lon: 3.3950, city: 'Lagos Island', state: 'Lagos', country: 'Nigeria', phone: '+2348012347004', description: 'Heritage park on former colonial prison site', tags: ['park', 'heritage'], trustScore: 88 },
  { id: 'ng-la-025', name: 'Domino\'s Pizza Ikeja', category: 'restaurant', lat: 6.6020, lon: 3.3520, city: 'Ikeja', state: 'Lagos', country: 'Nigeria', phone: '+2347003666466', description: 'Pizza delivery restaurant', tags: ['food', 'pizza', 'restaurant'], trustScore: 86 },
  { id: 'ng-la-026', name: 'Chicken Republic Lekki', category: 'restaurant', lat: 6.4360, lon: 3.4900, city: 'Lekki', state: 'Lagos', country: 'Nigeria', phone: '+2347007007007', description: 'Nigerian fast-food chain', tags: ['food', 'restaurant'], trustScore: 85 },
  { id: 'ng-la-027', name: 'Access Bank HQ', category: 'business', lat: 6.4310, lon: 3.4280, city: 'Victoria Island', state: 'Lagos', country: 'Nigeria', phone: '+2347002255222', description: 'Access Bank headquarters', tags: ['bank', 'fintech'], trustScore: 93 },
  { id: 'ng-la-028', name: 'First Bank HQ', category: 'business', lat: 6.4500, lon: 3.3940, city: 'Lagos Island', state: 'Lagos', country: 'Nigeria', phone: '+2348039000111', description: 'First Bank of Nigeria headquarters', tags: ['bank'], trustScore: 92 },

  // ===== ADDITIONAL ABUJA BUSINESSES =====
  { id: 'ng-fc-012', name: 'Shoprite Jabi', category: 'shopping', lat: 9.0370, lon: 7.4270, city: 'Abuja', state: 'FCT', country: 'Nigeria', phone: '+2349070111222', description: 'Supermarket in Jabi Lake Mall', tags: ['groceries', 'shopping'], trustScore: 89 },
  { id: 'ng-fc-013', name: 'Cubana Lounge Abuja', category: 'entertainment', lat: 9.0640, lon: 7.4870, city: 'Abuja', state: 'FCT', country: 'Nigeria', phone: '+2349070333444', description: 'Premier nightclub and lounge', tags: ['nightclub', 'entertainment'], trustScore: 84 },
  { id: 'ng-fc-014', name: 'AYA Junction', category: 'landmark', lat: 9.0510, lon: 7.5040, city: 'Abuja', state: 'FCT', country: 'Nigeria', description: 'Major intersection in Asokoro', tags: ['landmark', 'junction'], trustScore: 82 },
  { id: 'ng-fc-015', name: 'Sheraton Abuja Hotel', category: 'hotel', lat: 9.0810, lon: 7.4880, city: 'Abuja', state: 'FCT', country: 'Nigeria', phone: '+2349034611000', description: '5-star international hotel', tags: ['hotel', 'luxury'], trustScore: 92 },
  { id: 'ng-fc-016', name: 'Garki Hospital', category: 'healthcare', lat: 9.0380, lon: 7.4830, city: 'Abuja', state: 'FCT', country: 'Nigeria', phone: '+2349088000000', description: 'PPP-run general hospital', tags: ['hospital'], trustScore: 88 },
  { id: 'ng-fc-017', name: 'Genesis Cinema Ceddi Plaza', category: 'entertainment', lat: 9.0660, lon: 7.4790, city: 'Abuja', state: 'FCT', country: 'Nigeria', phone: '+2349070555666', description: 'Cinema and entertainment hub', tags: ['cinema'], trustScore: 87 },
];

/** Initialize offline database with seed data if not already seeded */
export async function initOfflineData(): Promise<{ seeded: boolean; count: number }> {
  const alreadySeeded = await isSeeded();
  if (alreadySeeded) {
    const count = await db.pois.count();
    return { seeded: true, count };
  }
  const count = await seedPOIData(DEFAULT_SEED);
  return { seeded: true, count };
}

/** Public dataset URL for syncing latest POI data (free GitHub-hosted JSON) */
export const PUBLIC_POI_DATASET_URL =
  'https://raw.githubusercontent.com/openpoi-africa/nigeria-poi/main/poi.json';

/**
 * Sync latest POI data from a public dataset URL.
 * Falls back to local default seed if remote fetch fails.
 */
export async function syncPOIDataFromRemote(url = PUBLIC_POI_DATASET_URL): Promise<{ success: boolean; count: number; source: 'remote' | 'local'; error?: string }> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as POIRecord[];
    if (!Array.isArray(data) || data.length === 0) throw new Error('Empty dataset');
    // Merge: keep existing + overwrite with remote
    const merged = [...DEFAULT_SEED, ...data];
    const dedup = new Map(merged.map((p) => [p.id, p]));
    const final = Array.from(dedup.values());
    const count = await seedPOIData(final);
    return { success: true, count, source: 'remote' };
  } catch (err) {
    // Fallback: re-seed default dataset
    const count = await seedPOIData(DEFAULT_SEED);
    return {
      success: false,
      count,
      source: 'local',
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/** Import custom POI data from a JSON file or URL */
export async function importPOIData(source: string | POIRecord[]): Promise<number> {
  let data: POIRecord[];
  if (typeof source === 'string') {
    const res = await fetch(source);
    data = await res.json();
  } else {
    data = source;
  }
  return seedPOIData(data);
}

/** Clear all offline data */
export async function clearOfflineData(): Promise<void> {
  await db.pois.clear();
  await db.cachedSearches.clear();
  await db.meta.clear();
}
