// RaidFolk_idle — WSZYSTKIE LICZBY
// Zmieniasz tutaj, nigdzie indziej. Restart serwera i gotowe.

import { FISHING_SPOTS, FARMING_PRODUCTIONS, COOKING_RECIPES } from './life-content.js';

// ---------------------------------------------------------------- ZESTAW BRONI
// DWANAŚCIE BAZ, po trzy na rodzinę. Każda wyprawa dropi CAŁY zestaw — inaczej
// mag nie znalazłby różdżki w Puszczy, a łucznik łuku w Kaplicy.
// Rodzinę (`wtype`) czyta skill bojowy: bijesz toporem, rośnie Broń dwuręczna.
const BRONIE = [
  { base: 'Topór',           slot: 'bron', wtype: 'dwureczna',   hands: 2 },
  { base: 'Młot',            slot: 'bron', wtype: 'dwureczna',   hands: 2 },
  { base: 'Miecz Dwuręczny', slot: 'bron', wtype: 'dwureczna',   hands: 2 },
  { base: 'Miecz',           slot: 'bron', wtype: 'jednoreczna', hands: 1 },
  { base: 'Scimitar',        slot: 'bron', wtype: 'jednoreczna', hands: 1 },
  { base: 'Sztylet',         slot: 'bron', wtype: 'jednoreczna', hands: 1 },
  { base: 'Różdżka',         slot: 'bron', wtype: 'magiczne',    hands: 1 },
  { base: 'Orb',             slot: 'bron', wtype: 'magiczne',    hands: 1 },
  { base: 'Kostur',          slot: 'bron', wtype: 'magiczne',    hands: 2 },
  { base: 'Łuk',             slot: 'bron', wtype: 'dystansowe',  hands: 2 },
  { base: 'Kusza',           slot: 'bron', wtype: 'dystansowe',  hands: 2 },
  { base: 'Oszczep',         slot: 'bron', wtype: 'dystansowe',  hands: 1 },
];

// Pancerz i dodatki. Nazwy różnią się między wyprawami — to jedyne, co je dzieli,
// bo statystyki i tak niesie poziom przedmiotu.
const PANCERZ = (h, n, b, r, p, a, t) => [
  { base: h, slot: 'helm' }, { base: n, slot: 'napiersnik' },
  { base: b, slot: 'buty' }, { base: r, slot: 'rekawice' },
  { base: p, slot: 'pierscien' }, { base: a, slot: 'amulet' },
  { base: t, slot: 'offhand', wtype: 'tarcza' },
];

// Dungeony mają krótką, jawną tabelę zamiast pełnego katalogu 19 baz Wyprawy.
// Pięć broni pokrywa każdą rodzinę skilla i wszystkie cztery rodzaje obrażeń:
// Topór/Miecz = Slash, Młot = Smash, Różdżka = Magia, Łuk = Pierce.
// Siedem pozostałych pozycji pokrywa każdy slot defensywny.
const DUNGEON_SET = (motyw, h, n, b, r, p, a, t) => [
  { base: `Topór ${motyw}`, slot: 'bron', wtype: 'dwureczna', hands: 2 },
  { base: `Młot ${motyw}`, slot: 'bron', wtype: 'dwureczna', hands: 2 },
  { base: `Miecz ${motyw}`, slot: 'bron', wtype: 'jednoreczna', hands: 1 },
  { base: `Różdżka ${motyw}`, slot: 'bron', wtype: 'magiczne', hands: 1 },
  { base: `Łuk ${motyw}`, slot: 'bron', wtype: 'dystansowe', hands: 2 },
  ...PANCERZ(h, n, b, r, p, a, t),
];

// ---------------------------------------------------------------- PROFESJE 1–100
// Rudy są jedynym źródłem tej drabinki. Kryształy runiczne pozostają osobnymi
// celami Górnictwa, bo zasilają istniejący RuneCrafting.
const MINING_ORES = [
  { id: 'miedz', label: 'Miedź', lvl: 1, xp: 8, ms: 3000, gems: ['topaz'] },
  { id: 'zelazo', label: 'Żelazo', lvl: 10, xp: 20, ms: 3800, gems: ['topaz', 'szafir'] },
  { id: 'wegiel', label: 'Węgiel', lvl: 20, xp: 34, ms: 4500, gems: ['szafir', 'szmaragd'] },
  { id: 'srebro', label: 'Srebro', lvl: 30, xp: 52, ms: 5200, gems: ['szafir', 'szmaragd', 'rubin'] },
  { id: 'zloto', label: 'Złoto', lvl: 40, xp: 74, ms: 5900, gems: ['szmaragd', 'rubin', 'diament'] },
  { id: 'mithril', label: 'Mithril', lvl: 50, xp: 100, ms: 6600, gems: ['rubin', 'diament', 'ametyst'] },
  { id: 'adamantyt', label: 'Adamantyt', lvl: 60, xp: 132, ms: 7300, gems: ['diament', 'ametyst', 'onyks'] },
  { id: 'runite', label: 'Runite', lvl: 70, xp: 170, ms: 8000, gems: ['ametyst', 'onyks', 'mistycznyklejnot'] },
  { id: 'mistycznaruda', label: 'Mistyczna ruda', lvl: 80, xp: 214, ms: 8800, gems: ['onyks', 'mistycznyklejnot'] },
  { id: 'niebianskaruda', label: 'Niebiańska ruda', lvl: 90, xp: 265, ms: 9600, gems: ['mistycznyklejnot', 'boskiklejnot'] },
].map(x => ({ ...x, kind: 'ore', category: 'ore' }));

const SMITH_TIERS = [
  { id: 'miedz', label: 'Miedziany', lvl: 1, ore: 'miedz', bar: 'sztabamiedzi', coal: 0, power: 1.00 },
  { id: 'zelazo', label: 'Żelazny', lvl: 10, ore: 'zelazo', bar: 'sztabazelaza', coal: 0, power: 1.16 },
  { id: 'stal', label: 'Stalowy', lvl: 20, ore: 'zelazo', bar: 'stal', coal: 1, power: 1.34 },
  { id: 'srebro', label: 'Srebrny', lvl: 30, ore: 'srebro', bar: 'sztabasrebra', coal: 1, power: 1.55 },
  { id: 'zloto', label: 'Złoty', lvl: 40, ore: 'zloto', bar: 'sztabazlota', coal: 1, power: 1.79 },
  { id: 'mithril', label: 'Mithrilowy', lvl: 50, ore: 'mithril', bar: 'sztabamithril', coal: 2, power: 2.08 },
  { id: 'adamantyt', label: 'Adamantytowy', lvl: 60, ore: 'adamantyt', bar: 'sztabaadamantytu', coal: 2, power: 2.42 },
  { id: 'runite', label: 'Runiczny', lvl: 70, ore: 'runite', bar: 'sztabaruniczna', coal: 3, power: 2.82 },
  { id: 'mistyczny', label: 'Mistyczny', lvl: 80, ore: 'mistycznaruda', bar: 'sztabamistyczna', coal: 4, power: 3.30 },
  { id: 'niebianski', label: 'Niebiański', lvl: 90, ore: 'niebianskaruda', bar: 'sztabaniebianska', coal: 5, power: 3.88 },
];

const BAR_NAMES = {
  sztabamiedzi: 'Sztaba miedzi', sztabazelaza: 'Sztaba żelaza', stal: 'Stal',
  sztabasrebra: 'Sztaba srebra', sztabazlota: 'Sztaba złota', sztabamithril: 'Sztaba mithrilu',
  sztabaadamantytu: 'Sztaba adamantytu', sztabaruniczna: 'Sztaba runiczna',
  sztabamistyczna: 'Sztaba mistyczna', sztabaniebianska: 'Sztaba niebiańska',
};

const SMITH_RECIPES = SMITH_TIERS.flatMap((t, index) => {
  const cap = n => Math.min(100, t.lvl + n);
  const smeltCost = { [t.ore]: 3 };
  // Węgiel nie leży już luzem obok receptury. Najpierw trafia do Pieca,
  // a każdy zakończony wytop pobiera paliwo z jego zasobnika. Pierwsze dwa
  // metale również potrzebują żaru; wyższe tiery zachowują dotychczasową skalę.
  const fuel = Math.max(1, t.coal);
  const bonus = n => Math.round(n * t.power * 10) / 1000;
  return [
    { id: t.bar, label: BAR_NAMES[t.bar], category: 'smelting', lvl: t.lvl, xp: 12 + index * 13,
      ms: 3600 + index * 350, koszt: smeltCost, fuel, output: { type: 'material', id: t.bar } },
    { id: `${t.id}_mining_gloves`, label: `${t.label} rękawice górnicze`, category: 'mining', lvl: cap(2), xp: 24 + index * 17,
      ms: 5200 + index * 400, koszt: { [t.bar]: 5 }, output: { type: 'mining', slot: 'gloves', bonuses: { doubleOre: bonus(2.5) } } },
    { id: `${t.id}_mining_boots`, label: `${t.label} buty górnicze`, category: 'mining', lvl: cap(4), xp: 28 + index * 18,
      ms: 5400 + index * 400, koszt: { [t.bar]: 6 }, output: { type: 'mining', slot: 'boots', bonuses: { miningXp: bonus(3) } } },
    { id: `${t.id}_mining_helmet`, label: `${t.label} hełm górniczy`, category: 'mining', lvl: cap(6), xp: 32 + index * 19,
      ms: 5600 + index * 400, koszt: { [t.bar]: 7 }, output: { type: 'mining', slot: 'helmet', bonuses: { gemFind: bonus(3) } } },
    { id: `${t.id}_sword`, label: `${t.label} miecz`, category: 'weapons', lvl: cap(8), xp: 38 + index * 20,
      ms: 6200 + index * 450, koszt: { [t.bar]: 10 }, output: { type: 'combat', slot: 'bron', wtype: 'jednoreczna', hands: 1, base: `${t.label} miecz`, power: t.power } },
    { id: `${t.id}_mining_chest`, label: `${t.label} kaftan górniczy`, category: 'mining', lvl: cap(9), xp: 42 + index * 21,
      ms: 6400 + index * 450, koszt: { [t.bar]: 10 }, output: { type: 'mining', slot: 'chest', bonuses: { rareGemFind: bonus(2) } } },
    { id: `${t.id}_mining_legs`, label: `${t.label} spodnie górnicze`, category: 'mining', lvl: cap(10), xp: 44 + index * 22,
      ms: 6500 + index * 450, koszt: { [t.bar]: 10 }, output: { type: 'mining', slot: 'legs', bonuses: { doubleGem: bonus(1.5) } } },
    { id: `${t.id}_pickaxe`, label: `${t.label} kilof`, category: 'mining', lvl: cap(10), xp: 50 + index * 24,
      ms: 7000 + index * 500, koszt: { [t.bar]: 15 }, output: { type: 'mining', slot: 'pickaxe', bonuses: { miningSpeed: bonus(10) } } },
    { id: `${t.id}_chest`, label: `${t.label} napierśnik`, category: 'armor', lvl: cap(10), xp: 48 + index * 23,
      ms: 6800 + index * 480, koszt: { [t.bar]: 14 }, output: { type: 'combat', slot: 'napiersnik', base: `${t.label} napierśnik`, power: t.power } },
  ];
});

SMITH_RECIPES.push({
  id: 'straznik_cierni', label: 'Ostrze Strażnika Cierni', category: 'special', lvl: 60, xp: 300, ms: 12000,
  special: true, koszt: { sztabamithril: 12, rubin: 2, cierniowyrdzen: 1 },
  output: { type: 'combat', slot: 'bron', wtype: 'jednoreczna', hands: 1,
            base: 'Ostrze Strażnika Cierni', power: 2.7, rarity: 'unique' },
});

export const CONFIG = {

  // ---------- WALKA ----------
  combat: {
    tickMs: 100,              // rozdzielczość symulacji
    // ---- PRĘDKOŚĆ I ATTACK SPEED ----
    // Silnik liczy w `speed` (odstęp = speedToInterval / speed). Gracz widzi
    // ATTACK SPEED: ILE CIOSÓW NA SEKUNDĘ, jedna liczba dla wszystkich —
    // bohatera, sojuszników, petów i mobów. AS = speed / 20.
    //   speed 100 → AS 5,00   ·   speed 129 → AS 6,45   ·   speed 200 → AS 10,00
    // Dzięki temu widać wprost, kto uderzy ile razy, zanim padnie drugi.
    baseSpeed: 100,           // prędkość odniesienia; AS 5,00
    speedToInterval: 20000,   // odstęp_ms = speedToInterval / speed
    // Długa komnata Dungeonu może mieć kilkadziesiąt posiłków. Limit dalej
    // zatrzymuje zapętlone buildy, ale nie urywa prawidłowego grindu w połowie.
    maxTurns: 2400,
    damageTypes: {
      slash:  { label: 'Slash',  pl: 'Cięcie',       ic: '⚔' },
      smash:  { label: 'Crush',  pl: 'Zmiażdżenie',  ic: '◆' },
      pierce: { label: 'Pierce', pl: 'Przebicie',    ic: '➶' },
      magic:  { label: 'Magia',  pl: 'Magia',        ic: '✦' },
    },
    resistanceMin: -0.50,
    resistanceMax: 0.60,
    critBase: 0.05,           // 5% bazowej szansy na kryta
    critMultBase: 1.5,
    // Redukcja = armor / (armor + K), a K ROŚNIE Z PIĘTREM.
    // Stałe K=400 sprawiało, że pancerz z piętra 50 zbijał 79% obrażeń,
    // a z piętra 10 tylko 45% — gracz uciekał wieży bezpowrotnie.
    // Zmierzone: przy stałym K bohater na piętrze 50 wytrzymywał 66 tur,
    // a na piętrze 10 dwadzieścia pięć.
    armorKBase: 250, armorKPerFloor: 45,
    // MODEL PANCERZA. 'reduction' = stary armor/(armor+K), żywy w grze.
    // 'barrier' = nowy: pancerz to druga pula życia, którą trzeba przebić,
    //   zanim cios sięgnie HP. Przebicie omija pulę, Zmiażdżenie łamie ją
    //   szybciej, Magia idzie po odporności na magię z pominięciem puli.
    //   Trzymamy 'reduction' do czasu przeliczenia balansu bariery.
    armorModel: 'barrier',
    crushVsArmorMult: 1.3,    // Zmiażdżenie zdejmuje pulę pancerza o tyle szybciej
    // PULA PANCERZA (model 'barrier'). Cel: pula ≈ połowa HP, żeby przebicie
    // realnie ważyło na całej skali. Moby wyprowadzają pulę z HP (armor liniowy
    // gubił się przy kwadratowym HP). Gracz — z pancerza sprzętu × mnożnik, żeby
    // pełny zestaw sięgał ~0,5× HP, a golec/mag w płótnie był miękki.
    barrierMobArmorRatio: 0.5,
    barrierPlayerArmorMult: 2.0,
    // Boss jest już ścianą HP (×7). Pełna pula 0,5× zrobiłaby z pewnego fightu
    // loterię, więc bossowie i kolosy dostają mniejszą pulę.
    barrierBossArmorRatio: 0.25,
    // Pancerz bohatera i jego drużyny po 25 poziomie stopniowo liczy się
    // mocniej, do +25% na poziomie 100. Początek Wieży zostaje bez buffa,
    // a Obrona nie przegrywa z rosnącym K w endgame.
    playerArmorEffectMult: 1.25,
    playerArmorEffectStartLevel: 25,
    playerArmorEffectFullLevel: 100,

    // Siła ciosu — wybierana co turę w walce turowej.
    // Mocniej znaczy rzadziej. To jest cała decyzja tury.
    strengths: {
      lekki:   { label: 'Lekki',  dmg: 0.60, acc: +0.22 },
      // ŚREDNI ZOSTAJE NA 1,00 I TO NIE JEST ZANIEDBANIE. Jest miarą, do której
      // porównują się dwa pozostałe, a automat bije właśnie nim — podniesienie
      // go do 1,15 wywindowało szansę na bossa 10 z 70% na 90%, a na piętro 50
      // z 46% na 75%. Żeby to odkręcić, trzeba by dodać mobom te same 15%
      // i wyszłoby dokładnie to samo, tylko na większych liczbach.
      srednio: { label: 'Średni', dmg: 1.00, acc:  0.00 },
      // MOCNY MA BOLEĆ RYZYKIEM. Przy zerowej Zręczności trafia w 15% —
      // dopiero Zręczność robi z niego realną opcję (+0,4 pp za punkt).
      //
      // MNOŻNIK PODNIESIONY Z 1,75 NA 2,60 Z POWODU, KTÓRY DA SIĘ POLICZYĆ:
      // przy 1,75 Mocny był GORSZY OD ŚREDNIEGO NA KAŻDYM ETAPIE GRY —
      // 0,54× na piętrze 10 i wciąż 0,75× przy 87 Zręczności na piętrze 50.
      // Czyli nie ryzyko, tylko pułapka. Przy 2,60 wychodzi na prowadzenie
      // dopiero powyżej ~80 Zręczności i to jest cała jego rola.
      mocno:   { label: 'Mocny',  dmg: 2.60, acc: -0.55 },
    },
    accuracyMin: 0.10,        // nigdy nie jest beznadziejnie
    accuracyMax: 0.97,        // i nigdy pewnie

    // Blok — wymaga tarczy w drugiej ręce. Szansę podnosi drzewko klasy.
    blockChanceShield: 0.10,  // sama tarcza daje tyle
    blockCut: 0.50,           // zablokowany cios traci połowę obrażeń
    blockChanceMax: 0.60,

    // Obrona — akcja tury. Oddajesz cios, dostajesz o tyle mniej do swojej
    // następnej tury. Sensowna tylko tam, gdzie tury są, czyli u bossa.
    defendCut: 0.50,

  },

  // ---------------------------------------------------------------- UMIEJĘTNOŚCI
  // Docelowo wychodzone w drzewku. Na razie wszystkie dostępne od startu.
  abilities: {
    okrzyk: {
      label: 'Okrzyk bojowy', cd: 5, target: 'self',
      desc: 'Pancerz −20%, obrażenia +20% przez 3 tury.',
      buff: { id: 'okrzyk', turns: 3, dmgMult: 1.20, armorMult: 0.80 },
    },
    wir: {
      label: 'Wir', cd: 3, target: 'all',
      desc: 'Trzy ciosy po 60% obrażeń we wszystkich przeciwników.',
      hits: 3, dmgMult: 0.60,
    },
    // ---- ZAKLĘCIA ----
    // Zaklęcie odpalasz, gdy spełnisz DWA warunki:
    //   1. masz PODPIĘTĄ esencję jego żywiołu (RuneCrafting ją wykuwa)
    //   2. Twój skill bojowy MAGIA jest na dość wysokim poziomie
    //
    // Dlatego pierwszy czar to Fireball na poziomie 1 — wystarczy podpiąć
    // Esencję Ognia. Reszta przychodzi z expem w Magii.
    fireball: {
      label: 'Fireball', cd: 3, mana: 8, target: 'one',
      czar: { runa: 'runaognia', magia: 1 },
      desc: '210% obrażeń w jeden cel. Ignoruje jedną trzecią pancerza.',
      dmgMult: 2.10, armorPierce: 0.33,
    },
    pozoga: {
      label: 'Pożoga', cd: 5, mana: 18, target: 'all',
      czar: { runa: 'runaognia', magia: 8 },
      desc: 'Trzy uderzenia po 130% we wszystkich przeciwników.',
      hits: 3, dmgMult: 1.30,
    },
    falachlodu: {
      label: 'Fala Chłodu', cd: 5, mana: 12, target: 'self',
      czar: { runa: 'runamrozu', magia: 1 },
      desc: 'Leczy 25% zdrowia i zbija otrzymywane obrażenia o 15% na 3 tury.',
      heal: 0.25, buff: { id: 'falachlodu', turns: 3, takenMult: 0.85 },
    },
    kamiennaskora: {
      label: 'Kamienna Skóra', cd: 5, mana: 10, target: 'self',
      czar: { runa: 'runaziemi', magia: 1 },
      desc: 'Pancerz +60% przez 4 tury.',
      buff: { id: 'kamiennaskora', turns: 4, armorMult: 1.60 },
    },
    podmuch: {
      label: 'Podmuch', cd: 4, mana: 14, target: 'all',
      czar: { runa: 'runawichru', magia: 1 },
      desc: 'Cztery uderzenia po 70% obrażeń we wszystkich.',
      hits: 4, dmgMult: 0.70,
    },
    burzazywiolow: {
      label: 'Burza Żywiołów', cd: 6, mana: 26, target: 'all',
      czar: { runa: 'runapradawna', magia: 5 },
      desc: 'Trzy uderzenia po 210% we wszystkich. Wymaga Runy Pradawnej.',
      hits: 3, dmgMult: 2.10,
    },

    // PROWOKACJA — narzędzie tanka. Ściąga uwagę wroga na siebie i zatrzymuje
    // go w miejscu: sprowokowany bije w Ciebie, a nie idzie dalej po maga.
    prowokacja: {
      label: 'Prowokacja', cd: 4, target: 'self',
      desc: 'Wrogowie biją w Ciebie przez 3 tury i przestają podchodzić. Pancerz +30%.',
      taunt: 3,
      buff: { id: 'prowokacja', turns: 3, armorMult: 1.30 },
    },

    ogluszenie: {
      label: 'Cios ogłuszający', cd: 4, target: 'one',
      desc: '150% obrażeń, 50% szans na ogłuszenie. Ogłuszony traci turę i obrywa krytyki 2× częściej.',
      dmgMult: 1.50, stun: 0.50, stunTurns: 1, stunCritMult: 2.0,
    },
  },

  // ULTIMATE I PASEK ŁADOWANIA SKASOWANE. Pasek istniał wyłącznie po to,
  // żeby napędzać ultimate — bez niego był licznikiem bez treści.
  // Umiejętności chodzą na cooldownach, zaklęcia na manie. Dwa zasoby wystarczą.

  // ---------- LECZENIE ----------
  healing: {
    decayPerUse: 0.10,        // każde kolejne leczenie o 10% słabsze
    decayLinear: true,        // true = 100/90/80, false = 100/90/81
    minEffect: 0.10,          // podłoga — leczenie nigdy nie schodzi poniżej 10%
    autoThreshold: 0.30,      // automat leczy poniżej 30% HP
    startingPotions: 5,       // ile Słabych Mikstur dostaje świeża postać
    potionHealPct: 0.35,      // ZOSTAJE dla starych zapisów — patrz `mikstury`

    // ---- MIKSTURY ----
    // Dziewięć rodzajów w dwóch rodzinach:
    //   pct   leczy PROCENT maksymalnego zdrowia — skaluje się z postacią
    //   flat  leczy STAŁĄ liczbę punktów — mocne wcześnie, słabnie później
    // Kolejność listy to kolejność siły i tak samo idzie drabinka Alchemii.
    // Automat wybiera NAJSŁABSZĄ, która wystarczy — inaczej Eliksir Otchłani
    // szedłby na zadrapanie.
    mikstury: [
      { id: 'm10',   label: 'Słaba Mikstura',    pct: 0.10 },
      { id: 'm15',   label: 'Mikstura',          pct: 0.15 },
      { id: 'm25',   label: 'Mocna Mikstura',    pct: 0.25 },
      { id: 'm35',   label: 'Wielka Mikstura',   pct: 0.35 },
      { id: 'm50',   label: 'Pełna Mikstura',    pct: 0.50 },
      { id: 'e200',  label: 'Eliksir Krwi',      flat: 200 },
      { id: 'e500',  label: 'Eliksir Życia',     flat: 500 },
      { id: 'e1000', label: 'Eliksir Odnowy',    flat: 1000 },
      { id: 'e2500', label: 'Eliksir Otchłani',  flat: 2500 },
    ],
    startowa: 'm10',          // co dostaje świeża postać
    domyslna: 'm35',          // na to migrują stare zapasy z jednego licznika
    // Ile mikstur wolno ZABRAĆ ze sobą. Wieża jest wypadem na chwilę, wyprawa
    // wyjściem na długo — stąd różnica. Leczyć się poza walką możesz bez limitu,
    // limit dotyczy tego, co masz przy sobie w trakcie.
    carryTower: 3,
    carryExpedition: 10,
  },

  // ---------- POSTAĆ ----------
  character: {
    baseDamage: 6,            // gołe pięści — żeby nigdy nie zejść do zera
    startHp: 120,
    hpPerStamina: 16,
    // Po 25 poziomie każdy kolejny wzmacnia wkład Wytrzymałości w HP o 1,25%,
    // maksymalnie do ×3. Dzięki temu skala nadąża po 100 poziomie, ale nie
    // ułatwia startowej Wieży. Poziom 126 daje około ×2,26.
    hpStaminaGrowthStartLevel: 25,
    hpStaminaGrowthPerLevel: 0.0125,
    hpStaminaGrowthMax: 3,
    hpPerLevel: 12,
    attrPointsPerFloor: 3,
    // Postać startuje z pustymi atrybutami i workiem punktów — pierwsza decyzja
    // gracza to jego build, a nie cudza rozpiska.
    // SIEDEM ATRYBUTÓW. Siła (mele), Precyzja (dystans), Intelekt (magia),
    // Zręczność (AS + unik), Szczęście (kryt), Witalność (HP + regen),
    // „Atak" nie jest atrybutem — to wynik.
    startingAttrs: { sila: 0, precyzja: 0, intelekt: 0, zrecznosc: 0,
                     szczescie: 0, witalnosc: 0 },
    startingAttrPoints: 10,
    // mnożniki: (1 + atrybut / dzielnik)
    strDamageDivisor: 100,    // Siła → obrażenia bronią mele
    intMagicDivisor: 100,     // Intelekt → obrażenia magiczne
    agiDamageDivisor: 130,    // Zręczność → obrażenia z dystansu
                              // wyższy dzielnik, bo Zręczność daje też prędkość i kryt
    agiSpeedDivisor: 200,
    agiCritDivisor: 500,      // +0.2% kryta za punkt
    staArmorPerPoint: 2,
    // ---- SKALOWANIE OD BRONI ----
    // Broń decyduje, KTÓRY atrybut niesie obrażenia:
    //   biała → Siła · dystans → Zręczność · magia → Intelekt
    // Autoatak różdżką zadaje obrażenia MAGICZNE i rośnie z Intelektu.
    //
    // Pozostałe atrybuty liczą się nadal, tylko słabiej (offAttrWeight).
    // To pokrętło pilnuje, żeby nie wrócił martwy drop: przy 0 dostajemy czyste
    // skalowanie od broni i pierścień z Intelektem staje się śmieciem dla wojownika.
    // Rodzina broni decyduje, KTÓRY atrybut niesie obrażenia. Klucze to te same
    // identyfikatory, co skille bojowe — jedna nazwa, jedno miejsce.
    weaponAttr: { dwureczna: 'sila', jednoreczna: 'sila',
                  dystansowe: 'precyzja', magiczne: 'intelekt' },
    offAttrWeight: 0.35,
    // Witalność: regeneracja HP na turę = tyle × punktów Witalności.
    hpRegenPerVit: 0.5,

    // ---- MANA ----
    // Zaklęcia kosztują manę, nie ładunki paska. Pasek zostaje dla umiejętności
    // zwykłych i ultimate — dwa zasoby, dwie osie decyzji.
    manaBase: 20,
    manaPerInt: 3,
    manaRegenPerTurn: 2,      // ile many wraca na każdą Twoją turę

    accuracyBase: 0.70,       // celność bazowa
    accuracyPerAgi: 0.004,    // +0.4 punktu procentowego za punkt Zręczności
    evasionPerAgi: 0.002,     // unik: szansa, że wróg spudłuje
    evasionMax: 0.45,
  },

  // ---------- KLASY ----------
  // Sześć klas z dokumentu projektowego. Obrażenia skalują się z atrybutami KLASY
  // (wagi w dmgAttrs), nie z typu trzymanej broni — inaczej trzy klasy mieszane
  // nie mają jak istnieć, bo silnik zna tylko jeden atrybut na styl walki.
  //
  // Warstwa uniwersalna zostaje wspólna: Zręczność daje prędkość, kryt, celność
  // i unik KAŻDEMU, Wytrzymałość daje HP i pancerz KAŻDEMU. Klasa decyduje wyłącznie
  // o tym, z czego rosną obrażenia.
  //
  // dmgAttrs: atrybuty, z których rosną obrażenia. Każdy liczy się W PEŁNI —
  // klasa mieszana nie musi rozwijać obu, tylko może wybrać ten, który jej wypadł
  // ze sprzętu. Liczenie po połowie robiło z mieszanych klasy gorsze o 37% przy
  // tej samej liczbie punktów, co jest karą, nie wyborem.
  //
  // dmgDivisor: cena za tę elastyczność — mnożnik: (1 + suma atrybutów / dzielnik).
  // Czysta Siła i czysty Intelekt mają 100, czysta Zręczność 130 (bo daje przy okazji
  // prędkość, kryt i unik), mieszane siedzą pomiędzy plus podatek za dwie ścieżki.
  classes: {
    // GRACZ NIE WYBIERA KLASY. Główna postać ma jeden stały profil i to jest
    // decyzja trwała — klasy przeszły do Sojuszników. Bohater liczy wszystkie
    // trzy atrybuty ofensywne w pełni, płacąc za to nieco wyższym dzielnikiem.
    //
    // Skutek uboczny, który akurat jest zyskiem: znika martwy drop. Afiks Siły,
    // Intelektu i Zręczności daje obrażenia każdemu, więc żadna broń ani
    // pierścień nie są z góry śmieciem.
    bohater: {
      label: 'Bohater', dmgAttrs: ['sila', 'precyzja', 'intelekt'], dmgDivisor: 110,
      bronie: 'wszystko, co uniesiesz',
      opis: 'Główna postać. Nie ma klasy i nie będzie jej miała — buduje się atrybutami, sprzętem i drzewkiem.',
      startWeapon: 'Wyszczerbiony Topór', startWtype: 'dwureczna',
    },

    // ---- PONIŻEJ: klasy Sojuszników. Gracz ich NIE wybiera. ----
    // Zostają w configu, bo drzewka i skalowanie są policzone i przetestowane.
    // Wejdą, gdy Sojusznicy zaczną walczyć.
    wojownik: {
      label: 'Wojownik', dmgAttrs: ['sila'], dmgDivisor: 100,
      bronie: 'miecz, młot, topór — dwuręczne',
      opis: 'Najprostsza droga w górę wieży. Cała Siła idzie w obrażenia, nic nie dzieli mu uwagi. Wytrzymałość dokłada HP i pancerz, więc znosi więcej błędów niż ktokolwiek inny.',
      startWeapon: 'Wyszczerbiony Topór', startWtype: 'dwureczna',
    },
    paladyn: {
      label: 'Paladyn', dmgAttrs: ['sila', 'intelekt'], dmgDivisor: 115,
      bronie: 'jednoręczna broń i tarcza',
      opis: 'Obrażenia rosną mu i z Siły, i z Intelektu, więc nosi sprzęt, który czysta klasa by wyrzuciła. Płaci za to niższym zyskiem z pojedynczego punktu. Tarcza w drugiej ręce dokłada pancerz zamiast obrażeń.',
      startWeapon: 'Stępiony Miecz', startWtype: 'jednoreczna',
      startOffhand: 'Drewniana Tarcza', startOffWtype: 'tarcza',
    },
    lowca: {
      label: 'Łowca', dmgAttrs: ['zrecznosc'], dmgDivisor: 130,
      bronie: 'łuk, kusza, oszczep',
      opis: 'Jedyna klasa, której główny atrybut robi wszystko naraz: Zręczność daje mu obrażenia, prędkość ciosu, celność i unik. Płaci za to niższym mnożnikiem obrażeń z punktu.',
      startWeapon: 'Nadwątlony Łuk', startWtype: 'dystansowe',
    },
    tropiciel: {
      label: 'Tropiciel', dmgAttrs: ['zrecznosc', 'intelekt'], dmgDivisor: 125,
      bronie: 'broń dwuczłonowa — nośnik i żywioł',
      opis: 'Dystans podszyty żywiołem: obrażenia rosną i ze Zręczności, i z Intelektu. Zręczność dokłada mu przy okazji prędkość, celność i unik, więc rzadko bywa zmarnowana.',
      startWeapon: 'Okuty Oszczep', startWtype: 'dystansowe',
    },
    mag: {
      label: 'Mag', dmgAttrs: ['intelekt'], dmgDivisor: 100,
      bronie: 'różdżka, orb, księga',
      opis: 'Najwięcej obrażeń z jednego punktu atrybutu. Intelekt nie daje jednak ani HP, ani uniku, ani celności — Mag, który wsypał wszystko w obrażenia, umiera od dwóch ciosów.',
      startWeapon: 'Pęknięta Różdżka', startWtype: 'magiczne',
    },
    tancerz: {
      label: 'Tancerz Ostrzy', dmgAttrs: ['zrecznosc', 'sila'], dmgDivisor: 125,
      bronie: 'dwie bronie jednoręczne',
      opis: 'Liczy się i Zręczność, i Siła, a druga broń dokłada własne obrażenia zamiast pancerza tarczy. Szybki i celny, ale bez tarczy obrywa wszystko, czego nie zdąży uniknąć.',
      startWeapon: 'Szczerbaty Kordelas', startWtype: 'jednoreczna',
      startOffhand: 'Krótkie Ostrze', startOffWtype: 'jednoreczna',
    },
  },

  // ---------- DRZEWKA KLAS ----------
  // Trzy gałęzie na klasę, pięć węzłów w gałęzi, każdy węzeł do rangi 5.
  // Węzeł numer i wymaga i*2 punktów włożonych w TĘ gałąź — wyższe węzły są
  // nagrodą za wybranie ścieżki, a nie za posiadanie punktów.
  //
  // eff to wartość ZA JEDNĄ RANGĘ. Klucze:
  //   dmgPct/hpPct/armorPct  ułamek (0.03 = +3%)
  //   attrWeight             o ile mocniej liczy się ten atrybut w obrażeniach
  //   critChance/accuracy/evasion/block/blockCut   ułamek prawdopodobieństwa
  //   critPower/potionPct    ułamek
  //   speed/armorFlat        płaskie liczby
  // Opisy w UI generują się z tych liczb — nie ma drugiego miejsca do aktualizacji.
  tree: {
    nodeStep: 2,              // węzeł i wymaga i * nodeStep punktów w gałęzi
    rankMax: 5,
    respecBase: 150,          // reset drzewka: respecBase + respecPerLevel * poziom
    respecPerLevel: 25,
    classes: {
      // Drzewko gracza. Jedno, uniwersalne — bo gracz nie ma klasy.
      // Trzy gałęzie: bijesz mocniej, znosisz więcej, ruszasz się szybciej.
      bohater: [
        { id: 'sila', label: 'Siła', nodes: [
          { id: 'ostrze',    label: 'Ostrze',        eff: { dmgPct: 0.03 } },
          { id: 'nacisk',    label: 'Nacisk',        eff: { attrWeight: { sila: 0.03, intelekt: 0.03, zrecznosc: 0.03 } } },
          { id: 'rozmach',   label: 'Rozmach',       eff: { critPower: 0.06 } },
          { id: 'bezlitosci',label: 'Bez Litości',   eff: { dmgPct: 0.04 } },
          { id: 'egzekucja', label: 'Egzekucja',     eff: { critChance: 0.015 } },
        ] },
        { id: 'hart', label: 'Hart', nodes: [
          { id: 'skora',     label: 'Twarda Skóra',  eff: { armorPct: 0.05 } },
          { id: 'krzepa',    label: 'Krzepa',        eff: { hpPct: 0.04 } },
          { id: 'postawa',   label: 'Postawa',       eff: { armorFlat: 4 } },
          { id: 'zaparcie',  label: 'Zaparcie',      eff: { hpPct: 0.05 } },
          { id: 'wprawnat',  label: 'Wprawna Tarcza',eff: { block: 0.025 } },
        ] },
        { id: 'tempo', label: 'Tempo', nodes: [
          { id: 'tempo',     label: 'Tempo',         eff: { speed: 3 } },
          { id: 'zamach',    label: 'Zamach',        eff: { critChance: 0.010 } },
          { id: 'wprawa',    label: 'Wprawa',        eff: { accuracy: 0.015 } },
          { id: 'szal',      label: 'Szał',          eff: { speed: 4 } },
          { id: 'refleks',   label: 'Refleks',       eff: { evasion: 0.012 } },
        ] },
      ],

      // ---- PONIŻEJ: drzewka klas Sojuszników, jeszcze nieużywane. ----
      wojownik: [
        { id: 'rzeznia', label: 'Rzeźnia', nodes: [
          { id: 'ostrze',    label: 'Ostrze',        eff: { dmgPct: 0.03 } },
          { id: 'silacios',  label: 'Siła Ciosu',    eff: { attrWeight: { sila: 0.04 } } },
          { id: 'rozmach',   label: 'Rozmach',       eff: { critPower: 0.06 } },
          { id: 'bezlitosci',label: 'Bez Litości',   eff: { dmgPct: 0.04 } },
          { id: 'egzekucja', label: 'Egzekucja',     eff: { critChance: 0.015 } },
        ] },
        { id: 'wal', label: 'Wał', nodes: [
          { id: 'skora',     label: 'Twarda Skóra',  eff: { armorPct: 0.05 } },
          { id: 'krzepa',    label: 'Krzepa',        eff: { hpPct: 0.04 } },
          { id: 'postawa',   label: 'Postawa',       eff: { armorFlat: 4 } },
          { id: 'zaparcie',  label: 'Zaparcie',      eff: { hpPct: 0.05 } },
          { id: 'murciala',  label: 'Mur Ciała',     eff: { evasion: 0.010 } },
        ] },
        { id: 'furia', label: 'Furia', nodes: [
          { id: 'tempo',     label: 'Tempo',         eff: { speed: 3 } },
          { id: 'zamach',    label: 'Zamach',        eff: { critChance: 0.010 } },
          { id: 'wprawa',    label: 'Wprawa',        eff: { accuracy: 0.015 } },
          { id: 'szal',      label: 'Szał',          eff: { speed: 4 } },
          { id: 'nawyk',     label: 'Nawyk',         eff: { critPower: 0.08 } },
        ] },
      ],
      paladyn: [
        { id: 'swiatlo', label: 'Światło', nodes: [
          { id: 'iskrawiary',label: 'Iskra Wiary',   eff: { attrWeight: { intelekt: 0.05 } } },
          { id: 'namasz',    label: 'Namaszczenie',  eff: { potionPct: 0.08 } },
          { id: 'blask',     label: 'Blask',         eff: { dmgPct: 0.03 } },
          { id: 'modlitwa',  label: 'Modlitwa',      eff: { hpPct: 0.04 } },
          { id: 'objawienie',label: 'Objawienie',    eff: { attrWeight: { intelekt: 0.06 } } },
        ] },
        { id: 'zelazo', label: 'Żelazo', nodes: [
          { id: 'twardareka',label: 'Twarda Ręka',   eff: { attrWeight: { sila: 0.05 } } },
          { id: 'kuty',      label: 'Kuty Pancerz',  eff: { armorPct: 0.06 } },
          { id: 'ciezar',    label: 'Ciężar',        eff: { dmgPct: 0.03 } },
          { id: 'hart',      label: 'Hart',          eff: { hpPct: 0.04 } },
          { id: 'mlot',      label: 'Młot Sprawiedliwości', eff: { critPower: 0.07 } },
        ] },
        { id: 'mur', label: 'Mur', nodes: [
          { id: 'wprawnat',  label: 'Wprawna Tarcza',eff: { block: 0.025 } },
          { id: 'postobron', label: 'Postawa Obronna',eff: { blockCut: 0.03 } },
          { id: 'nieustep',  label: 'Nieustępliwość',eff: { block: 0.020 } },
          { id: 'odbicie',   label: 'Odbicie',       eff: { armorFlat: 5 } },
          { id: 'opoka',     label: 'Opoka',         eff: { block: 0.025 } },
        ] },
      ],
      lowca: [
        { id: 'lowy', label: 'Łowy', nodes: [
          { id: 'naciag',    label: 'Naciąg',        eff: { attrWeight: { zrecznosc: 0.05 } } },
          { id: 'grot',      label: 'Grot',          eff: { dmgPct: 0.035 } },
          { id: 'skupienie', label: 'Skupienie',     eff: { accuracy: 0.020 } },
          { id: 'smiertelny',label: 'Śmiertelny Strzał', eff: { critPower: 0.08 } },
          { id: 'seria',     label: 'Seria',         eff: { dmgPct: 0.04 } },
        ] },
        { id: 'trop', label: 'Trop', nodes: [
          { id: 'oko',       label: 'Sokole Oko',    eff: { critChance: 0.015 } },
          { id: 'cierpl',    label: 'Cierpliwość',   eff: { accuracy: 0.020 } },
          { id: 'znaczenie', label: 'Znaczenie',     eff: { critChance: 0.012 } },
          { id: 'slabypkt',  label: 'Słaby Punkt',   eff: { critPower: 0.06 } },
          { id: 'pewnareka', label: 'Pewna Ręka',    eff: { accuracy: 0.025 } },
        ] },
        { id: 'cien', label: 'Cień', nodes: [
          { id: 'krok',      label: 'Cichy Krok',    eff: { evasion: 0.012 } },
          { id: 'zwinnosc',  label: 'Zwinność',      eff: { speed: 4 } },
          { id: 'zmylka',    label: 'Zmyłka',        eff: { evasion: 0.010 } },
          { id: 'bieg',      label: 'Bieg',          eff: { speed: 5 } },
          { id: 'nieuchw',   label: 'Nieuchwytność', eff: { evasion: 0.012 } },
        ] },
      ],
      tropiciel: [
        { id: 'zywiol', label: 'Żywioł', nodes: [
          { id: 'iskra',     label: 'Iskra',         eff: { attrWeight: { intelekt: 0.05 } } },
          { id: 'zar',       label: 'Żar',           eff: { dmgPct: 0.035 } },
          { id: 'kaskada',   label: 'Kaskada',       eff: { attrWeight: { intelekt: 0.05 } } },
          { id: 'burza',     label: 'Burza',         eff: { critPower: 0.07 } },
          { id: 'nawalnica', label: 'Nawałnica',     eff: { dmgPct: 0.04 } },
        ] },
        { id: 'pulapki', label: 'Pułapki', nodes: [
          { id: 'sidla',     label: 'Sidła',         eff: { critChance: 0.014 } },
          { id: 'zasadzka',  label: 'Zasadzka',      eff: { dmgPct: 0.03 } },
          { id: 'kolce',     label: 'Kolce',         eff: { armorFlat: 4 } },
          { id: 'wnyki',     label: 'Wnyki',         eff: { critChance: 0.012 } },
          { id: 'potrzask',  label: 'Potrzask',      eff: { critPower: 0.07 } },
        ] },
        { id: 'puszcza', label: 'Puszcza', nodes: [
          { id: 'wytrwalosc',label: 'Wytrwałość',    eff: { hpPct: 0.045 } },
          { id: 'kora',      label: 'Kora',          eff: { armorPct: 0.05 } },
          { id: 'czujnosc',  label: 'Czujność',      eff: { evasion: 0.010 } },
          { id: 'sciezka',   label: 'Ścieżka',       eff: { speed: 3 } },
          { id: 'instynkt',  label: 'Instynkt',      eff: { accuracy: 0.020 } },
        ] },
      ],
      mag: [
        { id: 'ogien', label: 'Ogień', nodes: [
          { id: 'plomien',   label: 'Płomień',       eff: { attrWeight: { intelekt: 0.05 } } },
          { id: 'podpalenie',label: 'Podpalenie',    eff: { dmgPct: 0.04 } },
          { id: 'wybuch',    label: 'Wybuch',        eff: { critPower: 0.08 } },
          { id: 'pozoga',    label: 'Pożoga',        eff: { dmgPct: 0.045 } },
          { id: 'kataklizm', label: 'Kataklizm',     eff: { attrWeight: { intelekt: 0.06 } } },
        ] },
        { id: 'lod', label: 'Lód', nodes: [
          { id: 'tafla',     label: 'Tafla',         eff: { armorPct: 0.06 } },
          { id: 'zimnakrew', label: 'Zimna Krew',    eff: { hpPct: 0.05 } },
          { id: 'szron',     label: 'Szron',         eff: { evasion: 0.012 } },
          { id: 'lodowaskora',label: 'Lodowa Skóra', eff: { armorFlat: 5 } },
          { id: 'zamiec',    label: 'Zamieć',        eff: { hpPct: 0.05 } },
        ] },
        { id: 'arkana', label: 'Arkana', nodes: [
          { id: 'precyzja',  label: 'Precyzja',      eff: { accuracy: 0.020 } },
          { id: 'ognisko',   label: 'Ognisko Mocy',  eff: { critChance: 0.015 } },
          { id: 'kanal',     label: 'Kanał',         eff: { potionPct: 0.10 } },
          { id: 'rezonans',  label: 'Rezonans',      eff: { speed: 3 } },
          { id: 'splot',     label: 'Splot',         eff: { critPower: 0.07 } },
        ] },
      ],
      tancerz: [
        { id: 'taniec', label: 'Taniec', nodes: [
          { id: 'krokwbok',  label: 'Krok w Bok',    eff: { speed: 4 } },
          { id: 'rytm',      label: 'Rytm',          eff: { speed: 4 } },
          { id: 'wirowanie', label: 'Wirowanie',     eff: { critChance: 0.012 } },
          { id: 'plynnosc',  label: 'Płynność',      eff: { accuracy: 0.020 } },
          { id: 'final',     label: 'Finał',         eff: { speed: 5 } },
        ] },
        { id: 'ostrza', label: 'Ostrza', nodes: [
          { id: 'podwojne',  label: 'Podwójne Cięcie', eff: { dmgPct: 0.04 } },
          { id: 'zrecznareka',label: 'Zręczna Ręka', eff: { attrWeight: { zrecznosc: 0.05 } } },
          { id: 'nadgarstek',label: 'Siła Nadgarstka', eff: { attrWeight: { sila: 0.05 } } },
          { id: 'rozciecie', label: 'Rozcięcie',     eff: { critPower: 0.07 } },
          { id: 'krwawy',    label: 'Krwawy Taniec', eff: { dmgPct: 0.04 } },
        ] },
        { id: 'unik', label: 'Unik', nodes: [
          { id: 'piruet',    label: 'Piruet',        eff: { evasion: 0.013 } },
          { id: 'lekkosc',   label: 'Lekkość',       eff: { evasion: 0.012 } },
          { id: 'refleks',   label: 'Refleks',       eff: { critChance: 0.012 } },
          { id: 'cienostrza',label: 'Cień Ostrza',   eff: { armorPct: 0.04 } },
          { id: 'nietykalny',label: 'Nietykalny',    eff: { evasion: 0.013 } },
        ] },
      ],
    },
  },

  // SKILLE BOJOWE SKASOWANE. Atak, Dystansowy, Magia, Obrona i Zdrowie zniknęły —
  // sprzęt bramkuje sam poziom postaci (= najwyższe zdobyte piętro), a specjalizację
  // przejmuje drzewko klasy. Nie przywracaj ich bez potrzeby: były drugą bramką
  // na ten sam sprzęt i drugim paskiem expa obok pięter.

  // ---------- KOLOS ----------
  // Pierwszy przeciwnik spoza wieży. Nie ma pięter, fal ani postępu — stoi
  // i czeka, a Ty przychodzisz tylko wtedy, gdy uważasz, że dasz radę.
  //
  // LICZBY SĄ Z ZAŁOŻENIA POZA SKALĄ. Bohater w legendach z piętra 50 ma
  // około 2 700 ataku; przez 15 000 pancerza przechodzi mu z tego ułamek,
  // więc 500 000 zdrowia to grubo ponad tysiąc ciosów. To jest cel na później,
  // nie zawartość na dziś — i UI mówi o tym wprost, zamiast udawać.
  kolos: {
    id: 'yeti',
    label: 'Yeti Zmarzniętych Turni',
    ic: '🧊',
    obraz: '/img/yeti.png',      // ZAŚLEPKA — podmień plik, nic więcej nie trzeba
    unlockFloor: 10,             // widoczny po pierwszym bossie wieży
    opis: 'Powyżej ostatniego piętra, którego ktokolwiek dotknął, wiatr niesie '
        + 'coś cięższego niż śnieg. Yeti nie pilnuje skarbu i nie strzeże przejścia — '
        + 'on tam po prostu jest, od zawsze, i nie zauważył jeszcze, że ktoś przyszedł. '
        + 'Pierwsze uderzenie łapy zabiera więcej, niż większość wędrowców ma w sobie życia. '
        + 'Drugie przychodzi, zanim zdążysz odzyskać oddech.',
    ostrzezenie: 'Bije DWA RAZY w jednej turze i ogłusza na dwie tury. Ogłuszony nie robisz nic.',
    hp: 500000,
    damage: 10000,
    armor: 15000,
    speed: 85,
    ataki: 2,                    // dwa ciosy pod rząd
    skills: ['zamach'],          // Zamach Kolosa: pewne ogłuszenie na 2 tury
    poziom: 60,                  // skala pancerza tej walki
    // Nagroda za PIERWSZE zwycięstwo. Kolejne oddają złoto.
    nagroda: {
      base: 'Różdżka Lodowa', slot: 'bron', wtype: 'magia', hands: 1,
      rarity: 'legendary', ilvl: 55,
      opis: 'Różdżka Lodowa — jedyny łup Yeti. Nie wypada z niczego innego.',
    },
    zlotoZaPowtorke: 25000,
  },

  // ---------- TYTAN ----------
  // Druga próba spoza wieży, o rząd wielkości cięższa od Kolosa. Poziom 300 —
  // grubo powyżej wszystkiego, co dziś stoi w grze. Z ZAŁOŻENIA nie do pokonania
  // na obecnej skali: to zawartość-marchewka, nie walka na dziś. Jego jedyny łup,
  // Aegis Tytana, to BOSKA tarcza z afiksami poza dzisiejszą tabelą — po to, żeby
  // było widać, dokąd sięga sufit, nawet jeśli nikt tam jeszcze nie dojdzie.
  tytan: {
    id: 'tytan',
    label: 'Tytan Zapomnianej Kuźni',
    ic: '☠',
    obraz: '/img/tytan.png',     // ZAŚLEPKA — podmień plik na portret rycerza
    unlockFloor: 50,             // widoczny dopiero w połowie wieży
    opis: 'Stał w kuźni, zanim wykuto pierwsze piętro. Zbroja zrosła się z nim '
        + 'tak dawno, że nikt nie pamięta, czy w środku jeszcze coś jest. Tarcza '
        + 'na jego ramieniu wypaliła w kamieniu ślad głębszy niż jakikolwiek cios, '
        + 'jaki zdołasz mu oddać. On nie atakuje — on po prostu stoi, a wszystko, '
        + 'co podejdzie za blisko, przestaje istnieć.',
    ostrzezenie: 'Bije TRZY RAZY w turze i ogłusza. Jego pancerz i zdrowie są poza '
        + 'wszystkim, co dziś zbudujesz. To próba na później — na dziś przegrasz.',
    hp: 100000000,               // sto milionów — ściana nie do przebicia
    damage: 200000,
    armor: 80000,
    speed: 100,
    ataki: 3,                    // trzy ciosy pod rząd
    skills: ['zamach'],          // Zamach: pewne ogłuszenie
    poziom: 300,                 // skala pancerza tej walki
    // Nagroda za PIERWSZE zwycięstwo. Boska tarcza — jedyny jej egzemplarz.
    nagroda: {
      base: 'Aegis Tytana', slot: 'offhand', wtype: 'tarcza', hands: 1,
      rarity: 'god', ilvl: 300,
      obraz: '/img/tarcza-boska.png',
      opis: 'Aegis Tytana — boska tarcza. Jedyny łup Tytana, nie wypada z niczego innego.',
      // Afiksy wpisane wprost, nie rolowane — mają być z założenia pojebane.
      affixes: [
        { id: 'wszystkie',   label: 'Wszystkie staty',    value: 250 },
        { id: 'hpFlat',      label: 'Zdrowie',             value: 12000 },
        { id: 'armorFlat',   label: 'Pancerz',             value: 5000 },
        { id: 'dmgFlat',     label: 'Obrażenia',           value: 1500 },
        { id: 'critChance',  label: 'Szansa na kryt',      value: 35,  pct: true },
        { id: 'critPower',   label: 'Siła kryta',          value: 300, pct: true },
        { id: 'attackSpeed', label: 'Attack Speed',        value: 80,  as: true },
        { id: 'resistMagic', label: 'Odporność na magię',  value: 50,  pct: true },
      ],
    },
    zlotoZaPowtorke: 250000,
  },

  // ---------- ZDOLNOŚCI PRZECIWNIKÓW ----------
  // Ta sama mechanika co u gracza, tylko wybiera je AI. Przeciwnik gra
  // pierwszą gotową zdolnością z listy, więc KOLEJNOŚĆ w `skills` jest priorytetem.
  //
  //   dmgMult      mnożnik obrażeń ciosu
  //   stun         szansa na ogłuszenie (0–1), stunTurns ile tur
  //   dot          trucizna: procent MAKSYMALNEGO zdrowia celu na turę
  //   healPctMaxHp leczy najbardziej poobijanego sojusznika
  wrogowie: {
    zdolnosci: {
      ogluszenie: { label: 'Ogłuszający Cios', cd: 4, dmgMult: 1.30, stun: 0.70, stunTurns: 1 },
      zatrucie:   { label: 'Zatrucie', cd: 3, dmgMult: 0.70,
                    dot: { id: 'trucizna', label: 'trucizna', turns: 4, pctMaxHp: 0.030 } },
      leczenie:   { label: 'Pieśń Kości', cd: 3, healPctMaxHp: 0.14, prog: 0.85 },
      nawala:     { label: 'Nawała', cd: 3, dmgMult: 1.75 },
      zamach:     { label: 'Zamach Kolosa', cd: 3, dmgMult: 1.10, stun: 1.0, stunTurns: 2 },
    },
  },

  // ---------- INTERFEJS ----------
  // Motywy, jakość i dźwięk. Lista siedzi tutaj, bo to też są liczby gry —
  // klient tylko ją rysuje. id motywu ląduje w atrybucie data-theme na <html>,
  // a paleta każdego z nich stoi w public/style.css.
  ui: {
    themes: [
      { id: 'mrok',     label: 'Mrok',                opis: 'Domyślny. Sadza, kamień i mosiądz.' },
      { id: 'mosiadz',  label: 'Mosiądz Świetlisty',  opis: 'Gradient. Tło żyje, panele mają ciepły odblask.' },
      { id: 'otchlan',  label: 'Otchłań',             opis: 'Zimny fiolet i stal.' },
      { id: 'krew',     label: 'Krew',                opis: 'Czerń i rdza. Najciemniejszy.' },
      { id: 'pergamin', label: 'Pergamin',            opis: 'Jedyny jasny. Na dzień i na słońce.' },
      { id: 'grafit',   label: 'Grafit',              opis: 'Odcienie szarości. Kolor zostaje tylko tam, gdzie coś znaczy.' },
    ],
    quality: [
      { id: 'wysoka', label: 'Wysoka', opis: 'Animacje, cienie i gradienty.' },
      { id: 'niska',  label: 'Niska',  opis: 'Bez animacji i cieni. Dla słabszych telefonów.' },
    ],
    // Języki interfejsu. Polski jest domyślny i jest też KLUCZEM tłumaczeń —
    // patrz public/i18n.js. Dodanie języka to dopisanie wpisu tutaj i mapy tam.
    langs: [
      { id: 'pl', label: 'Polski',  ic: '🇵🇱' },
      { id: 'en', label: 'English', ic: '🇬🇧' },
    ],
    // Ustawienia świeżej postaci.
    domyslne: { theme: 'mrok', quality: 'wysoka', sound: true, volume: 0.5, lang: 'pl' },
    bioMax: 140,
  },

  // ---------- WIEŻA ----------
  tower: {
    fightsPerFloorMin: 6,
    fightsPerFloorMax: 10,
    plusEvery: 5,             // co 5 piętro — wariant "+"
    bossEvery: 10,            // co 10 piętro — boss aktu
    floorsPerAct: 10,
    plusStatMult: 1.30,       // wariant "+" ma o tyle mocniejsze statystyki
    // Od tego piętra przeciwnicy wychodzą we dwóch. Wcześniej szyk nie ma sensu,
    // bo nie ma kogo zasłaniać. Drugi jest słabszy, żeby trudność nie skoczyła dwa razy.
    // DRUGI PRZECIWNIK WCHODZI DOPIERO NA PIĄTYM PIĘTRZE, nie na trzecim.
    // Zmierzone: na piętrze 2 stał jeden mób na 124 HP i 14 obrażeń, a na trzecim
    // JUŻ DWAJ na łącznie 266 HP i 28 obrażeń — skok ×2,1 na zdrowiu i ×2 na
    // obrażeniach w jednym kroku, podczas gdy obrażenia gołego gracza stały na 25.
    // To nie była krzywa trudności, tylko schodek: gracz bez sprzętu miał 0% szans
    // od piętra 3 w górę i gra kończyła się dla niego zanim zdążył cokolwiek zdobyć.
    // ...i NIE na piętrze 5, bo tam wypada wariant „+" (co 5 pięter). Dwa skoki
    // trudności w tym samym kroku dają ścianę: zmierzone 96% na piętrze 4 i 0% na 5.
    duoFromFloor: 6,
    // ...i wchodzi słabszy niż dotąd. 0,65 znaczyło, że drugi mób dokłada dwie
    // trzecie pełnego przeciwnika naraz. 0,45 rozkłada to na kilka pięter.
    duoStatMult: 0.45,
    // Od piętra 15 wychodzą we TRÓJKĘ. Trzeci jest najsłabszy — trzech pełnych
    // przeciwników potroiłoby trudność z piętra na piętro.
    trioFromFloor: 15,
    trioStatMult: 0.50,
    // Piętra 25, 35, 45... kończą się MINI-ELITĄ: paczka trzech, w której jeden
    // ogłusza i truje, drugi leczy, trzeci bije. Ostatnia fala piętra.
    elitaFrom: 25,
    elitaEvery: 10,
    // Boss ma być sprawdzianem WYTRZYMAŁOŚCI, nie ściany obrażeń: wysoki mnożnik
    // HP, niski mnożnik obrażeń. Świta skaluje się od jego zdrowia, więc jedna
    // liczba rusza całą grupę.
    // Kalibracja: boss piętra 20 ma mieć MINIMUM 10 000 zdrowia sam z siebie.
    bossStatMult: 1.00,
    bossHpMult: 7.0,
    // ---- SKALOWANIE MOBA ----
    // hp  = (Base + PerFloor·f + PerFloor2·f²) · Growth^f
    // dmg = tak samo, własnymi liczbami
    //
    // CZŁON KWADRATOWY JEST TU ZE ZMIERZONEGO POWODU. Obrażenia gracza rosną
    // KWADRATOWO, nie liniowo: broń skaluje się z ilvl, mnożnik z atrybutów rośnie
    // z piętrem, a jedno mnoży się przez drugie. Zmierzone na sprzęcie „pod piętro":
    //   piętro 10 → 270 ataku, piętro 20 → 648, piętro 50 → 2759.
    // Dopasowanie: atak ≈ f² + 5f + 150. Bez członu f² w HP moba przeciwnik
    // z piętra 50 padał od dwóch ciosów.
    //
    // UWAGA: Growth to mnożnik WYKŁADNICZY. Trzymaj go blisko 1.01 — od tego jest
    // człon kwadratowy, który rośnie szybko, ale nie ucieka w kosmos.
    // ŁAGODNY START. Trudność ma rosnąć Z CZASEM GRY, a nie stawiać ściany
    // w pierwszych minutach. Przez pierwsze `lagodnyDoPietra` pięter statystyki
    // mobów są przemnażane przez współczynnik, który płynnie wraca do 1,0 —
    // więc KRZYWA JEST TA SAMA od piętra `lagodnyDoPietra` w górę i wszystkie
    // wystrojone cele balansu (10, 20, 25, 50) zostają nietknięte.
    // Zmierzone przed zmianą: gracz bez sprzętu miał 0% szans od piętra 3.
    lagodnyDoPietra: 9,
    lagodnyMnoznik: 0.55,
    mobHpBase: 60,   mobHpPerFloor: 28,   mobHpPerFloor2: 1.38, mobHpGrowth: 1.010,
    mobDmgBase: 9,   mobDmgPerFloor: 2.5, mobDmgPerFloor2: 0.048, mobDmgGrowth: 1.006,
    mobSpeedBase: 90, mobSpeedPerFloor: 0.6,
    // Pancerz moba. Musi rosnąć razem z pancerzem gracza, inaczej gracz
    // z każdym piętrem obrywa coraz mniej, a sam bije jak w powietrze.
    mobArmorBase: 10, mobArmorPerFloor: 22,
    goldBase: 8, goldPerFloor: 3,
    treePointsPerFloor: 1,
    treePointsPerBoss: 5,
    // Od tego piętra wolno włączyć POWTARZANIE: zdobyte piętro nie wypuszcza
    // wyżej, tylko startuje od pierwszej fali. Nagroda za piętro jest jednorazowa
    // (ch.nagrodzone), więc powtarzanie daje złoto, exp i Kronikę, nie punkty.
    powtarzanieOd: 10,
    // ZWYKŁY MÓB POKAZUJE STATYSTYKI OD RAZU. Boss trzyma je w tajemnicy,
    // dopóki nie zejdzie na tyle zdrowia — dopiero wtedy widzisz, z czym walczysz.
    bossOdkrywaOd: 0.5,

    // ---- ŚWITA ----
    // hp i dmg to UŁAMKI zwykłego moba z tego piętra, nie liczby bezwzględne —
    // dzięki temu świta skaluje się razem z wieżą i nie trzeba jej strojić osobno.
    //
    // `rodzina: true` znaczy „weź nazwę rodziny z tego piętra i dopisz suffix".
    // `skills` to id z config.wrogowie.zdolnosci; kolejność jest priorytetem AI.
    swita: {
      // Boss dostaje DWIE ELITY I JEDNEGO ZWYKŁEGO. Na razie ta sama trójka
      // przy każdym bossie — Tank, Mag, Łucznik.
      boss: [
        // Świta jest ŚCIANĄ, nie wyścigiem obrażeń — bije słabiej niż zwykły mob
        // z piętra, bo groźny ma być boss i jego zdrowie, nie sumaryczny dps grupy.
        { name: 'Rogaty Demon', ic: '😈', klasa: 'wojownik', elita: true,
          hp: 1.80, dmg: 0.45, skills: ['ogluszenie'] },
        { name: 'Lich',         ic: '💀', klasa: 'mag',      elita: true,
          hp: 1.30, dmg: 0.55, skills: ['zatrucie'] },
        { name: 'Sukkubus',     ic: '🦇', klasa: 'lowca',    elita: false,
          hp: 0.90, dmg: 0.50, skills: [] },
      ],
      // Paczka mini-elity z pięter 25, 35, 45...
      elita: [
        { rodzina: true, suffix: ' — Elita', ic: '☠', klasa: 'wojownik', elita: true,
          hp: 1.70, dmg: 1.20, skills: ['ogluszenie', 'zatrucie'] },
        { name: 'Szeptucha', ic: '✚', klasa: 'mag',   elita: false,
          hp: 0.75, dmg: 0.40, skills: ['leczenie'] },
        { name: 'Oprawca',   ic: '🗡', klasa: 'lowca', elita: false,
          hp: 0.70, dmg: 1.25, skills: ['nawala'] },
      ],
    },
  },

  // ---------- GÓRNICTWO I KOWALSTWO ----------
  mining: {
    maxLevel: 100,
    baseGemChance: 0.001,       // 0,10% przed premiami ekwipunku
    inventorySize: 60,
    categories: { ore: 'Rudy', magic: 'Magiczne', equipment: 'Ekwipunek' },
    slots: {
      helmet: 'Hełm', chest: 'Kaftan', gloves: 'Rękawice',
      legs: 'Spodnie', boots: 'Buty', pickaxe: 'Kilof',
    },
    bonusLabels: {
      miningSpeed: 'Szybkość kopania', miningXp: 'Doświadczenie Górnictwa',
      gemFind: 'Szansa na klejnot', doubleOre: 'Podwójna ruda',
      rareGemFind: 'Rzadki klejnot', doubleGem: 'Podwójny klejnot',
    },
    gems: {
      topaz: { label: 'Topaz', rank: 1 }, szafir: { label: 'Szafir', rank: 2 },
      szmaragd: { label: 'Szmaragd', rank: 3 }, rubin: { label: 'Rubin', rank: 4 },
      diament: { label: 'Diament', rank: 5 }, ametyst: { label: 'Ametyst', rank: 6 },
      onyks: { label: 'Onyks', rank: 7 }, mistycznyklejnot: { label: 'Mistyczny klejnot', rank: 8 },
      boskiklejnot: { label: 'Boski klejnot', rank: 9 },
    },
  },

  smithing: {
    maxLevel: 100,
    categories: {
      furnace: 'Piec', smelting: 'Wytapianie', weapons: 'Broń', armor: 'Pancerz',
      mining: 'Sprzęt górniczy', special: 'Specjalne',
    },
    qualities: {
      normal: { label: 'Normalny', mult: 1.00 }, fine: { label: 'Dobry', mult: 1.05 },
      superior: { label: 'Doskonały', mult: 1.10 }, masterwork: { label: 'Arcydzieło', mult: 1.15 },
    },
    // Szanse [Normalny, Dobry, Doskonały, Arcydzieło]. Między kotwicami
    // interpoluje silnik; specjalne receptury nie używają tego losowania.
    qualityAnchors: [
      { over: 0, chances: [75, 20, 4.5, 0.5] },
      { over: 10, chances: [65, 25, 9, 1] },
      { over: 30, chances: [45, 35, 17, 3] },
      { over: 50, chances: [20, 35, 35, 10] },
    ],
    recipes: SMITH_RECIPES,
  },

  // ---------- SKILLE ZBIERACKIE ----------
  // GÓRNICTWO GRA NAPRAWDĘ — kopiesz, dostajesz rudę i exp, wbijasz poziom,
  // otwierasz kolejny surowiec. To jest vertical slice profesji.
  // Reszta to nadal makiety: mają pokazać, dokąd to idzie, i nic więcej.
  //
  // Zasada, którą drabinka niesie od początku:
  // POZIOM decyduje, CO możesz zebrać. NARZĘDZIE decyduje, JAK SZYBKO.
  //
  // xpNeed: ile expa na kolejny poziom = xpBase * poziom. Świadomie nisko —
  // to są liczby pod obejrzenie pętli, nie pod finalny balans.
  skills: {
    gornictwo: {
      label: 'Górnictwo', ic: '⛏', daje: 'ruda i kryształy', zasila: 'Kowalstwo',
      grywalne: true,
      xpBase: 20,
      // Górnictwo wydobywa trzy rzeczy: RUDY pod Kowalstwo, jedną wspólną
      // ESENCJĘ i KRYSZTAŁY ŻYWIOŁÓW. Esencja jest jedna dla wszystkich —
      // to kryształ decyduje, jaki żywioł wyjdzie w RuneCraftingu.
      //
      // Kopanie esencji i kryształów dzieli exp po połowie z RuneCraftingiem.
      maxLevel: 100,
      resources: [
        ...MINING_ORES,
        // Magiczna żyła jest osobną drabinką. Progi są celowo nieregularne:
        // wyglądają jak odkrywane złoża, nie druga kopia rud co dziesięć poziomów.
        { category: 'magic', kind: 'magic', dzieliXp: 'runy', id: 'esencja',
          label: 'Esencja', nodeLabel: 'Ruda Esencji', lvl: 4, xp: 18, ms: 3600 },
        { category: 'magic', kind: 'magic', dzieliXp: 'runy', id: 'krysztalognia',
          label: 'Kryształ Ognia', nodeLabel: 'Ognisty Kamień', lvl: 9, xp: 28, ms: 4200 },
        { category: 'magic', kind: 'magic', dzieliXp: 'runy', id: 'krysztalmrozu',
          label: 'Kryształ Mrozu', nodeLabel: 'Kamień Mrozu', lvl: 23, xp: 52, ms: 5100 },
        { category: 'magic', kind: 'magic', dzieliXp: 'runy', id: 'krysztalziemi',
          label: 'Kryształ Ziemi', nodeLabel: 'Kamień Ziemi', lvl: 41, xp: 84, ms: 6100 },
        { category: 'magic', kind: 'magic', dzieliXp: 'runy', id: 'krysztalwichru',
          label: 'Kryształ Wichru', nodeLabel: 'Kamień Wichru', lvl: 67, xp: 132, ms: 7400 },
      ],
    },

    // KOWALSTWO PRZETWARZA. Zjada rudę z Górnictwa i wypluwa sztaby,
    // a sztabami ulepsza się noszony sprzęt (+1, +2, ...).
    kowalstwo: {
      label: 'Kowalstwo', ic: '🔨', daje: 'sztaby i ulepszenia', zasila: 'Ekwipunek',
      grywalne: true, przetwarza: true,
      xpBase: 30, maxLevel: 100,
      resources: SMITH_RECIPES,
    },
    rybolowstwo: {
      label: 'Wędkarstwo', ic: '🐟', daje: 'ryby i owoce morza', zasila: 'Gotowanie',
      grywalne: true, domain: 'fishing', xpBase: 22, maxLevel: 100,
      categories: { all: 'Wszystko', freshwater: 'Staw', coast: 'Wybrzeże', deep: 'Morze', abyss: 'Otchłań' },
      mastery: { label: 'Mistrz Wędkarstwa', bonus: '+5% szybkości łowienia' },
      resources: FISHING_SPOTS,
    },
    // Jedna aktywna produkcja, ale model outputs[] obsługuje kilka produktów
    // jednego zwierzęcia (np. owcze mleko + wełna) i rozróżnia odnawialne/ubój.
    rolnictwo: {
      label: 'Rolnictwo', ic: '🌾', daje: 'plony, owoce i produkty zwierzęce', zasila: 'Gotowanie',
      grywalne: true, domain: 'farming', xpBase: 21, maxLevel: 100,
      categories: { all: 'Wszystko', crops: 'Uprawy', fruit: 'Owoce', animals: 'Zwierzęta' },
      mastery: { label: 'Mistrz Rolnictwa', bonus: '+5% zbiorów' },
      resources: FARMING_PRODUCTIONS,
    },

    // Wszystkie receptury żyją na JEDNYM ekranie. `category` jest wyłącznie
    // filtrem listy; `food.buffSlot` decyduje o jednym z trzech slotów buffa.
    gotowanie: {
      label: 'Gotowanie', ic: '🍲', daje: 'posiłki, napoje i desery', zasila: 'Walkę i profesje',
      grywalne: true, przetwarza: true, domain: 'cooking', xpBase: 27, maxLevel: 100,
      categories: { all: 'Wszystko', fish: 'Ryby', meat: 'Mięso', veg: 'Warzywne', dessert: 'Deser', drink: 'Napój' },
      mastery: { label: 'Mistrz Gotowania', bonus: '+5% szybkości gotowania' },
      resources: COOKING_RECIPES,
    },

    // ALCHEMIA PRZETWARZA. JEDYNE ŹRÓDŁO MIKSTUR — kupowanie zostało skasowane,
    // więc to ona trzyma gracza przy życiu po przegranej.
    alchemia: {
      label: 'Alchemia', ic: '⚗', daje: 'mikstury', zasila: 'Walka i Wyprawa',
      grywalne: true, przetwarza: true,
      xpBase: 24,
      // Drabinka Alchemii = drabinka mikstur z `healing.mikstury`. Każdy przepis
      // robi KONKRETNY rodzaj, nie abstrakcyjne „sztuki mikstury".
      resources: [
        { id: 'w_m10',   label: 'Słaba Mikstura',   lvl: 1,  xp: 11, ms: 3600,
          koszt: { ziolo: 2 },                      daje: { mikstura: 'm10' } },
        { id: 'w_m15',   label: 'Mikstura',         lvl: 5,  xp: 22, ms: 4400,
          koszt: { ziolo: 2, ziologorzk: 1 },       daje: { mikstura: 'm15' } },
        { id: 'w_m25',   label: 'Mocna Mikstura',   lvl: 9,  xp: 38, ms: 5200,
          koszt: { ziologorzk: 2, korzennocny: 1 }, daje: { mikstura: 'm25' } },
        { id: 'w_m35',   label: 'Wielka Mikstura',  lvl: 14, xp: 60, ms: 6200,
          koszt: { korzennocny: 2, kwiatciern: 1 }, daje: { mikstura: 'm35' } },
        { id: 'w_m50',   label: 'Pełna Mikstura',   lvl: 20, xp: 90, ms: 7000,
          koszt: { korzennocny: 3, kwiatciern: 2 }, daje: { mikstura: 'm50' } },
        { id: 'w_e200',  label: 'Eliksir Krwi',     lvl: 26, xp: 130, ms: 7600,
          koszt: { kwiatciern: 3, runapradawna: 1 }, daje: { mikstura: 'e200' } },
        { id: 'w_e500',  label: 'Eliksir Życia',    lvl: 34, xp: 180, ms: 8400,
          koszt: { kwiatciern: 4, runapradawna: 2 }, daje: { mikstura: 'e500' } },
        { id: 'w_e1000', label: 'Eliksir Odnowy',   lvl: 42, xp: 250, ms: 9200,
          koszt: { kwiatciern: 6, runapradawna: 3 }, daje: { mikstura: 'e1000' } },
        { id: 'w_e2500', label: 'Eliksir Otchłani', lvl: 50, xp: 340, ms: 10000,
          koszt: { kwiatciern: 8, runapradawna: 5 }, daje: { mikstura: 'e2500' } },
      ],
    },
    // RUNECRAFTING ŁĄCZY ESENCJĘ Z KRYSZTAŁEM w RUNĘ. Runę PODPINASZ
    // do postaci — dopiero wtedy umiesz rzucać magią jej żywiołu.
    // Które zaklęcie faktycznie odpalisz, decyduje poziom skilla MAGIA.
    //
    //   Górnictwo → esencja + kryształ  →  RuneCrafting → RUNA
    //   podpięta runa + poziom Magii    →  zaklęcie
    runy: {
      label: 'Runy', ic: '✦', daje: 'runy do podpięcia', zasila: 'Magia',
      grywalne: true, przetwarza: true,
      xpBase: 26,
      resources: [
        { id: 'runaognia',  label: 'Runa Ognia',  lvl: 1, xp: 24, ms: 4600,
          koszt: { esencja: 1, krysztalognia: 2 } },
        { id: 'runamrozu',  label: 'Runa Mrozu',  lvl: 3, xp: 38, ms: 5200,
          koszt: { esencja: 1, krysztalmrozu: 2 } },
        { id: 'runaziemi',  label: 'Runa Ziemi',  lvl: 5, xp: 54, ms: 5800,
          koszt: { esencja: 1, krysztalziemi: 2 } },
        { id: 'runawichru', label: 'Runa Wichru', lvl: 7, xp: 74, ms: 6400,
          koszt: { esencja: 1, krysztalwichru: 2 } },
        // Jedyna runa, która wymaga Kryształu Magii z wyprawy.
        { id: 'runapradawna', label: 'Runa Pradawna', lvl: 10, xp: 115, ms: 7400,
          koszt: { esencja: 3, krysztalmagii: 2 } },
      ],
    },
  },

  // ---------- SKILLE BOJOWE ----------
  // WRÓCIŁY, ale w innej roli. Poprzednio bramkowały sprzęt — i to był problem,
  // bo sprzęt z piętra 40 i tak wymagał piętra 40, żeby go zdobyć. Teraz dają
  // WYŁĄCZNIE bonusy. Jedyną bramką na sprzęt zostaje poziom postaci.
  //
  // Exp idzie z tego, CZYM bijesz, i dzieli się według rąk:
  //   dwuręczna broń          → 100% do jej skilla
  //   jednoręczna + tarcza    → 50% broń / 50% Obrona
  //   dwie jednoręczne        → po 50% do skilla każdej z nich
  //   jednoręczna sama        → 100% do jej skilla
  // Witalność rośnie zawsze, z samego udziału w walce.
  combatSkills: {
    xpBase: 45,               // exp na kolejny poziom = xpBase * poziom
    xpPerFloor: 6,            // exp za wygraną walkę = xpPerFloor * piętro
    xpPerSpell: 9,            // exp do Przyrządów Magicznych za KAŻDE zaklęcie
    twoHandDmg: 1.35,         // dwuręczna bije mocniej — to jej cała przewaga

    // ---- PIĘĆ SKILLI ----
    // Skill = RODZINA BRONI, a nie abstrakcyjny „atak". Typ broni (`wtype`)
    // JEST identyfikatorem skilla, więc nie ma drugiej tabeli do rozjechania się.
    //
    // Kostur jest dwuręczny, ale expi PRZYRZĄDY MAGICZNE, nie Broń dwuręczną —
    // wynika to wprost z tego, że jego wtype to `magiczne`.
    // WITALNOŚĆ SKASOWANA: zdrowie niesie poziom postaci i Wytrzymałość.
    list: {
      dwureczna:   { label: 'Broń dwuręczna',    ic: '🪓',
                     opis: 'Topory, młoty i miecze dwuręczne. Największe obrażenia, druga ręka zajęta.' },
      jednoreczna: { label: 'Broń jednoręczna',  ic: '🗡',
                     opis: 'Miecze, scimitary i sztylety. Zostawiają rękę na tarczę albo drugie ostrze.' },
      magiczne:    { label: 'Przyrządy magiczne',ic: '✦',
                     opis: 'Różdżki, orby i kostury. Kostur jest dwuręczny, ale expi tutaj.' },
      dystansowe:  { label: 'Broń dystansowa',   ic: '🏹',
                     opis: 'Łuki, kusze i oszczepy. Biją z tylnego rzędu, bez podchodzenia.' },
      obrona:      { label: 'Ekwipunek defensywny', ic: '🛡',
                     opis: 'Ciuchy, biżuteria i zdrowie. Rośnie z każdej przetrwanej walki.' },
    },

    // ---- DRZEWKA ----
    // KAŻDY POZIOM SKILLA DAJE JEDEN PUNKT W JEGO WŁASNYM DRZEWKU. Nic nie
    // przychodzi za darmo z samego poziomu — dawne `perLevel` skasowane, bo
    // wtedy exp dawał bonus DWA razy: raz sam z siebie, raz przez drzewko.
    //
    // `eff` to wartość ZA JEDNĄ RANGĘ. Klucze takie same jak w drzewku postaci.
    // Węzły broni liczą się TYLKO wtedy, gdy trzymasz broń tej rodziny —
    // punkty w Toporach nie pomagają łucznikowi.
    //
    // SKALA JEST ZMIERZONA, NIE ZGADNIĘTA. Przy pierwszym podejściu (wartości
    // dwa razy większe) pełne drzewka podnosiły szansę na piętro 50 w legendach
    // z 24% na 75% — ściana znikała. Po zejściu do tych liczb pełny komplet
    // daje kilkanaście punktów procentowych i zostaje nagrodą, a nie skrótem.
    // Sprawdzasz jedną komendą: node tools/balans.js --cel
    punktyNaPoziom: 1,
    rangaMax: 10,
    drzewka: {
      dwureczna: [
        { id: '2h_sila',   label: 'Ciężki Zamach', eff: { dmgPct: 0.0067 },
          opis: 'Obrażenia bronią dwuręczną' },
        { id: '2h_rozped', label: 'Rozpęd',        eff: { speed: 0.54 },
          opis: 'Prędkość ataku' },
        { id: '2h_mlyn',   label: 'Młyn',          eff: { critPower: 0.0135 },
          opis: 'Siła trafienia krytycznego' },
      ],
      jednoreczna: [
        { id: '1h_ostrze', label: 'Szybkie Ostrze', eff: { dmgPct: 0.0054 },
          opis: 'Obrażenia bronią jednoręczną' },
        { id: '1h_tempo',  label: 'Tempo',          eff: { speed: 0.9 },
          opis: 'Prędkość ataku' },
        { id: '1h_celnosc',label: 'Pewna Ręka',     eff: { accuracy: 0.0036 },
          opis: 'Celność' },
      ],
      magiczne: [
        { id: 'mg_moc',    label: 'Skupienie',      eff: { dmgPct: 0.0067 },
          opis: 'Obrażenia przyrządem magicznym' },
        { id: 'mg_mana',   label: 'Głębia Many',    eff: { manaFlat: 1.8 },
          opis: 'Maksymalna mana' },
        { id: 'mg_kryt',   label: 'Iskra',          eff: { critChance: 0.0027 },
          opis: 'Szansa na trafienie krytyczne' },
      ],
      dystansowe: [
        { id: 'ds_oko',    label: 'Sokole Oko',     eff: { dmgPct: 0.0063 },
          opis: 'Obrażenia bronią dystansową' },
        { id: 'ds_tempo',  label: 'Szybki Chwyt',   eff: { speed: 0.72 },
          opis: 'Prędkość ataku' },
        { id: 'ds_unik',   label: 'Zwinność',       eff: { evasion: 0.0023 },
          opis: 'Unik' },
      ],
      obrona: [
        { id: 'ob_ciuchy', label: 'Ciuchy',         eff: { armorPct: 0.009 },
          opis: 'Pancerz z hełmu, napierśnika, butów i rękawic' },
        { id: 'ob_bizu',   label: 'Biżuteria',      eff: { bizuPct: 0.0135 },
          opis: 'Wartość afiksów z pierścienia i naszyjnika' },
        { id: 'ob_hp',     label: 'Zdrowie',        eff: { hpPct: 0.0054 },
          opis: 'Maksymalne zdrowie' },
      ],
    },
  },

  // ---------- SZYK ----------
  // Trzy rzędy. Klasa decyduje, w którym stoisz, i to jest cała reguła:
  //   1. przód   — Wojownik, Paladyn, Tancerz Ostrzy
  //   2. środek  — Mag
  //   3. tył     — Łowca, Tropiciel
  //
  // Zasięg zależy od broni. Broń biała dosięga TYLKO pierwszego rzędu — żeby
  // dobrać się do łucznika z tyłu, trzeba najpierw podejść, a każde podejście
  // kosztuje turę. Dystans i magia biją wszędzie od razu i to jest ich przewaga
  // za cenę słabszych statystyk obronnych.
  formation: {
    rows: { wojownik: 1, paladyn: 1, tancerz: 1, mag: 2, lowca: 3, tropiciel: 3 },
    // RZĄD BOHATERA BIERZE SIĘ Z BRONI. Bijesz wręcz — stoisz z przodu.
    // Różdżka stawia Cię w środku, łuk z tyłu, i wtedy sojusznik-wojownik
    // naprawdę Cię zasłania: wróg musi przejść jeden albo dwa kroki.
    heroRow: { dwureczna: 1, jednoreczna: 1, magiczne: 2, dystansowe: 3 },
    reach: { dwureczna: 1, jednoreczna: 1, magiczne: 3, dystansowe: 3 },
    petRow: 1,               // pet leci przodem, nie ma klasy
    maxRow: 3,
  },

  // ---------- SOJUSZNICY I PET ----------
  // Sojusznik jest UŁAMKIEM bohatera, nie drugim bohaterem. Statystyki liczą się
  // z jego statystyk, więc nie ma osobnej krzywej do strojenia i sojusznik nigdy
  // nie zostaje w tyle ani nie przerasta gracza.
  //
  // Nie noszą ekwipunku — to decyzja trwała. Rosną wyłącznie rzadkością.
  allies: {
    slots: 3,
    // Common ma być pełnoprawnym członkiem składu, nie ozdobą robiącą 18–30%
    // bohatera. Rzadkość nadal skaluje te wartości, ale już baza daje odczuwalny
    // wkład. Konkretna klasa dopiero nadaje temu wkładowi rolę.
    ally: { hpPct: 0.48, dmgPct: 0.36, armorPct: 0.45, speed: 100 },
    pet:  { hpPct: 0.32, dmgPct: 0.22, armorPct: 0.25, speed: 115 },
    rarityMult: { common: 1.00, uncommon: 1.18, unique: 1.42, heroic: 1.75, legendary: 2.20 },
    // Mechanika klasy idzie razem ze statystykami do silnika walki i do UI.
    // Mnożniki są względem wspólnej bazy `ally` powyżej.
    roles: {
      wojownik: { label: 'Obrońca', desc: 'Ściąga uwagę wrogów i przyjmuje ciosy za tylny rząd.',
        hp: 1.50, dmg: 0.85, armor: 1.60, speed: 0.96, threat: 4.0 },
      paladyn: { label: 'Strażnik', desc: 'Osłania drużynę i co 4 tury leczy najbardziej ranną jednostkę.',
        hp: 1.30, dmg: 0.85, armor: 1.40, speed: 0.96, threat: 3.2, healPct: 0.10, healCd: 4 },
      tancerz: { label: 'Siepacz', desc: 'Każdą turę wykonuje dwa szybkie cięcia.',
        hp: 0.95, dmg: 1.05, armor: 0.90, speed: 1.08, hits: 2, hitMult: 0.68, crit: 0.08 },
      mag: { label: 'Arkanista', desc: 'Ignoruje część pancerza i razi także pozostałych wrogów.',
        hp: 0.85, dmg: 1.20, armor: 0.72, speed: 0.96, pierce: 0.30, splash: 0.25 },
      lowca: { label: 'Strzelec', desc: 'Bije z tylnego rzędu, częściej trafia krytycznie i przebija pancerz.',
        hp: 0.92, dmg: 1.25, armor: 0.82, speed: 1.05, pierce: 0.15, crit: 0.12, accuracy: 0.06 },
      tropiciel: { label: 'Tropiciel', desc: 'Celny strzał osłabia pancerz celu dla całej drużyny.',
        hp: 1.00, dmg: 1.12, armor: 0.90, speed: 1.04, crit: 0.06, accuracy: 0.10, exposeArmor: 0.88 },
    },
    petRole: { label: 'Drapieżnik', desc: 'Szybkie ugryzienia zostawiają krwawienie na 2 tury.',
      bleedMult: 0.20, bleedTurns: 2 },

    // Drużyna otwiera się po kawałku, a nie cała na starcie. Pierwsze piętra
    // gra się samemu — inaczej gracz nie zdąży poczuć, po co mu ktoś obok.
    //
    // To są progi na PRZYWOŁANIE, nie darmowe prezenty. Sojusznika i peta
    // trzeba sobie wylosować kluczem, gra tylko otwiera taką możliwość.
    unlock: {
      ally1: 3,     // poziom 3 — otwiera się pierwszy slot i przywoływanie sojuszników
      // Pet otwiera się z WEJŚCIEM na piętro bossa, czyli ZANIM się z nim
      // zmierzysz: poziom postaci = najwyższe zdobyte piętro, więc próg 10
      // zapala się w chwili, gdy stajesz przed bossem, nie po nim.
      pet: 10,
      // Drugi sojusznik nie chodzi po piętrach — trzeba po niego ZEJŚĆ.
      // Otwiera go ukończona Puszcza Cierniowa na wysokim ryzyku.
      ally2: { wyprawa: 'puszcza', risk: 'pro' },
      // Pełny skład sojuszników jest nagrodą za wejście w środkową grę.
      ally3: 30,
    },
    lockedSlots: [],
  },

  // ---------- SUROWCE SPOZA PROFESJI ----------
  // Nie da się ich zebrać ani wytworzyć — wypadają wyłącznie z wypraw.
  // To one bramkują runy mocy: bez zejścia w teren runy zostają bezsilne.
  materialy: {
    krysztalmagii: { label: 'Kryształ Magii', ic: '💎',
      opis: 'Wypada tylko z wypraw. Nadaje runom moc.' },
    cierniowyrdzen: { label: 'Cierniowy Rdzeń', ic: '🌿',
      opis: 'Trofeum bossa Puszczy Cierniowej. Składnik receptur specjalnych.' },
    zywicazelazna: { label: 'Żelazna Żywica', ic: '🌿', opis: 'Unikalny surowiec Puszczy Cierniowej.' },
    solbagienna: { label: 'Sól Bagienna', ic: '🧂', opis: 'Unikalny minerał Mokradeł Szeptu.' },
    sercetopielca: { label: 'Serce Topielca', ic: '🫀', opis: 'Trofeum bossa Mokradeł Szeptu.' },
    odlamekecha: { label: 'Odłamek Echa', ic: '🔊', opis: 'Unikalny kryształ Kopalni Zgniłego Kamienia.' },
    rdzenkonstruktu: { label: 'Rdzeń Konstruktu', ic: '⚙', opis: 'Trofeum bossa Kopalni Zgniłego Kamienia.' },
    szklozarowe: { label: 'Szkło Żarowe', ic: '🔥', opis: 'Unikalny minerał Wąwozu Popiołu.' },
    sercepopiolu: { label: 'Serce Popiołu', ic: '🧡', opis: 'Trofeum bossa Wąwozu Popiołu.' },
    srebrorytualne: { label: 'Srebro Rytualne', ic: '☽', opis: 'Unikalny stop Przeklętej Kaplicy.' },
    pieczecupadla: { label: 'Pieczęć Upadła', ic: '✦', opis: 'Trofeum bossa Przeklętej Kaplicy.' },
    wiecznylod: { label: 'Wieczny Lód', ic: '❄', opis: 'Unikalny minerał Lodowca Wiecznego.' },
    rdzenszronu: { label: 'Rdzeń Szronu', ic: '🧊', opis: 'Trofeum bossa Lodowca Wiecznego.' },
    odlamekduszy: { label: 'Odłamek Duszy', ic: '👻', opis: 'Unikalny kryształ Nekropolii.' },
    koscpradawna: { label: 'Kość Pradawna', ic: '🦴', opis: 'Trofeum bossa Nekropolii.' },
    krysztalburzy: { label: 'Kryształ Burzy', ic: '⚡', opis: 'Unikalny minerał Cytadeli Burz.' },
    rdzengromu: { label: 'Rdzeń Gromu', ic: '🌩', opis: 'Trofeum bossa Cytadeli Burz.' },
    odlamekpustki: { label: 'Odłamek Pustki', ic: '◉', opis: 'Unikalny kryształ Szczeliny Pustki.' },
    okootchlani: { label: 'Oko Otchłani', ic: '👁', opis: 'Trofeum bossa Szczeliny Pustki.' },
    pylgwiezdny: { label: 'Pył Gwiezdny', ic: '✨', opis: 'Unikalny minerał Gwiezdnego Szczytu.' },
    sercekomety: { label: 'Serce Komety', ic: '☄', opis: 'Trofeum bossa Gwiezdnego Szczytu.' },
    stoppradawny: { label: 'Stop Pradawny', ic: '🏺', opis: 'Unikalny metal Pradawnych Ruin.' },
    tablicaruniczna: { label: 'Tablica Runiczna', ic: '📜', opis: 'Trofeum bossa Pradawnych Ruin.' },
    perlapopiolu: { label: 'Perła Popiołu', ic: '⚫', opis: 'Unikalny minerał Morza Popiołu.' },
    rdzenzaru: { label: 'Rdzeń Żaru', ic: '🔆', opis: 'Trofeum bossa Morza Popiołu.' },
    szklanykwiat: { label: 'Szklany Kwiat', ic: '🌸', opis: 'Unikalny materiał Ogrodów Pustki.' },
    nasionopustki: { label: 'Nasiono Pustki', ic: '🌑', opis: 'Trofeum bossa Ogrodów Pustki.' },
    fragmentkonca: { label: 'Fragment Końca', ic: '♛', opis: 'Unikalny minerał Tronu Końca.' },
    koronnyrdzen: { label: 'Koronny Rdzeń', ic: '👑', opis: 'Trofeum ostatniego bossa Tronu Końca.' },
  },

  // ---------- PRZYWOŁANIE ----------
  // Prototyp odczucia, nie ekonomia. Klucze to ta sama waluta, którą oddaje boss
  // aktu — nie zakładamy drugiego portfela, dopóki nie wiadomo, czy system zostaje.
  summon: {
    keyCost: 1,
    startingKeys: 3,
    keysPerFloor: 1,
    keysPerBoss: 3,
    weights: { common: 620, uncommon: 250, unique: 90, heroic: 32, legendary: 8 },
    // [nazwa, klasa]. Klasa decyduje o rzędzie w szyku — patrz formation.rows.
    companions: {
      common:    [['Leśny Łucznik', 'lowca'], ['Wieśniak z Widłami', 'wojownik'], ['Zbieracz Chrustu', 'tropiciel']],
      uncommon:  [['Strażniczka Ścieżki', 'paladyn'], ['Najemnik z Rozstajów', 'wojownik']],
      unique:    [['Kapłanka Świtu', 'mag'], ['Łowca Nagród', 'lowca']],
      heroic:    [['Siostra Klingi', 'tancerz'], ['Zaklinacz Popiołu', 'mag']],
      legendary: [['Rycerz Płomienia', 'paladyn'], ['Wiedźma Otchłani', 'mag']],
    },
    pets: {
      common:    ['Leśny Lis', 'Kruk', 'Jeż Kolczasty'],
      uncommon:  ['Młody Wilk', 'Sokół'],
      unique:    ['Rosomak', 'Puchacz Mgły'],
      heroic:    ['Cierniowy Ryś', 'Wilk Wataszki'],
      legendary: ['Młody Wiwerna', 'Duch Puszczy'],
    },
  },

  // ---------- WYPRAWA ----------
  // JEDYNE ŹRÓDŁO PRZEDMIOTÓW. Wieża daje złoto, exp skilli i wiedzę o świecie,
  // ale nie daje łupu — po to, żeby wspinaczka i zdobywanie sprzętu były dwiema
  // różnymi decyzjami, a nie jedną pętlą, która robi wszystko naraz.
  //
  // Wyprawa ma prawdziwą stawkę: łup zbiera się do sakwy i wpada do plecaka
  // DOPIERO po ukończeniu. Śmierć po drodze zabiera wszystko, co uzbierałeś.
  expedition: {
    // ZDROWIE NIE WRACA NA WEJŚCIU. Wchodzisz z tym, co masz — leczysz się
    // PRZED wyjściem, miksturami. Dlatego wyprawa nie jest darmowym resetem HP.
    // DZIESIĘĆ MIKSTUR NA CAŁĄ WYPRAWĘ, nie na walkę. Zapas ODNAWIA SIĘ
    // W NAMIOCIE — i to jest jedyny sposób. Dlatego liczba namiotów jest
    // prawdziwą walutą trudności: Profesjonalista ma 48 etapów i dwa namioty,
    // czyli trzy pełne zapasy na cały run.
    potionCap: 10,
    goldMult: 1.4,
    // Po każdej wygranej walce wraca kawałek maksymalnego HP. To nie jest
    // pełny reset: wyczerpanie dalej istnieje, ale 48 etapów Profesjonalisty
    // nie zamienia jednego pechowego krytyka w nieodwracalny wyrok.
    healAfterWinPct: 0.08,

    // ---- POZIOM PRZEDMIOTÓW ----
    // TO WYPRAWA, A NIE PIĘTRO, DECYDUJE O POZIOMIE ŁUPU. Każda ma swoje widełki
    // (pole `ilvl`), a rzadkość mówi, z której części widełek losujesz:
    // legendarne i lepsze biorą górę, reszta dół.
    //   Puszcza Cierniowa: 1–10, legendarne 8–10, zwykłe 1–8
    // Wysokie ryzyko MNOŻY całe widełki — z Puszczy da się wtedy wyjść z ilvl 20.
    // Dlatego dalsze wyprawy otwiera postęp w wieży, a nie czas gry.
    legendarnyOd: 0.8,         // od którego miejsca widełek zaczyna się góra

    // ---- GDZIE W WIDEŁKACH LĄDUJE PRZEDMIOT ----
    // Ułamki całego przedziału wyprawy. Zwykły mob oddaje dolną część, elita
    // w połowie drogi środek, boss górę — dzięki temu boss daje SENSOWNIE lepsze
    // przedmioty, a nie tę samą losową sztukę co pierwsza walka.
    // Puszcza (1–10) wychodzi na tym tak: walka 1–5, elita 5–8, boss 6–10.
    ilvlWezel: {
      walka: [0.00, 0.50],
      elita: [0.40, 0.80],
      boss:  [0.60, 1.00],
    },

    // ---- POSTÓJ ----
    // Przy ognisku wolno ZJEŚĆ. Jedzenie z Gotowania leczy do pełna i zostawia
    // swój buff na kolejne walki. To jedyny PEŁNY odpoczynek w środku runu;
    // zwycięskie walki oddają tylko 8%, mikstury liczą się z limitu.
    postojLeczy: true,

    // ---- RYZYKO ----
    // RYZYKO USTAWIA DŁUGOŚĆ RUNU I LICZBĘ NAMIOTÓW.
    // Namiotów jest MNIEJ na trudniejszym, nie więcej — dlatego 48 etapów
    // Profesjonalisty ma ich dwa, a 24 etapy Zaawansowanego trzy. Długi run
    // bez odpoczynku jest właśnie tym, za co płaci pięciokrotna nagroda. Nie ma osobnej długości per wyprawa —
    // wybierasz, jak długo chcesz siedzieć, i tyle dostajesz z powrotem.
    //
    //   tury      ile etapów ma run (boss zawsze na końcu)
    //   mob       mnożnik statystyk przeciwnika
    //   lootMult  mnożnik SZANSY na drop
    //   reward    mnożnik nagrody: złoto i wartość sakwy
    //   legendy   czy w skrzyni bossa mogą być legendarne, Mystic i God
    //   ilvlMult  mnożnik widełek poziomu przedmiotu
    //
    // BEZ RYZYKA NIE MA LEGEND. To jest cała różnica, na której stoi wybór:
    // krótki run daje pewny sprzęt do noszenia, długi daje szansę na broń,
    // której nie da się zdobyć inaczej.
    risks: {
      bezryzyka: { label: 'Bez ryzyka', tury: 12, mob: 0.85, lootMult: 1.0, reward: 1,
                   legendy: false, ilvlMult: 1, floorOffset: -2, namioty: 1,
                   desc: 'Dwanaście etapów. Przeciwnicy idą 2 poziomy poniżej trasy. Bazowa liczba prób na materiały.' },
      zaawansowany: { label: 'Zaawansowany', tury: 24, mob: 1.00, lootMult: 2.0, reward: 2,
                   legendy: true, ilvlMult: 1, floorOffset: 0, namioty: 3,
                   desc: 'Dwadzieścia cztery etapy. Przeciwnicy rosną dokładnie z trasą, a nagroda materiałowa jest podwojona.' },
      pro: { label: 'Profesjonalista', tury: 48, mob: 1.30, lootMult: 5.0, reward: 5,
                   legendy: true, ilvlMult: 2, floorOffset: 3, namioty: 2,
                   desc: 'Czterdzieści osiem etapów. Przeciwnicy idą 3 poziomy ponad trasą, nagroda materiałowa jest pięciokrotna, a śmierć zabiera całą sakwę.' },
    },

    // ---- LISTA WYPRAW ----
    // Najpierw wybierasz, DOKĄD idziesz, dopiero potem ryzyko i utrudnienia.
    // Wyprawa jest otwarta od pierwszej minuty gry — z poziomami rośnie tylko
    // to, jak długa może być droga i ile utrudnień wolno dołożyć.
    //
    // drops to PRAWDA, nie ozdoba: generator losuje nazwy dokładnie z tej listy,
    // więc tabela w UI pokazuje realnie osiągalny zbiór.
    lista: {
      puszcza: {
        label: 'Puszcza Cierniowa', ic: '🌲', unlockFloor: 1, ilvl: [1, 10],
        opis: 'Pierwszy las pod wieżą. Wilki, gobliny i coś, co mieszka w sztolni.',
        // Długość rośnie z poziomem — dalej w wieży, dłuższa droga i większy łup.
        dlugosc: [{ floor: 1, nodes: 8 }, { floor: 5, nodes: 10 }, { floor: 12, nodes: 12 }],
        // Surowce z wyprawy. Kryształ Magii jest tu jedynym źródłem run mocy.
        mats: [
          { id: 'zywicazelazna', szansa: 0.72, ile: [2, 5] },
          { id: 'krysztalmagii', szansa: 0.14, ile: [1, 1] },
        ],
        bossMats: [{ id: 'cierniowyrdzen', szansa: 1, ile: [1, 1] }],
        drops: [...BRONIE, ...PANCERZ('Kaptur', 'Kolczuga', 'Trzewiki', 'Karwasze', 'Sygnet', 'Talizman', 'Tarcza')],
      },
      mokradla: {
        label: 'Mokradła Szeptu', ic: '🌫', unlockFloor: 10, ilvl: [10, 20],
        opis: 'Topielce i pijawki. Otwiera się, gdy staniesz przed pierwszym bossem.',
        dlugosc: [{ floor: 10, nodes: 10 }, { floor: 16, nodes: 12 }],
        mats: [
          { id: 'solbagienna',   szansa: 0.72, ile: [2, 5] },
          { id: 'krysztalmagii', szansa: 0.18, ile: [1, 2] },
        ],
        bossMats: [{ id: 'sercetopielca', szansa: 1, ile: [1, 1] }],
        drops: [...BRONIE, ...PANCERZ('Hełm', 'Kirys', 'Buty', 'Rękawice', 'Pierścień', 'Amulet', 'Puklerz')],
      },
      kopalnia: {
        label: 'Kopalnia Zgniłego Kamienia', ic: '⛰', unlockFloor: 20, ilvl: [20, 30],
        opis: 'Konstrukty i nietoperze w sztolniach, które ktoś zamknął nie bez powodu.',
        dlugosc: [{ floor: 20, nodes: 12 }],
        mats: [
          { id: 'odlamekecha',   szansa: 0.72, ile: [2, 5] },
          { id: 'krysztalmagii', szansa: 0.22, ile: [1, 2] },
        ],
        bossMats: [{ id: 'rdzenkonstruktu', szansa: 1, ile: [1, 1] }],
        drops: [...BRONIE, ...PANCERZ('Diadem', 'Napierśnik', 'Sandały', 'Naręczaki', 'Obrączka', 'Naszyjnik', 'Tarcza')],
      },
      wawoz: {
        label: 'Wąwóz Popiołu', ic: '🌋', unlockFloor: 30, ilvl: [30, 40],
        opis: 'Ogry i pomioty na spalonej ziemi. Jedyna droga do Szkła Żarowego.',
        dlugosc: [{ floor: 30, nodes: 12 }],
        mats: [
          { id: 'szklozarowe',   szansa: 0.72, ile: [2, 5] },
          { id: 'krysztalmagii', szansa: 0.26, ile: [1, 3] },
        ],
        bossMats: [{ id: 'sercepopiolu', szansa: 1, ile: [1, 1] }],
        drops: [...BRONIE, ...PANCERZ('Maska', 'Płaszcz', 'Trzewiki', 'Karwasze', 'Sygnet', 'Talizman', 'Puklerz')],
      },
      kaplica: {
        label: 'Zapadła Kaplica', ic: '⛪', unlockFloor: 40, ilvl: [40, 50],
        opis: 'Kultyści i upiory pilnują przejścia ku dalszym piętrom.',
        dlugosc: [{ floor: 40, nodes: 12 }],
        mats: [
          { id: 'srebrorytualne',szansa: 0.72, ile: [2, 5] },
          { id: 'krysztalmagii', szansa: 0.30, ile: [2, 4] },
        ],
        bossMats: [{ id: 'pieczecupadla', szansa: 1, ile: [1, 1] }],
        drops: [...BRONIE, ...PANCERZ('Hełm', 'Kolczuga', 'Buty', 'Rękawice', 'Pierścień', 'Naszyjnik', 'Tarcza')],
      },
      lodowiec: {
        label: 'Lodowiec Bez Słońca', ic: '🧊', unlockFloor: 50, ilvl: [50, 60],
        opis: 'Pęknięty lód, ślepe tunele i bestie, które nigdy nie widziały dnia.',
        mats: [
          { id: 'wiecznylod',    szansa: 0.72, ile: [2, 5] },
          { id: 'krysztalmagii', szansa: 0.32, ile: [2, 4] },
        ],
        bossMats: [{ id: 'rdzenszronu', szansa: 1, ile: [1, 1] }],
        drops: [...BRONIE, ...PANCERZ('Kaptur Szronu', 'Pancerz Lodu', 'Buty Zmarzliny', 'Rękawice Mrozu', 'Sygnet Zamieci', 'Talizman Lodu', 'Tarcza Szronu')],
      },
      nekropolia: {
        label: 'Nekropolia Kruków', ic: '⚰', unlockFloor: 60, ilvl: [60, 70],
        opis: 'Kamienne grobowce otwierają się tylko wtedy, gdy nadchodzi ktoś żywy.',
        mats: [
          { id: 'odlamekduszy',  szansa: 0.72, ile: [3, 6] },
          { id: 'krysztalmagii', szansa: 0.34, ile: [2, 5] },
        ],
        bossMats: [{ id: 'koscpradawna', szansa: 1, ile: [1, 1] }],
        drops: [...BRONIE, ...PANCERZ('Korona Kości', 'Kirys Grobowy', 'Nagolenniki Kości', 'Chwyty Umarłych', 'Sygnet Kruka', 'Wisior Dusz', 'Puklerz Kości')],
      },
      cytadela: {
        label: 'Cytadela Burz', ic: '⚡', unlockFloor: 70, ilvl: [70, 80],
        opis: 'Twierdza zawieszona w chmurach. Każdy krok ściąga kolejne wyładowanie.',
        mats: [
          { id: 'krysztalburzy', szansa: 0.72, ile: [3, 6] },
          { id: 'krysztalmagii', szansa: 0.36, ile: [3, 5] },
        ],
        bossMats: [{ id: 'rdzengromu', szansa: 1, ile: [1, 1] }],
        drops: [...BRONIE, ...PANCERZ('Hełm Gromu', 'Kirys Burzy', 'Buty Wichru', 'Karwasze Błyskawic', 'Pierścień Burzy', 'Amulet Gromu', 'Tarcza Nawałnicy')],
      },
      szczelina: {
        label: 'Szczelina Otchłani', ic: '◉', unlockFloor: 80, ilvl: [80, 90],
        opis: 'Kamień kończy się pod stopami, ale ścieżka prowadzi dalej przez ciemność.',
        mats: [
          { id: 'odlamekpustki', szansa: 0.72, ile: [4, 7] },
          { id: 'krysztalmagii', szansa: 0.38, ile: [3, 6] },
        ],
        bossMats: [{ id: 'okootchlani', szansa: 1, ile: [1, 1] }],
        drops: [...BRONIE, ...PANCERZ('Maska Otchłani', 'Płaszcz Otchłani', 'Kroki Pustki', 'Chwyty Cienia', 'Krąg Otchłani', 'Oko Pustki', 'Tarcza Cienia')],
      },
      szczyt: {
        label: 'Szczyt Milczących Gwiazd', ic: '✦', unlockFloor: 90, ilvl: [90, 100],
        opis: 'Ostatni znany szlak starej mapy. Nad nim nie ma już nieba.',
        mats: [
          { id: 'pylgwiezdny',   szansa: 0.72, ile: [4, 8] },
          { id: 'krysztalmagii', szansa: 0.40, ile: [4, 7] },
        ],
        bossMats: [{ id: 'sercekomety', szansa: 1, ile: [1, 1] }],
        drops: [...BRONIE, ...PANCERZ('Diadem Gwiazd', 'Szata Gwiazd', 'Trzewiki Komety', 'Karwasze Nieba', 'Pierścień Gwiazd', 'Amulet Komety', 'Aegis Gwiazd')],
      },
      ruiny: {
        label: 'Prastare Ruiny', ic: '🗿', unlockFloor: 100, ilvl: [100, 125],
        opis: 'Pierwsza długa wyprawa poza starą mapą. Dwadzieścia pięć poziomów ruin.',
        mats: [
          { id: 'stoppradawny',  szansa: 0.72, ile: [5, 9] },
          { id: 'krysztalmagii', szansa: 0.42, ile: [4, 8] },
        ],
        bossMats: [{ id: 'tablicaruniczna', szansa: 1, ile: [1, 1] }],
        drops: [...BRONIE, ...PANCERZ('Korona Pradawnych', 'Pancerz Runiczny', 'Buty Strażnika', 'Karwasze Runiczne', 'Sygnet Pradawnych', 'Relikwiarz Run', 'Tarcza Pradawnych')],
      },
      morzepopiolu: {
        label: 'Morze Popiołu', ic: '🔥', unlockFloor: 125, ilvl: [125, 150],
        opis: 'Martwy ocean pyłu. Każdy ślad znika, zanim zdążysz się obejrzeć.',
        mats: [
          { id: 'perlapopiolu',  szansa: 0.72, ile: [6, 10] },
          { id: 'krysztalmagii', szansa: 0.44, ile: [5, 9] },
        ],
        bossMats: [{ id: 'rdzenzaru', szansa: 1, ile: [1, 1] }],
        drops: [...BRONIE, ...PANCERZ('Maska Żaru', 'Pancerz Popiołu', 'Stąpacze Żaru', 'Chwyty Płomienia', 'Pierścień Żaru', 'Serce Popiołu', 'Tarcza Spalenizny')],
      },
      ogrodypustki: {
        label: 'Ogrody Pustki', ic: '☄', unlockFloor: 150, ilvl: [150, 175],
        opis: 'Rośliny z czarnego szkła wyrastają tam, gdzie zgasły całe światy.',
        mats: [
          { id: 'szklanykwiat', szansa: 0.72, ile: [7, 12] },
          { id: 'krysztalmagii', szansa: 0.46, ile: [6, 10] },
        ],
        bossMats: [{ id: 'nasionopustki', szansa: 1, ile: [1, 1] }],
        drops: [...BRONIE, ...PANCERZ('Kaptur Pustki', 'Szata Pustki', 'Kroki Nicości', 'Dłonie Nicości', 'Pierścień Pustki', 'Kwiat Nicości', 'Aegis Pustki')],
      },
      tronkonca: {
        label: 'Tron Końca', ic: '♛', unlockFloor: 175, ilvl: [175, 200],
        opis: 'Droga do dwusetnego poziomu. Wszystko, co żyje niżej, boi się tego miejsca.',
        mats: [
          { id: 'fragmentkonca', szansa: 0.72, ile: [8, 14] },
          { id: 'krysztalmagii', szansa: 0.48, ile: [7, 12] },
        ],
        bossMats: [{ id: 'koronnyrdzen', szansa: 1, ile: [1, 1] }],
        drops: [...BRONIE, ...PANCERZ('Korona Końca', 'Kirys Końca', 'Buty Ostatniej Drogi', 'Chwyty Końca', 'Pieczęć Końca', 'Oko Końca', 'Tarcza Końca')],
      },
    },

    // ---- MODYFIKATORY ----
    // Gracz sam podkręca trudność, a każde utrudnienie podnosi mnożnik nagrody.
    // Kolejne otwierają się wraz z postępem w wieży.
    modyfikatory: {
      zahartowani: { label: 'Zahartowani', desc: 'Wrogowie mają +25% zdrowia',
                     hp: 1.25, reward: 0.25, unlockFloor: 1 },
      wscieklizna: { label: 'Wścieklizna', desc: 'Wrogowie zadają +20% obrażeń',
                     dmg: 1.20, reward: 0.20, unlockFloor: 1 },
      suchaziemia: { label: 'Sucha ziemia', desc: 'Leczenie słabsze o 20%',
                     heal: 0.80, reward: 0.20, unlockFloor: 4 },
      lowynaelity: { label: 'Łowy na elity', desc: 'Dwie zwykłe walki zamieniają się w elity',
                     elity: 2, reward: 0.30, unlockFloor: 7 },
      bezpostoju:  { label: 'Bez postoju', desc: 'Znika postój — nic nie odeślesz przed bossem',
                     bezPostoju: true, reward: 0.35, unlockFloor: 10 },
    },

    // Szkielet runu. Generowany z ziarna, więc ten sam seed daje ten sam run —
    // da się go powtórzyć przy szukaniu błędu.
    //
    // 'walka'     zwykły encounter
    // 'rozdroze'  STOP — run czeka na decyzję gracza
    // 'event'     jednorazowe zdarzenie z wyborem
    // 'safepoint' jedyne miejsce, gdzie da się cokolwiek wynieść przed bossem
    // 'elita'     mocniejszy przeciwnik
    // 'boss'      koniec runu; dopiero jego śmierć oddaje sakwę
    szkielet: ['walka', 'walka', 'rozdroze', 'walka', 'event',
               'safepoint', 'walka', 'rozdroze', 'elita', 'boss'],

    elitaMult: 1.6,            // statystyki elity
    // Boss ma być ścianą zdrowia, nie egzekucją w dwa ciosy. Jeden wspólny
    // mnożnik 2,4 podbijał na Profesjonaliście także obrażenia: 1,30 × 2,40
    // dawało 3,12 bazowego ataku. Rozdzielenie zostawia długą walkę, ale daje
    // graczowi czas na Obronę, leczenie i umiejętności.
    bossHpMult: 2.4,
    // Boss zachowuje grubą pulę HP, ale nie dostaje dodatkowych obrażeń ponad
    // mnożnik wybranego ryzyka. Profesjonalista: 1,30× zamiast 1,495× bazy.
    bossDmgMult: 1.00,

    // SAFEPOINT: wynosisz JEDEN przedmiot i JEDEN rodzaj surowca (cały stos).
    // Reszta sakwy dalej wisi na szali aż do bossa. To jedyne wcześniejsze
    // wyjście dla łupu i celowo jest wąskie.
    safepoint: { items: 1, matTypes: 1 },

    // Rozdroża. Każde ma dwie ścieżki i realne konsekwencje — nie ma tu
    // wyborów pozornych.
    rozdroza: [
      { id: 'jaskinia', pytanie: 'Ścieżka rozwidla się przy wejściu do jaskini.',
        opcje: [
          { id: 'jaskinia', label: 'Ciemna jaskinia', desc: 'Elita zamiast zwykłej walki.',
            skutek: { nastepny: 'elita', lootMult: 1.4 } },
          { id: 'obejscie', label: 'Obejście po grani', desc: 'Zwykła walka, mniejszy łup.',
            skutek: { nastepny: 'walka', lootMult: 0.85 } },
        ] },
      { id: 'obozowisko', pytanie: 'Widać dym z obozowiska i ślady zwierza.',
        opcje: [
          { id: 'oboz', label: 'Odpocznij w obozie', desc: 'Odzyskujesz 20% zdrowia. Bez łupu.',
            skutek: { heal: 0.20, nastepny: 'walka', lootMult: 0.7 } },
          { id: 'trop', label: 'Idź po tropie', desc: 'Mocniejszy przeciwnik, lepszy łup.',
            skutek: { nastepny: 'elita', lootMult: 1.3 } },
        ] },
      { id: 'sztolnia', pytanie: 'Zawalona sztolnia. Da się wejść, ale coś tam mieszka.',
        opcje: [
          { id: 'kop', label: 'Przekop się', desc: 'Kryształ Magii do sakwy, potem walka.',
            skutek: { material: 'krysztalmagii', ile: [1, 2], nastepny: 'walka' } },
          { id: 'omin', label: 'Omiń sztolnię', desc: 'Bezpieczniej, ale nic z tego nie masz.',
            skutek: { nastepny: 'walka', lootMult: 0.9 } },
        ] },
    ],

    // Zdarzenia. Jedno wystąpienie na run, wybrane ziarnem.
    eventy: [
      { id: 'skrzynia', pytanie: 'Przeklęta skrzynia. Zamek ustępuje pod palcami.',
        opcje: [
          { id: 'otworz', label: 'Otwórz', desc: 'Lepszy łup do końca runu, ale wrogowie biją +15%.',
            skutek: { klatwa: { id: 'skrzynia', label: 'Klątwa skrzyni', mobDmg: 1.15 }, lootMult: 1.35 } },
          { id: 'zostaw', label: 'Zostaw', desc: 'Idziesz dalej bez zmian.', skutek: {} },
        ] },
      { id: 'wedrowiec', pytanie: 'Ranny wędrowiec prosi o miksturę.',
        opcje: [
          { id: 'pomoz', label: 'Pomóż', desc: 'Tracisz miksturę, dostajesz błogosławieństwo (+10% łupu).',
            skutek: { potion: -1, blogo: { id: 'wedrowiec', label: 'Wdzięczność', lootMult: 1.10 } } },
          { id: 'mijaj', label: 'Mijaj', desc: 'Nic nie tracisz i nic nie zyskujesz.', skutek: {} },
        ] },
      { id: 'zrodlo', pytanie: 'Źródło pod korzeniami. Woda pachnie ziołami.',
        opcje: [
          { id: 'pij', label: 'Napij się', desc: 'Odzyskujesz 25% zdrowia.', skutek: { heal: 0.25 } },
          { id: 'napelnij', label: 'Napełnij bukłak', desc: 'Dostajesz miksturę.', skutek: { potion: 1 } },
        ] },
    ],
  },

  // ---------- DUNGEONY ----------
  // Wyprawa służy surowcom. Dungeon służy WYŁĄCZNIE sprzętowi: pięć komnat,
  // żadnych rozdroży i ognisk, elita gwarantuje przedmiot, boss skrzynię 3–6.
  dungeons: {
    potionCap: 8,
    healAfterWinPct: 0.12,
    goldMult: 1.20,
    // Każda zabita jednostka wykonuje własny rzut. Zwykłe posiłki kończą się
    // na Unique; Heroic i wyżej pozostają nagrodą za elitę lub skrzynię bossa.
    mobDropChance: 0.08,
    eliteMobDropChance: 0.15,
    weightsMob: { common: 70000, uncommon: 28000, unique: 2000, heroic: 0,
                  legendary: 0, mystic: 0, god: 0 },
    normalDropChance: 0.30,
    eliteDropChance: 1.00,
    nodes: ['walka', 'walka', 'elita', 'walka', 'boss'],
    elitaMult: 1.55,
    bossHpMult: 2.20,
    bossDmgMult: 1.05,
    activeEnemyCap: 5,
    // Sojusznik nadal daje znacznie więcej mocy, niż dopisuje przeciwnikom.
    // Skala tylko zapobiega sytuacji, w której pełna piątka kasuje loch bez strat.
    partyHpPerExtra: 0.16,
    partyDmgPerExtra: 0.08,
    // Prawdziwy grind Dungeonu: pięciu stoi na arenie, reszta czeka w kolejce
    // i wchodzi natychmiast po śmierci jednostki. Na razie pionowy prototyp ma
    // Gniazdo Cierni; pozostałe lochy zachowują dotychczasowe krótkie paczki,
    // dopóki nie dostroimy czasu i zużycia mikstur na żywych postaciach.
    reinforcementTemplates: [
      { label: 'Cierniowy Taran',     klasa: 'wojownik', row: 1, damageType: 'smash',  hp: 1.20, dmg: 0.90, armor: 1.15, speed: -7, ic: '🛡' },
      { label: 'Rozpruwacz Pnączy',   klasa: 'tancerz',  row: 1, damageType: 'slash',  hp: 0.88, dmg: 1.12, armor: 0.82, speed:  7, ic: '⚔' },
      { label: 'Kolczasty Oszczepnik',klasa: 'lowca',    row: 3, damageType: 'pierce', hp: 0.78, dmg: 1.05, armor: 0.72, speed:  3, ic: '➶' },
      { label: 'Szept Korzeni',       klasa: 'mag',      row: 2, damageType: 'magic',  hp: 0.72, dmg: 1.10, armor: 0.66, speed:  0, ic: '✦' },
      { label: 'Strażnik Gniazda',    klasa: 'paladyn',  row: 1, damageType: 'smash',  hp: 1.08, dmg: 0.82, armor: 1.05, speed: -4, ic: '🌿' },
    ],
    // Dungeon jest zawartością dla DRUŻYNY. Jeden cel przegrywał z bohaterem,
    // trzema sojusznikami i petem niezależnie od swoich mnożników, dlatego
    // każda komnata ma obstawę. Wartości są ułamkiem statystyk głównego celu.
    packs: {
      walka: [
        { label: 'Wartownik', klasa: 'wojownik', row: 1, hp: 0.45, dmg: 0.35, armor: 0.80, speed: -6 },
      ],
      elita: [
        { label: 'Ochroniarz Elity', klasa: 'wojownik', row: 1, hp: 0.50, dmg: 0.45, armor: 0.90, speed: -3 },
      ],
      boss: [
        { label: 'Strażnik Bram', klasa: 'wojownik', row: 1, hp: 0.32, dmg: 0.36, armor: 0.90, speed: -4 },
        { label: 'Runiczny Łucznik', klasa: 'lowca', row: 3, hp: 0.24, dmg: 0.42, armor: 0.65, speed: 5 },
      ],
    },
    // Jawne w UI. Zwykła komnata i elita nie mają trzech najwyższych progów;
    // boss używa głównej tabeli bossowej z `loot.weightsBoss`.
    weightsRoom: { common: 45000, uncommon: 49000, unique: 5000, heroic: 1000,
                   legendary: 0, mystic: 0, god: 0 },
    lista: {
      gniazdocierni: {
        label: 'Gniazdo Cierni', ic: '🌿', unlockFloor: 1, ilvl: [1, 25],
        balanceVersion: 2,
        opis: 'Loch wyniszczenia: 5 wrogów naraz, posiłki i 88 przeciwników w całym runie.',
        prototype: true,
        // Odporność nie zastępuje pancerza. To drugi, ograniczony mnożnik:
        // +35% oznacza o 35% mniej obrażeń, wartość ujemna jest podatnością.
        resists: { slash: 0.35, smash: -0.25, pierce: 0, magic: 0.10 },
        rooms: [
          { typ: 'walka', label: 'Brama Pnączy', enemies: 20, active: 5,
            unitHp: 0.38, unitDmg: 0.18, unitArmor: 0.90 },
          { typ: 'walka', label: 'Wylęgarnia', enemies: 20, active: 5,
            unitHp: 0.44, unitDmg: 0.21, unitArmor: 0.96 },
          { typ: 'elita', label: 'Próba Kolców', enemies: 12, active: 5,
            unitHp: 0.56, unitDmg: 0.27, unitArmor: 1.05,
            hazard: { id: 'cierniowyodwet', label: 'Cierniowy Odwet',
              desc: 'Ataki Slash otrzymują 8% zadanych obrażeń jako obrażenia zwrotne.',
              reflectByType: { slash: 0.08 }, reflectCapPct: 0.12 } },
          { typ: 'walka', label: 'Serce Gniazda', enemies: 25, active: 5,
            unitHp: 0.50, unitDmg: 0.24, unitArmor: 1.02 },
          { typ: 'boss', label: 'Matka Cierni', enemies: 11, active: 5,
            addHp: 0.28, addDmg: 0.18, addArmor: 0.90 },
        ],
        drops: DUNGEON_SET('Cierni', 'Kaptur Cierni', 'Kolczuga Cierni', 'Trzewiki Cierni', 'Karwasze Cierni', 'Sygnet Cierni', 'Talizman Cierni', 'Tarcza Cierni'),
      },
      kryptabagien: {
        label: 'Krypta Bagien', ic: '🌫', unlockFloor: 25, ilvl: [25, 50],
        opis: 'Zatopione komnaty, w których zachował się zestaw Bagien.',
        drops: DUNGEON_SET('Bagien', 'Hełm Bagien', 'Kirys Bagien', 'Buty Bagien', 'Rękawice Bagien', 'Pierścień Bagien', 'Amulet Bagien', 'Puklerz Bagien'),
      },
      kuzniazar: {
        label: 'Kuźnia Żaru', ic: '🔥', unlockFloor: 50, ilvl: [50, 75],
        opis: 'Stara kuźnia pod Wąwozem. Boss pilnuje kompletnego zestawu Żaru.',
        drops: DUNGEON_SET('Żaru', 'Maska Żaru', 'Pancerz Żaru', 'Stąpacze Żaru', 'Chwyty Żaru', 'Pieczęć Żaru', 'Serce Żaru', 'Tarcza Żaru'),
      },
      sanktuariumszronu: {
        label: 'Sanktuarium Szronu', ic: '🧊', unlockFloor: 75, ilvl: [75, 100],
        opis: 'Pięć zamarzniętych sal i skrzynia zestawu Szronu.',
        drops: DUNGEON_SET('Szronu', 'Kaptur Szronu', 'Pancerz Szronu', 'Buty Szronu', 'Rękawice Szronu', 'Sygnet Szronu', 'Talizman Szronu', 'Aegis Szronu'),
      },
      grobowieckrukow: {
        label: 'Grobowiec Kruków', ic: '⚰', unlockFloor: 100, ilvl: [100, 125],
        opis: 'Runiczny grobowiec z zestawem Kruków na poziomy 100–125.',
        drops: DUNGEON_SET('Kruków', 'Korona Kruków', 'Kirys Kruków', 'Nagolenniki Kruków', 'Chwyty Kruków', 'Sygnet Kruków', 'Wisior Kruków', 'Puklerz Kruków'),
      },
      bastionburzy: {
        label: 'Bastion Burzy', ic: '⚡', unlockFloor: 125, ilvl: [125, 150],
        opis: 'Twierdza pełna wyładowań. Z jej skrzyni pochodzi zestaw Burzy.',
        drops: DUNGEON_SET('Burzy', 'Hełm Burzy', 'Kirys Burzy', 'Buty Burzy', 'Karwasze Burzy', 'Pierścień Burzy', 'Amulet Burzy', 'Tarcza Burzy'),
      },
      labiryntpustki: {
        label: 'Labirynt Pustki', ic: '◉', unlockFloor: 150, ilvl: [150, 175],
        opis: 'Korytarze bez światła i jawna pula zestawu Pustki.',
        drops: DUNGEON_SET('Pustki', 'Maska Pustki', 'Płaszcz Pustki', 'Kroki Pustki', 'Dłonie Pustki', 'Krąg Pustki', 'Oko Pustki', 'Aegis Pustki'),
      },
      salakoncowa: {
        label: 'Sala Końca', ic: '♛', unlockFloor: 175, ilvl: [175, 200],
        opis: 'Ostatni Dungeon. Pięć komnat i najwyższy zestaw Końca.',
        drops: DUNGEON_SET('Końca', 'Korona Końca', 'Kirys Końca', 'Buty Końca', 'Chwyty Końca', 'Pieczęć Końca', 'Oko Końca', 'Tarcza Końca'),
      },
    },
  },

  // ---------- ŁUP ----------
  loot: {
    dropChance: 0.55,         // szansa, że ze zwykłej walki coś wypadnie
    bossDropCount: [3, 6],    // skrzynia bossa: od-do przedmiotów
    // ---- WAGI RZADKOŚCI ----
    // WAGI SĄ W SETNYCH PROCENTA i sumują się do 100 000, czyli do 100%.
    // Inaczej nie da się zapisać szansy 0,001% — a taka jest na God.
    //
    // LEGENDARNE, EPICKIE (Mystic) I GOD LECĄ WYŁĄCZNIE Z BOSSA.
    // Zwykła walka i wariant „+" mają je wyzerowane, więc bramka nie wymaga
    // osobnego warunku w kodzie — wynika z samych wag.
    //   boss:  legendary 0,3%   ·   Mystic 0,1%   ·   God 0,001%
    // TEN SAM RATE WSZĘDZIE: unique 5%, heroic 1%, reszta to commony i uncommony.
    // Zwykły mob i wariant „+" mają identyczną tabelę — różni je szansa na drop
    // i złoto, nie rzadkość. Boss dokłada trzy górne progi, których nie ma nigdzie indziej.
    weightsNormal: { common: 45000, uncommon: 49000, unique: 5000, heroic: 1000,
                     legendary: 0, mystic: 0, god: 0 },
    weightsPlus:   { common: 45000, uncommon: 49000, unique: 5000, heroic: 1000,
                     legendary: 0, mystic: 0, god: 0 },
    weightsBoss:   { common: 44599, uncommon: 49000, unique: 5000, heroic: 1000,
                     legendary: 300, mystic: 100, god: 1 },

    // ---- PLUS NA ZNALEZIONEJ BRONI ----
    // BROŃ MOŻE WYPAŚĆ JUŻ ULEPSZONA. Dotyczy WYŁĄCZNIE broni — pancerz dalej
    // plusuje się tylko u kowala.
    //
    //   szansa   ile broni w ogóle ma jakikolwiek plus
    //   ratio    o ile RZADSZY jest każdy kolejny stopień (rozkład geometryczny)
    //
    // Ratio 0,682 wyliczone tak, żeby NAJWYŻSZY plus był 1% puli plusowanych,
    // czyli 0,01% wszystkich broni. Rozkład, który z tego wychodzi:
    //   +1 32,5% · +2 22,2% · +3 15,1% · +4 10,3% · +5 7,0%
    //   +6 4,8%  · +7 3,3%  · +8 2,2%  · +9 1,5%  · +10 1,0%
    // Granicę bierze `upgrade.maxPlus`, więc podniesienie jej rozciąga tabelę samo.
    plusNaBroni: { szansa: 0.01, ratio: 0.682 },
    // ilvl przedmiotu względem piętra
    ilvlSpread: [-2, 0],
    // Równe wagi slotów. Wyprawy dodatkowo grupują swój katalog po slocie,
    // więc 12 nazw broni nie podbija już szansy całego slotu Broń.
    slotWeights: {
      bron: 1, offhand: 1, helm: 1, napiersnik: 1,
      buty: 1, rekawice: 1, pierscien: 1, amulet: 1,
    },
  },

  // ---------- RZADKOŚCI ----------
  rarities: {
    common:    { label: 'Common',    mult: 1.00, affixes: 1, energy: 1,   color: '#8C8377' },
    uncommon:  { label: 'Uncommon',  mult: 1.18, affixes: 1, energy: 3,   color: '#5E9E4A' },
    unique:    { label: 'Unique',    mult: 1.42, affixes: 2, energy: 8,   color: '#3E86C4' },
    heroic:    { label: 'Heroic',    mult: 1.75, affixes: 3, energy: 20,  color: '#8A5CC4' },
    legendary: { label: 'Legendary', mult: 2.20, affixes: 3, energy: 50,  color: '#D9822B' },
    mystic:    { label: 'Mystic',    mult: 2.80, affixes: 4, energy: 120, color: '#C4453E' },
    god:       { label: 'God',       mult: 3.60, affixes: 4, energy: 300, color: '#E8C35A' },
  },

  // ---------- EKWIPUNEK ----------
  gear: {
    // slot -> { typ bazy, mnożnik bazy }. Bramka jest jedna: poziom postaci.
    slots: {
      bron:       { label: 'Broń',       base: 'damage', mult: 1.00 },
      offhand:    { label: 'Druga ręka', base: 'mixed',  mult: 0.55 },
      helm:       { label: 'Hełm',       base: 'armor',  mult: 0.60 },
      napiersnik: { label: 'Napierśnik', base: 'armor',  mult: 1.00 },
      buty:       { label: 'Buty',       base: 'armor',  mult: 0.45 },
      rekawice:   { label: 'Rękawice',   base: 'armor',  mult: 0.45 },
      pierscien:  { label: 'Pierścień',  base: 'none',   mult: 0.00 },
      amulet:     { label: 'Naszyjnik',  base: 'none',   mult: 0.00 },
    },
    // OBRAŻENIA BRONI PODNIESIONE Z 4,2 NA 7,0 ZA ILVL. Powód jest jeden i policzony:
    // boss piętra 20 ma mieć 10 000 zdrowia (7× zwykły mob), a przy starej broni
    // bohater w heroikach +3 wygrywał piętro 10 w 3% podejść. Przy 7,0 wraca do 77%.
    weaponDamageBase: 10, weaponDamagePerIlvl: 7.0,
    armorBase: 6, armorPerIlvl: 3.1,
    // próg założenia = ilvl przedmiotu wobec poziomu postaci
    backpackSize: 120,
  },

  // ---------- AFIKSY ----------
  affixes: {
    // rolowane wartości skalują się z ilvl
    pool: [
      { id: 'sila',        label: 'Siła',              min: 2, max: 5,  perIlvl: 0.55 },
      { id: 'precyzja',    label: 'Precyzja',          min: 2, max: 5,  perIlvl: 0.55 },
      { id: 'intelekt',    label: 'Intelekt',          min: 2, max: 5,  perIlvl: 0.55 },
      { id: 'zrecznosc',   label: 'Zręczność',         min: 2, max: 5,  perIlvl: 0.55 },
      { id: 'szczescie',   label: 'Szczęście',         min: 2, max: 5,  perIlvl: 0.40 },
      { id: 'witalnosc',   label: 'Witalność',         min: 2, max: 5,  perIlvl: 0.55 },
      { id: 'wszystkie',   label: 'Wszystkie staty',   min: 1, max: 2,  perIlvl: 0.20 },
      { id: 'dmgFlat',     label: 'Obrażenia',         min: 3, max: 8,  perIlvl: 1.80 },
      { id: 'hpFlat',      label: 'Zdrowie',           min: 8, max: 20, perIlvl: 3.20 },
      { id: 'armorFlat',   label: 'Pancerz',           min: 3, max: 7,  perIlvl: 0.90 },
      { id: 'critChance',  label: 'Szansa na kryt',    min: 1, max: 3,  perIlvl: 0.06, pct: true },
      { id: 'critPower',   label: 'Siła kryta',        min: 3, max: 8,  perIlvl: 0.14, pct: true },
      // ATTACK SPEED jako afiks. Wartość trzymana w SETNYCH AS (35 = +0,35 AS),
      // bo generator afiksów pracuje na liczbach całkowitych. `as: true` mówi
      // UI, żeby pokazał ją jako AS, a nie jako surową liczbę.
      // Wypada NA BRONI I NA KAŻDEJ CZĘŚCI GARDEROBY — patrz `slotWeights`,
      // afiksy nie są przypisane do slotów.
      { id: 'attackSpeed', label: 'Attack Speed',       min: 8, max: 22, perIlvl: 0.55, as: true },
      { id: 'accuracy',    label: 'Celność',           min: 1, max: 2,  perIlvl: 0.04, pct: true },
      { id: 'evasion',     label: 'Unik',              min: 1, max: 2,  perIlvl: 0.03, pct: true },
      // Odporności są procentami i mają twardy limit w silniku walki. Dzięki
      // nim część pancerza może być lepsza do konkretnego Dungeonu mimo niższej
      // surowej Obrony — zaczyna się prawdziwe ubieranie pod zawartość.
      { id: 'resistSlash',  label: 'Odporność Slash',   min: 2, max: 5,  perIlvl: 0.08, pct: true },
      { id: 'resistSmash',  label: 'Odporność Smash',   min: 2, max: 5,  perIlvl: 0.08, pct: true },
      { id: 'resistPierce', label: 'Odporność Pierce',  min: 2, max: 5,  perIlvl: 0.08, pct: true },
      { id: 'resistMagic',  label: 'Odporność na magię',min: 2, max: 5,  perIlvl: 0.08, pct: true },
    ],
  },

  // ---------- ULEPSZANIE ----------
  // Sztabami z Kowalstwa. Świadomie BEZ ryzyka spalenia: koszt rośnie liniowo
  // z każdym plusem i to jest cała bariera. Hazard z niszczeniem przedmiotu
  // dojdzie dopiero wtedy, gdy będzie z czego odtwarzać stratę.
  upgrade: {
    maxPlus: 10,
    perPlus: 0.08,                     // +8% obrażeń albo pancerza za plus
    koszt: { sztabamiedzi: 2 },        // mnożone przez (obecny plus + 1)
  },
};

export default CONFIG;
