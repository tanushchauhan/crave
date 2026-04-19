/**
 * Theme-specific Unsplash photo pools + short blurbs for restaurant card backfill.
 * URLs are hotlink-friendly Unsplash CDN images (demo / placeholder use).
 */

import { hashStringToUint32 } from "./restaurant-dummies.mjs";

/** @type {Record<string, string[]>} */
export const PHOTO_POOLS = {
  bbq: [
    "https://images.unsplash.com/photo-1529193591184-9ba311a0a5f0?w=1200&q=80",
    "https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&q=80",
    "https://images.unsplash.com/photo-1558030006-450675393462?w=1200&q=80",
    "https://images.unsplash.com/photo-1552332386-f8dd00dc2f85?w=1200&q=80",
    "https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=1200&q=80",
  ],
  mexican: [
    "https://images.unsplash.com/photo-1565299585323-3819c362a056?w=1200&q=80",
    "https://images.unsplash.com/photo-1551504738-893b97f34467?w=1200&q=80",
    "https://images.unsplash.com/photo-1613514785946-d7f40e7a6fab?w=1200&q=80",
    "https://images.unsplash.com/photo-1599974579688-8dbdd335c77f?w=1200&q=80",
    "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=1200&q=80",
  ],
  pizza: [
    "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1200&q=80",
    "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=1200&q=80",
    "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1200&q=80",
    "https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=1200&q=80",
    "https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=1200&q=80",
  ],
  burgers: [
    "https://images.unsplash.com/photo-1550547660-d9450f859349?w=1200&q=80",
    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1200&q=80",
    "https://images.unsplash.com/photo-1553979459-b858f08886e9?w=1200&q=80",
    "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=1200&q=80",
    "https://images.unsplash.com/photo-1550317138-10000687a2b6?w=1200&q=80",
  ],
  sushi: [
    "https://images.unsplash.com/photo-1579584425555-c97ce4778850?w=1200&q=80",
    "https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=1200&q=80",
    "https://images.unsplash.com/photo-1553621042-f6e147245754?w=1200&q=80",
    "https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?w=1200&q=80",
    "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=1200&q=80",
  ],
  thai: [
    "https://images.unsplash.com/photo-1559314809-0d155014e29e?w=1200&q=80",
    "https://images.unsplash.com/photo-1582878826622-65b7f0a8e543?w=1200&q=80",
    "https://images.unsplash.com/photo-1569562211033-88b68475de3d?w=1200&q=80",
    "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=1200&q=80",
    "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=1200&q=80",
  ],
  vietnamese: [
    "https://images.unsplash.com/photo-1582878826622-65b7f0a8e543?w=1200&q=80",
    "https://images.unsplash.com/photo-1591814467327-cdf248a3ad12?w=1200&q=80",
    "https://images.unsplash.com/photo-1525755662778-989d0524087e?w=1200&q=80",
    "https://images.unsplash.com/photo-1555126634-323283e090fa?w=1200&q=80",
    "https://images.unsplash.com/photo-1600490033905-65da7d232f47?w=1200&q=80",
  ],
  chinese: [
    "https://images.unsplash.com/photo-1525753231602-6eaca59d8e4f?w=1200&q=80",
    "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=1200&q=80",
    "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=1200&q=80",
    "https://images.unsplash.com/photo-1582878826622-65b7f0a8e543?w=1200&q=80",
    "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=1200&q=80",
  ],
  indian: [
    "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=1200&q=80",
    "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=1200&q=80",
    "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=1200&q=80",
    "https://images.unsplash.com/photo-1563379091339-03246963d29c?w=1200&q=80",
    "https://images.unsplash.com/photo-1588166524941-3bf61d9a42f5?w=1200&q=80",
  ],
  ethiopian: [
    "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=1200&q=80",
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=80",
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=80",
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&q=80",
    "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1200&q=80",
  ],
  steak: [
    "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=1200&q=80",
    "https://images.unsplash.com/photo-1558030006-450675393462?w=1200&q=80",
    "https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=1200&q=80",
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=80",
    "https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&q=80",
  ],
  seafood: [
    "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1200&q=80",
    "https://images.unsplash.com/photo-1551218808-94e220e084d2?w=1200&q=80",
    "https://images.unsplash.com/photo-1579584425555-c97ce4778850?w=1200&q=80",
    "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=1200&q=80",
    "https://images.unsplash.com/photo-1559339352-47d3ad5e6c0e?w=1200&q=80",
  ],
  coffee: [
    "https://images.unsplash.com/photo-1495474472887-2361752bc820?w=1200&q=80",
    "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=1200&q=80",
    "https://images.unsplash.com/photo-1447933601403-0c6688de94e0?w=1200&q=80",
    "https://images.unsplash.com/photo-1511920170033-f8396924c348?w=1200&q=80",
    "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=1200&q=80",
  ],
  bar: [
    "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1200&q=80",
    "https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=1200&q=80",
    "https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=1200&q=80",
    "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=1200&q=80",
    "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=1200&q=80",
  ],
  diner: [
    "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=1200&q=80",
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&q=80",
    "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=1200&q=80",
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=80",
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&q=80",
  ],
  deli: [
    "https://images.unsplash.com/photo-1509722747041-616f39b57569?w=1200&q=80",
    "https://images.unsplash.com/photo-1553909487-cd47d09227d4?w=1200&q=80",
    "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=1200&q=80",
    "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=1200&q=80",
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=80",
  ],
  wings: [
    "https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=1200&q=80",
    "https://images.unsplash.com/photo-1608039829572-78524f79cadc?w=1200&q=80",
    "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=1200&q=80",
    "https://images.unsplash.com/photo-1594221708779-94832f4320d1?w=1200&q=80",
    "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200&q=80",
  ],
  soul: [
    "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=1200&q=80",
    "https://images.unsplash.com/photo-1580476262798-bddd9f4b7369?w=1200&q=80",
    "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=1200&q=80",
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=80",
    "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200&q=80",
  ],
  italian: [
    "https://images.unsplash.com/photo-1598866599236-5547cdf0bd21?w=1200&q=80",
    "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=1200&q=80",
    "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=1200&q=80",
    "https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&q=80",
    "https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=1200&q=80",
  ],
  french: [
    "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=1200&q=80",
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=80",
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=80",
    "https://images.unsplash.com/photo-1551218808-94e220e084d2?w=1200&q=80",
    "https://images.unsplash.com/photo-1544148103-0773bfad6b95?w=1200&q=80",
  ],
  korean: [
    "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=1200&q=80",
    "https://images.unsplash.com/photo-1498654896293-37aacf113fd9?w=1200&q=80",
    "https://images.unsplash.com/photo-1525753231602-6eaca59d8e4f?w=1200&q=80",
    "https://images.unsplash.com/photo-1583224994964-6695c27f38d3?w=1200&q=80",
    "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=1200&q=80",
  ],
  poke: [
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1200&q=80",
    "https://images.unsplash.com/photo-1579584425555-c97ce4778850?w=1200&q=80",
    "https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?w=1200&q=80",
    "https://images.unsplash.com/photo-1553621042-f6e147245754?w=1200&q=80",
    "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=1200&q=80",
  ],
  noodles: [
    "https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=1200&q=80",
    "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=1200&q=80",
    "https://images.unsplash.com/photo-1617093727343-374948b9869c?w=1200&q=80",
    "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=1200&q=80",
    "https://images.unsplash.com/photo-1563379091339-03246963d29c?w=1200&q=80",
  ],
  caribbean: [
    "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=1200&q=80",
    "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=1200&q=80",
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=80",
    "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200&q=80",
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&q=80",
  ],
  mediterranean: [
    "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=1200&q=80",
    "https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&q=80",
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=80",
    "https://images.unsplash.com/photo-1544148103-0773bfad6b95?w=1200&q=80",
    "https://images.unsplash.com/photo-1551218808-94e220e084d2?w=1200&q=80",
  ],
  grocery: [
    "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&q=80",
    "https://images.unsplash.com/photo-1588964895597-cfccd6e2dbf9?w=1200&q=80",
    "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1200&q=80",
    "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=1200&q=80",
    "https://images.unsplash.com/photo-1550989460-0adf9ea622e2?w=1200&q=80",
  ],
  dessert: [
    "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=1200&q=80",
    "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=1200&q=80",
    "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=1200&q=80",
    "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=1200&q=80",
    "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=1200&q=80",
  ],
  default: [
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&q=80",
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=80",
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&q=80",
    "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=1200&q=80",
    "https://images.unsplash.com/photo-1544148103-0773bfad6b95?w=1200&q=80",
    "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1200&q=80",
    "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1200&q=80",
    "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=1200&q=80",
    "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200&q=80",
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=80",
  ],
};

/** @type {{ re: RegExp, key: keyof PHOTO_POOLS }[]} */
const THEME_RULES = [
  { re: /poke|poké/i, key: "poke" },
  { re: /pho|viet|bahn|bánh/i, key: "vietnamese" },
  { re: /korean|k-bop|k bop/i, key: "korean" },
  { re: /noodle|ramen|bikkle|tenten/i, key: "noodles" },
  { re: /thai|pad thai|mam's|pd thai/i, key: "thai" },
  { re: /sushi|nori|omakase|japan|fukumoto|raku|geisha/i, key: "sushi" },
  { re: /china|chinese|wu chow|tso |dim sum|mandarin/i, key: "chinese" },
  { re: /indian|clay pit|tikka|masala|curry house/i, key: "indian" },
  { re: /ethiopian|aster/i, key: "ethiopian" },
  { re: /bbq|bar-?b-?q|barbecue|smoke|brisket|stubb|pok-e|micklethwait|sam's bbq|house park/i, key: "bbq" },
  { re: /pizza|pizzeria|pies|313|zalat|sammataro|hoboken|spartan|salvation|favorite pizza|dollar slice|pinch/i, key: "pizza" },
  { re: /taco|tex mex|mexican|cantina|discada|salsa|torchy|velvet|veracruz|vaquero|taquero|tacodeli|pelons|el chile|el pollo|curra|lich|trudy|traphouse|sixth and waller|chupacabra|rio grande/i, key: "mexican" },
  { re: /burger|hopdoddy|p\. terry|plucker|wingzup|happy chick/i, key: "burgers" },
  { re: /steak|chop|chophouse|hoffbrau|perry|ruth|vince young|red ash|e\.?ddie v|alc steak|bob's steak/i, key: "steak" },
  { re: /oyster|j carver|seafood|marisco|truluck|garbo/i, key: "seafood" },
  { re: /coffee|mozart|kerbey|la madeleine|diner/i, key: "coffee" },
  { re: /pub|bar|grill|sports bar|peche|péché|swim club|punch bowl|group therapy|shoal|stubb/i, key: "bar" },
  { re: /denny|24 diner|victory lap/i, key: "diner" },
  { re: /deli|sandwich|galloway|jason|walton|quickie|austin daily press|congress avenue grocery/i, key: "deli" },
  { re: /wing/i, key: "wings" },
  { re: /soul food|roland/i, key: "soul" },
  { re: /italian|ristorante|asti|quattro|verbena|luminaire/i, key: "italian" },
  { re: /french|bistro|péché|peche|chez nous/i, key: "french" },
  { re: /caribbean/i, key: "caribbean" },
  { re: /cava|mediterranean|kebab|halal|israel|greek/i, key: "mediterranean" },
  { re: /grocery|market|pickie|duck market|sour duck/i, key: "grocery" },
  { re: /pie|ice|shaved|dessert|nonna|pork and pie/i, key: "dessert" },
];

/** @type {Record<string, string[]>} */
const BLURBS = {
  bbq: [
    "Pit-smoked classics, tangy sauce, and picnic tables — {name} is peak Austin barbecue energy.",
    "Low-and-slow meats plus house pickles; {name} is built for big appetites and bigger groups.",
  ],
  mexican: [
    "Bright salsas, fresh masa, and margarita weather — {name} nails Tex-Mex without trying too hard.",
    "Tacos, tortas, and late-night cravings: {name} keeps the griddle hot and the flavors loud.",
  ],
  pizza: [
    "Blistered crusts, quality mozzarella, and shareable pies — {name} is your fold-it slice spot.",
    "Wood-fired or deck-oven magic: {name} does pizza night the right way.",
  ],
  burgers: [
    "Smash patties, melty cheese, and crispy fries — {name} is a burger run worth repeating.",
    "Juicy stacks and cold drinks; {name} is casual, loud, and delicious.",
  ],
  sushi: [
    "Clean cuts, warm rice, and careful plating — {name} brings izakaya calm to a busy night out.",
    "Omakase vibes or rolls to share: {name} keeps it fresh and photo-ready.",
  ],
  thai: [
    "Herbal curries, lime-forward salads, and gentle heat — {name} is comfort in a bowl.",
    "Thai staples done with balance; {name} is ideal when you want spice you can control.",
  ],
  vietnamese: [
    "Steaming pho, herbs on herbs, and rich broth — {name} is a reset button in restaurant form.",
    "Bright, aromatic bowls; {name} hits when you want something light but deeply satisfying.",
  ],
  chinese: [
    "Wok hei, dumplings, and family-style plates — {name} is built for passing dishes around the table.",
    "Bold sauces and crispy textures; {name} delivers craveable classics.",
  ],
  indian: [
    "Aromatics, tandoor char, and creamy curries — {name} layers spice like a pro.",
    "Naan-pull moments and fragrant rice; {name} is a spice-route comfort stop.",
  ],
  ethiopian: [
    "Injera, slow-stewed wats, and communal eating — {name} is hands-on dining at its coziest.",
    "Warm spices and shareable platters; {name} feels like a dinner party every visit.",
  ],
  steak: [
    "Prime cuts, serious sides, and a polished room — {name} is celebration-night territory.",
    "Steaks seared with intent; {name} pairs well with big plans and bigger appetites.",
  ],
  seafood: [
    "Ice-cold oysters, crisp white wine energy — {name} keeps coastal flavors landlocked but lively.",
    "Fish done simply, sauces that shine; {name} is date-night friendly without the fuss.",
  ],
  coffee: [
    "Espresso pulls, pastry crumbs, and laptop hours — {name} is your caffeine HQ.",
    "Roasty aroma, comfy seats; {name} is the pause before the night starts.",
  ],
  bar: [
    "Cold drinks, shareable snacks, and a buzzy room — {name} is where the night loosens up.",
    "Sports on, wings nearby, good pours — {name} is classic Austin hangout fuel.",
  ],
  diner: [
    "All-day breakfast, vinyl booths, and reliable plates — {name} is midnight hunger insurance.",
    "Coffee refills and comfort classics; {name} never overthinks it (in a good way).",
  ],
  deli: [
    "Stacked sandwiches, quick lines, and real portions — {name} is lunch-hour hero material.",
    "Cold cuts, warm bread, house sauces; {name} is grab-and-go done right.",
  ],
  wings: [
    "Saucy fingers, extra napkins, and game-day energy — {name} is wing night headquarters.",
    "Heat levels for every brave soul; {name} pairs wings with cold drinks and loud tables.",
  ],
  soul: [
    "Hearty plates, seasoned vegetables, and homestyle care — {name} tastes like Sunday dinner.",
    "Comfort classics with soul; {name} is built for feeding the whole crew.",
  ],
  italian: [
    "Handmade pasta energy, red-sauce confidence — {name} is carb-forward and proud of it.",
    "Wine-friendly plates and cozy lighting; {name} feels like a mini trip to Italy.",
  ],
  french: [
    "Butter, technique, and a little drama — {name} is a polished night-out move.",
    "Bistro classics with Austin ease; {name} keeps it refined without feeling stiff.",
  ],
  korean: [
    "Banchan spreads, sizzling proteins, and bold marinades — {name} is Korean comfort done loud.",
    "Shareable grills and spicy sides; {name} is built for curious eaters.",
  ],
  poke: [
    "Colorful bowls, fresh fish, and crunchy toppings — {name} is healthy-ish and totally addictive.",
    "Build-your-bowl vibes with clean flavors; {name} is lunch that still feels fun.",
  ],
  noodles: [
    "Slurpable broths, springy noodles, and savory depth — {name} is rainy-day insurance.",
    "Steam in your face, chopsticks ready; {name} does noodle-shop comfort right.",
  ],
  caribbean: [
    "Island spices, jerk heat, and sunny flavors — {name} brings Caribbean warmth to the block.",
    "Bold marinades and rice-and-peas energy; {name} is a vacation on a plate.",
  ],
  mediterranean: [
    "Fresh greens, lemony dressings, and grilled proteins — {name} keeps it bright and filling.",
    "Bowls, pitas, and herbs for days; {name} is fast-casual done with real flavor.",
  ],
  grocery: [
    "Shelves of staples, quick bites, and neighborhood usefulness — {name} is more than a pit stop.",
    "Grab-and-go snacks plus real ingredients; {name} fits busy days.",
  ],
  dessert: [
    "Sugar-forward treats and indulgent slices — {name} is the reward course you actually want.",
    "Sweet, shareable, and a little messy; {name} ends the night on a high note.",
  ],
  default: [
    "Comfort plates, friendly service, and a crowd that knows the menu — {name} is a dependable Austin favorite.",
    "Great for groups, easy to love, and always busy for a reason — {name} hits the sweet spot.",
    "Neighborhood energy with plates made for repeat visits — {name} keeps it simple and delicious.",
  ],
};

/**
 * @param {string} name
 * @returns {string}
 */
export function themeKeyForRestaurantName(name) {
  const s = String(name || "");
  for (const { re, key } of THEME_RULES) {
    if (re.test(s)) return key;
  }
  return "default";
}

/**
 * @param {string} restaurantId
 * @param {string} name
 * @returns {string[]}
 */
export function pickThemedPhotoUrls(restaurantId, name) {
  const key = themeKeyForRestaurantName(name);
  const pool = PHOTO_POOLS[key] ?? PHOTO_POOLS.default;
  const h = hashStringToUint32(`${restaurantId}:${name}`);
  const n = pool.length;
  const start = h % n;
  const out = [];
  for (let i = 0; i < 3; i += 1) {
    out.push(pool[(start + i) % n]);
  }
  return [...new Set(out)].slice(0, 3);
}

/**
 * @param {string} restaurantId
 * @param {string} name
 */
export function buildCardCopy(restaurantId, name) {
  const key = themeKeyForRestaurantName(name);
  const blurbs = BLURBS[key] ?? BLURBS.default;
  const h = hashStringToUint32(`copy:${restaurantId}`);
  const template = blurbs[h % blurbs.length];
  const short_description = template.replace(/\{name\}/g, name.trim());

  const hr = hashStringToUint32(`rate:${restaurantId}`);
  const star_rating = Math.round((3.55 + (hr % 125) / 100) * 100) / 100;
  const review_count = 42 + (hr % 958);

  const hd = hashStringToUint32(`dist:${restaurantId}`);
  const miles = Math.round((0.25 + (hd % 180) / 100) * 100) / 100;
  const distance_label = `${miles.toFixed(2)} mi`;

  return { short_description, star_rating, review_count, distance_label };
}
