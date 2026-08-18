// Data-driven content dla Rybołówstwa, Rolnictwa i Gotowania.
// UI nie zna żadnej z tych tabel — dostaje je przez skillsView().

const catchOf = (id, label, lvl, weight, xp, rarity = 'common') =>
  ({ id, label, lvl, weight, xp, rarity });

export const FISHING_SPOTS = [
  { id: 'staw', label: 'Spokojny Staw', category: 'freshwater', lvl: 1, ms: 12_000,
    catchTable: [
      catchOf('sardynka', 'Sardynka', 1, 52, 8),
      catchOf('plotka', 'Płotka', 2, 20, 10),
      catchOf('pstrag', 'Pstrąg', 10, 28, 17),
      catchOf('karp', 'Karp', 30, 15, 38),
      catchOf('losos', 'Łosoś', 40, 9, 55, 'uncommon'),
      catchOf('jesiotr', 'Jesiotr', 45, 7, 62, 'uncommon'),
      catchOf('szczupak', 'Szczupak', 55, 5, 74, 'uncommon'),
    ] },
  { id: 'wybrzeze', label: 'Kamienne Wybrzeże', category: 'coast', lvl: 5, ms: 15_000,
    catchTable: [
      catchOf('sledz', 'Śledź', 5, 30, 12),
      catchOf('krewetki', 'Krewetki', 15, 15, 24),
      catchOf('makrela', 'Makrela', 20, 26, 31),
      catchOf('malze', 'Małże', 25, 10, 35),
      catchOf('kalamarnica', 'Kałamarnica', 35, 8, 48),
      catchOf('ostrygi', 'Ostrygi', 45, 6, 61, 'uncommon'),
      catchOf('krab', 'Krab', 50, 5, 69, 'uncommon'),
    ] },
  { id: 'morze', label: 'Głębokie Morze', category: 'deep', lvl: 60, ms: 20_000,
    catchTable: [
      catchOf('tunczyk', 'Tuńczyk', 60, 38, 83),
      catchOf('osmiornica', 'Ośmiornica', 65, 22, 94),
      catchOf('homar', 'Homar', 70, 17, 106, 'uncommon'),
      catchOf('miecznik', 'Miecznik', 75, 15, 118, 'uncommon'),
      catchOf('krolewskikrab', 'Królewski Krab', 85, 8, 145, 'rare'),
    ] },
  { id: 'otchlan', label: 'Wody Otchłani', category: 'abyss', lvl: 80, ms: 26_000,
    catchTable: [
      catchOf('wegorzglebinowy', 'Węgorz Głębinowy', 80, 55, 132, 'uncommon'),
      catchOf('glebinowa', 'Ryba Głębin', 82, 24, 140, 'uncommon'),
      catchOf('rybaotchlani', 'Ryba Otchłani', 90, 30, 168, 'rare'),
      catchOf('mistycznywegorz', 'Mistyczny Węgorz', 95, 15, 205, 'mystic'),
    ] },
];

const farm = (id, label, category, lvl, xp, ms, yieldRange, extra = {}) => ({
  id, label, category, lvl, xp, ms, outputs: [{ id, label, yield: yieldRange }], ...extra,
});
const animal = (id, label, lvl, xp, ms, outputs, mode = 'renewable') => ({
  id, label, category: 'animals', lvl, xp, ms, outputs, animalMode: mode,
});

export const FARMING_PRODUCTIONS = [
  farm('ziemniak', 'Ziemniak', 'crops', 1, 10, 30_000, [4, 7]),
  // Zioła bojowe są celowo dużo szybsze od zwykłych plonów. Alchemia jest
  // jedynym źródłem leczenia, więc gracz po przegranej musi móc odbudować
  // zapas mikstur w kilkadziesiąt sekund, a nie czekać kilka minut na składnik.
  farm('ziolo', 'Zioło Polne', 'crops', 2, 11, 8_000, [2, 4]),
  farm('marchew', 'Marchew', 'crops', 3, 13, 45_000, [3, 5]),
  farm('zboze', 'Zboże', 'crops', 4, 15, 55_000, [3, 6]),
  farm('cebula', 'Cebula', 'crops', 6, 18, 60_000, [3, 6]),
  farm('jablko', 'Jabłoń', 'fruit', 5, 17, 60_000, [3, 6], { outputs: [{ id: 'jablko', label: 'Jabłko', yield: [3, 6] }] }),
  farm('salata', 'Sałata', 'crops', 10, 25, 75_000, [2, 4]),
  farm('ziologorzk', 'Zioło Gorzkie', 'crops', 8, 21, 12_000, [2, 4]),
  farm('jagody', 'Krzew Jagód', 'fruit', 12, 29, 90_000, [3, 6], { outputs: [{ id: 'jagody', label: 'Jagody', yield: [3, 6] }] }),
  farm('pomidor', 'Pomidor', 'crops', 14, 34, 90_000, [3, 6]),
  farm('kapusta', 'Kapusta', 'crops', 18, 42, 120_000, [2, 4]),
  farm('korzennocny', 'Korzeń Nocny', 'crops', 16, 38, 16_000, [2, 4]),
  farm('truskawka', 'Truskawki', 'fruit', 20, 48, 150_000, [3, 5]),
  farm('ogorek', 'Ogórek', 'crops', 22, 53, 150_000, [3, 5]),
  farm('kwiatciern', 'Kwiat Cierniowy', 'crops', 24, 58, 22_000, [1, 3]),
  farm('fasola', 'Fasola', 'crops', 26, 62, 180_000, [4, 7]),
  farm('winogrona', 'Winorośl', 'fruit', 28, 67, 240_000, [3, 6], { outputs: [{ id: 'winogrona', label: 'Winogrona', yield: [3, 6] }] }),
  farm('papryka', 'Papryka', 'crops', 34, 81, 240_000, [2, 4]),
  farm('cytryna', 'Drzewko Cytrynowe', 'fruit', 35, 84, 360_000, [3, 5], { outputs: [{ id: 'cytryna', label: 'Cytryna', yield: [3, 5] }] }),
  farm('kukurydza', 'Kukurydza', 'crops', 38, 92, 300_000, [4, 7]),
  farm('pomarancza', 'Pomarańcza', 'fruit', 40, 98, 480_000, [3, 6]),
  farm('czosnek', 'Czosnek', 'crops', 42, 104, 360_000, [2, 4]),
  farm('brzoskwinia', 'Brzoskwinia', 'fruit', 45, 112, 600_000, [3, 5]),
  farm('dynia', 'Dynia', 'crops', 46, 115, 480_000, [2, 3]),
  farm('grzyby', 'Grzyby', 'crops', 50, 126, 600_000, [2, 5]),
  farm('banan', 'Bananowiec', 'fruit', 50, 126, 720_000, [3, 6], { outputs: [{ id: 'banan', label: 'Banan', yield: [3, 6] }] }),
  farm('ryz', 'Ryż', 'crops', 55, 140, 720_000, [4, 8]),
  farm('chili', 'Chili', 'crops', 60, 156, 840_000, [2, 4]),
  farm('arbuz', 'Arbuz', 'fruit', 60, 156, 900_000, [2, 4]),
  farm('ziola', 'Zioła Kuchenne', 'crops', 65, 172, 960_000, [2, 5]),
  farm('zlotadynia', 'Złota Dynia', 'crops', 70, 190, 1_080_000, [1, 2], { rare: true }),
  farm('ananas', 'Ananas', 'fruit', 70, 190, 1_080_000, [2, 4]),
  farm('ksiezycowygrzyb', 'Księżycowy Grzyb', 'crops', 80, 230, 1_320_000, [1, 3], { rare: true }),
  farm('gwiezdnyowoc', 'Gwiezdny Owoc', 'fruit', 80, 230, 1_320_000, [1, 3], { rare: true }),
  farm('mistyczneziolo', 'Mistyczne Zioło', 'crops', 90, 280, 1_800_000, [1, 2], { rare: true }),
  farm('mistycznajagoda', 'Mistyczna Jagoda', 'fruit', 90, 280, 1_800_000, [1, 2], { rare: true }),

  animal('kura_jaja', 'Kurnik · Jaja', 10, 28, 90_000,
    [{ id: 'jajko', label: 'Jajko', yield: [2, 4] }]),
  animal('ul_miod', 'Ul · Miód', 20, 50, 180_000,
    [{ id: 'miod', label: 'Miód', yield: [2, 4] }]),
  animal('krowa_mleko', 'Krowa · Mleko', 25, 64, 300_000,
    [{ id: 'mleko', label: 'Mleko', yield: [2, 4] }]),
  animal('owca_produkty', 'Owca · Mleko i Wełna', 35, 88, 420_000,
    [{ id: 'mlekoowcze', label: 'Mleko Owcze', yield: [1, 3] }, { id: 'welna', label: 'Wełna', yield: [1, 2] }]),
  animal('kura_mieso', 'Kura · Mięso', 40, 102, 480_000,
    [{ id: 'miesokurczaka', label: 'Mięso Kurczaka', yield: [1, 2] }], 'harvest'),
  animal('swinia_mieso', 'Świnia · Wieprzowina', 45, 116, 600_000,
    [{ id: 'wieprzowina', label: 'Wieprzowina', yield: [2, 4] }], 'harvest'),
  animal('krowa_mieso', 'Krowa · Wołowina', 55, 146, 720_000,
    [{ id: 'wolowina', label: 'Wołowina', yield: [2, 4] }], 'harvest'),
  animal('koza_mleko', 'Koza · Mleko', 65, 180, 900_000,
    [{ id: 'mlekokozie', label: 'Mleko Kozie', yield: [2, 4] }]),
  animal('egzotyczne_jajo', 'Egzotyczne Zwierzę · Jajo', 75, 215, 1_200_000,
    [{ id: 'egzotycznejajo', label: 'Egzotyczne Jajo', yield: [1, 2] }]),
  animal('mistyczne_mleko', 'Mistyczne Zwierzę · Mleko', 95, 330, 1_800_000,
    [{ id: 'mistycznemleko', label: 'Mistyczne Mleko', yield: [1, 2] }]),
];

// TRWAŁOŚĆ JEDZENIA LICZY SIĘ WYŁĄCZNIE WALKAMI.
// Był tu drugi, równoległy licznik czasu (`DUR`) — buff wygasał po X walkach
// ALBO po Y minutach, zależnie od tego, co skonćzyło się pierwsze. Dwa liczniki
// na jedną rzecz to dwa razy więcej do wytłumaczenia i żadnej decyzji więcej
// dla gracza: zegar tykał także wtedy, gdy nie walczył, więc potrawa potrafiła
// wyparować nieużyta. Silnik i tak zjechał już na same walki (cleanupFoodBuffs
// kasuje expiresAt), a to pole zostało i dalej ogłaszało nieistniejącą mechanikę.
const WALKS = { early: 10, mid: 20, late: 30, end: 40 };
const recipe = (id, label, category, lvl, xp, ms, koszt, effects, tier = 'early', buffSlot = 'main_meal') => ({
  id, label, category, lvl, xp, ms, koszt,
  food: { category, buffSlot, walki: WALKS[tier], effects },
});

export const COOKING_RECIPES = [
  // Fish / seafood — lekki styl: AS, kryt, celność, mana.
  recipe('sardynkazziemniakiem', 'Sardynka z Ziemniakiem', 'fish', 1, 14, 8_000,
    { sardynka: 1, ziemniak: 1 }, { attackSpeedPct: 0.02 }),
  recipe('grillowanasardynka', 'Grillowana Sardynka', 'fish', 3, 16, 8_000,
    { sardynka: 1 }, { attackSpeedPct: 0.02 }),
  recipe('pstragzziolami', 'Pstrąg z Ziołami', 'fish', 10, 28, 10_000,
    { pstrag: 1, ziola: 1 }, { accuracy: 0.03 }),
  recipe('makrelazcytryna', 'Makrela z Cytryną', 'fish', 20, 45, 12_000,
    { makrela: 1, cytryna: 1 }, { attackSpeedPct: 0.03, accuracy: 0.02 }, 'mid'),
  recipe('karpzwarzywami', 'Karp z Warzywami', 'fish', 30, 62, 14_000,
    { karp: 1, marchew: 1, cebula: 1 }, { manaRegenPct: 0.04, accuracy: 0.02 }, 'mid'),
  recipe('pieczonylosos', 'Pieczony Łosoś', 'fish', 40, 82, 16_000,
    { losos: 1, ziemniak: 2, cytryna: 1 }, { attackSpeedPct: 0.05 }, 'mid'),
  recipe('krabzczosnkiem', 'Krab z Czosnkiem', 'fish', 50, 105, 18_000,
    { krab: 1, czosnek: 1 }, { critChance: 0.03 }, 'late'),
  recipe('stekztunczyka', 'Stek z Tuńczyka', 'fish', 60, 132, 20_000,
    { tunczyk: 1, ziola: 1 }, { critChance: 0.05, accuracy: 0.03 }, 'late'),
  recipe('homarkrolewski', 'Homar Królewski', 'fish', 70, 164, 22_000,
    { homar: 1, czosnek: 1, cytryna: 1 }, { attackSpeedPct: 0.06, critChance: 0.03 }, 'late'),
  recipe('miecznikzziolami', 'Miecznik z Ziołami', 'fish', 80, 205, 24_000,
    { miecznik: 1, ziola: 2 }, { critChance: 0.05, accuracy: 0.05 }, 'end'),
  recipe('ucztaotchlani', 'Uczta Otchłani', 'fish', 90, 260, 28_000,
    { rybaotchlani: 1, osmiornica: 1, mistyczneziolo: 1 },
    { attackSpeedPct: 0.07, critChance: 0.05, accuracy: 0.04 }, 'end'),

  // Meat — atak, HP i pancerz.
  recipe('jajkasadzone', 'Jajka Sadzone', 'meat', 5, 20, 9_000,
    { jajko: 2 }, { hpPct: 0.02 }),
  recipe('pieczonykurczak', 'Pieczony Kurczak', 'meat', 15, 36, 11_000,
    { miesokurczaka: 1, ziemniak: 1 }, { dmgPct: 0.03 }),
  recipe('kurczakzwarzywami', 'Kurczak z Warzywami', 'meat', 25, 54, 13_000,
    { miesokurczaka: 1, marchew: 1, cebula: 1 }, { dmgPct: 0.03, hpPct: 0.03 }, 'mid'),
  recipe('gulaszwieprzowy', 'Gulasz Wieprzowy', 'meat', 35, 74, 15_000,
    { wieprzowina: 1, ziemniak: 1, marchew: 1, cebula: 1 }, { hpPct: 0.05 }, 'mid'),
  recipe('stekwolowy', 'Stek Wołowy', 'meat', 45, 96, 17_000,
    { wolowina: 1 }, { dmgPct: 0.06 }, 'late'),
  recipe('stekzwarzywami', 'Stek z Warzywami', 'meat', 55, 122, 19_000,
    { wolowina: 1, ziemniak: 1, grzyby: 1 }, { dmgPct: 0.05, hpPct: 0.05 }, 'late'),
  recipe('pieczenkrolewska', 'Pieczeń Królewska', 'meat', 65, 154, 22_000,
    { wolowina: 2, cebula: 1, czosnek: 1, ziola: 1 }, { hpPct: 0.06, armorPct: 0.04 }, 'late'),
  recipe('krolewskauczta', 'Królewska Uczta Mięsna', 'meat', 80, 215, 26_000,
    { wolowina: 1, wieprzowina: 1, egzotycznejajo: 1 },
    { dmgPct: 0.07, hpPct: 0.07, armorPct: 0.05 }, 'end'),

  // Vegetarian — profesje, tempo zbierania, wydajność i sustain.
  recipe('pieczonyziemniak', 'Pieczony Ziemniak', 'veg', 1, 12, 8_000,
    { ziemniak: 2 }, { hpRegenPct: 0.05 }),
  recipe('salatka', 'Sałatka', 'veg', 10, 27, 10_000,
    { salata: 1, pomidor: 1, ogorek: 1 }, { professionXpPct: 0.03 }),
  recipe('zupawarzywna', 'Zupa Warzywna', 'veg', 20, 44, 12_000,
    { ziemniak: 1, marchew: 1, cebula: 1 }, { hpRegenPct: 0.10 }, 'mid'),
  recipe('salatkaowocowa', 'Sałatka Owocowa', 'veg', 30, 61, 14_000,
    { jablko: 1, jagody: 1, truskawka: 1 }, { professionXpPct: 0.05 }, 'mid'),
  recipe('warzywnecurry', 'Warzywne Curry', 'veg', 40, 82, 16_000,
    { ryz: 1, papryka: 1, cebula: 1, czosnek: 1 }, { gatheringSpeedPct: 0.05 }, 'mid'),
  recipe('zupadyniowa', 'Zupa Dyniowa', 'veg', 50, 105, 18_000,
    { dynia: 1, ziola: 1 }, { professionXpPct: 0.06, yieldPct: 0.04 }, 'late'),
  recipe('grzybowerisotto', 'Grzybowe Risotto', 'veg', 60, 132, 20_000,
    { ryz: 1, grzyby: 1, czosnek: 1 }, { luckPct: 0.06, yieldPct: 0.03 }, 'late'),
  recipe('ucztarolnika', 'Uczta Rolnika', 'veg', 70, 164, 22_000,
    { kukurydza: 1, dynia: 1, pomidor: 1, grzyby: 1 },
    { gatheringSpeedPct: 0.07, professionXpPct: 0.06 }, 'late'),
  recipe('mistycznecurry', 'Mistyczne Warzywne Curry', 'veg', 90, 260, 28_000,
    { mistyczneziolo: 1, ksiezycowygrzyb: 1, ryz: 1, zlotadynia: 1 },
    { gatheringSpeedPct: 0.10, professionXpPct: 0.08, yieldPct: 0.08 }, 'end'),

  // Dessert i Drink korzystają z tych samych receptur, ale z osobnych slotów.
  recipe('miskaowocow', 'Miska Owoców', 'dessert', 18, 40, 10_000,
    { jablko: 1, jagody: 1 }, { professionXpPct: 0.03 }, 'mid', 'dessert'),
  recipe('ciastomiodowe', 'Ciasto Miodowe', 'dessert', 38, 76, 14_000,
    { miod: 1, jajko: 1, mleko: 1 }, { professionXpPct: 0.05, luckPct: 0.03 }, 'late', 'dessert'),
  recipe('mistycznydeser', 'Mistyczny Deser', 'dessert', 88, 235, 26_000,
    { mistycznajagoda: 1, mistycznemleko: 1, miod: 1 },
    { professionXpPct: 0.08, luckPct: 0.08 }, 'end', 'dessert'),
  recipe('sokowocowy', 'Sok Owocowy', 'drink', 12, 31, 9_000,
    { jablko: 1, jagody: 1 }, { hpRegenPct: 0.05 }, 'early', 'drink'),
  recipe('mlekozmiodem', 'Mleko z Miodem', 'drink', 28, 58, 12_000,
    { mleko: 1, miod: 1 }, { hpRegenPct: 0.10 }, 'mid', 'drink'),
  recipe('herbataziolowa', 'Herbata Ziołowa', 'drink', 48, 100, 16_000,
    { ziola: 1 }, { manaRegenPct: 0.08, professionXpPct: 0.03 }, 'late', 'drink'),
  recipe('mistycznaherbata', 'Mistyczna Herbata', 'drink', 92, 285, 26_000,
    { mistyczneziolo: 1 }, { manaRegenPct: 0.15, hpRegenPct: 0.10 }, 'end', 'drink'),
];

// Emoji per przedmiot. Brak wpisu → UI spada do ikony kategorii.
// Klucz = id uprawy / ryby / potrawy / łowiska.
const IC = {
  // uprawy
  ziemniak: '🥔', ziolo: '🌿', marchew: '🥕', zboze: '🌾', cebula: '🧅',
  salata: '🥬', ziologorzk: '🍃', pomidor: '🍅', kapusta: '🥗', korzennocny: '🫚',
  ogorek: '🥒', kwiatciern: '🥀', fasola: '🫘', papryka: '🫑', kukurydza: '🌽',
  czosnek: '🧄', dynia: '🎃', grzyby: '🍄', ryz: '🍚', chili: '🌶️',
  ziola: '🪴', zlotadynia: '🟡', ksiezycowygrzyb: '🌙', mistyczneziolo: '🔮',
  // owoce
  jablko: '🍎', jagody: '🫐', truskawka: '🍓', winogrona: '🍇', cytryna: '🍋',
  pomarancza: '🍊', brzoskwinia: '🍑', banan: '🍌', arbuz: '🍉', ananas: '🍍',
  gwiezdnyowoc: '⭐', mistycznajagoda: '💠',
  // zwierzęta
  kura_jaja: '🥚', ul_miod: '🍯', krowa_mleko: '🥛', owca_produkty: '🐑',
  kura_mieso: '🍗', swinia_mieso: '🥓', krowa_mieso: '🥩', koza_mleko: '🐐',
  egzotyczne_jajo: '🦤', mistyczne_mleko: '🧉',
  // łowiska
  staw: '🎣', wybrzeze: '🏖️', morze: '🌊', otchlan: '🕳️',
  // ryby
  sardynka: '🐟', plotka: '🐠', pstrag: '🐟', karp: '🐡', losos: '🍣',
  jesiotr: '🐟', szczupak: '🐟', sledz: '🐟', krewetki: '🦐', makrela: '🐠',
  malze: '🦪', kalamarnica: '🦑', ostrygi: '🦪', krab: '🦀', tunczyk: '🐟',
  osmiornica: '🐙', homar: '🦞', miecznik: '🐟', krolewskikrab: '🦀',
  wegorzglebinowy: '🐍', glebinowa: '🐟', rybaotchlani: '🐟', mistycznywegorz: '🔮',
  // potrawy
  sardynkazziemniakiem: '🍽️', grillowanasardynka: '🐟', pstragzziolami: '🐟',
  makrelazcytryna: '🐠', karpzwarzywami: '🍲', pieczonylosos: '🍣', krabzczosnkiem: '🦀',
  stekztunczyka: '🥩', homarkrolewski: '🦞', miecznikzziolami: '🍢', ucztaotchlani: '🍜',
  jajkasadzone: '🍳', pieczonykurczak: '🍗', kurczakzwarzywami: '🍲', gulaszwieprzowy: '🍲',
  stekwolowy: '🥩', stekzwarzywami: '🥩', pieczenkrolewska: '🍖', krolewskauczta: '🍖',
  pieczonyziemniak: '🥔', salatka: '🥗', zupawarzywna: '🍲', salatkaowocowa: '🍨',
  warzywnecurry: '🍛', zupadyniowa: '🍲', grzybowerisotto: '🍚', ucztarolnika: '🥘',
  mistycznecurry: '🍛', miskaowocow: '🍉', ciastomiodowe: '🍰', mistycznydeser: '🍮',
  sokowocowy: '🧃', mlekozmiodem: '🥛', herbataziolowa: '🍵', mistycznaherbata: '🍵',
};

// Wstrzykuje ic po id — jeden przebieg na starcie, dane potem są niezmienne.
for (const p of FARMING_PRODUCTIONS) if (IC[p.id]) p.ic = IC[p.id];
for (const r of COOKING_RECIPES) if (IC[r.id]) r.ic = IC[r.id];
for (const s of FISHING_SPOTS) {
  if (IC[s.id]) s.ic = IC[s.id];
  for (const c of s.catchTable ?? []) if (IC[c.id]) c.ic = IC[c.id];
}

export { IC as LIFE_IC };
export default { FISHING_SPOTS, FARMING_PRODUCTIONS, COOKING_RECIPES };
