// RaidFolk_idle — WSZYSTKIE LICZBY
// Zmieniasz tutaj, nigdzie indziej. Restart serwera i gotowe.

export const CONFIG = {

  // ---------- WALKA ----------
  combat: {
    tickMs: 100,              // rozdzielczość symulacji
    baseSpeed: 100,           // prędkość odniesienia; 100 = atak co 2 s
    speedToInterval: 20000,   // interval_ms = speedToInterval / speed
    maxTurns: 600,            // bezpiecznik — walka nie może trwać wiecznie
    critBase: 0.05,           // 5% bazowej szansy na kryta
    critMultBase: 1.5,
    armorK: 400,              // redukcja = armor / (armor + K)

    // Siła ciosu — wybierana co turę w walce turowej.
    // Mocniej znaczy rzadziej. To jest cała decyzja tury.
    // charge — ile ładuje pasek ultimate
    strengths: {
      lekki:   { label: 'Lekki',  dmg: 0.60, acc: +0.22, charge: 1 },
      srednio: { label: 'Średni', dmg: 1.00, acc:  0.00, charge: 2 },
      mocno:   { label: 'Mocny',  dmg: 1.75, acc: -0.28, charge: 3 },
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

    // Pasek ultimate. Lekki cios ładuje 1, średni 2, mocny 3.
    chargeMax: 10,
  },

  // ---------------------------------------------------------------- UMIEJĘTNOŚCI
  // Docelowo wychodzone w drzewku. Na razie wszystkie dostępne od startu.
  abilities: {
    okrzyk: {
      label: 'Okrzyk bojowy', cd: 5, charge: 1, target: 'self',
      desc: 'Pancerz −20%, obrażenia +20% przez 3 tury.',
      buff: { id: 'okrzyk', turns: 3, dmgMult: 1.20, armorMult: 0.80 },
    },
    wir: {
      label: 'Wir', cd: 3, charge: 2, target: 'all',
      desc: 'Trzy ciosy po 60% obrażeń we wszystkich przeciwników.',
      hits: 3, dmgMult: 0.60,
    },
    ogluszenie: {
      label: 'Cios ogłuszający', cd: 4, charge: 2, target: 'one',
      desc: '150% obrażeń, 50% szans na ogłuszenie. Ogłuszony traci turę i obrywa krytyki 2× częściej.',
      dmgMult: 1.50, stun: 0.50, stunTurns: 1, stunCritMult: 2.0,
    },
  },

  // Ultimate zależy od typu broni w ręce.
  ultimates: {
    mele:    { label: 'Rozłam',      desc: 'Jeden cios za 400% obrażeń, ignoruje połowę pancerza.',
               dmgMult: 4.0, armorPierce: 0.5, target: 'one' },
    dystans: { label: 'Grad Strzał', desc: 'Pięć strzał po 110% obrażeń, każda trafia osobno.',
               hits: 5, dmgMult: 1.10, target: 'all' },
    magia:   { label: 'Nawałnica',   desc: 'Trzy uderzenia po 190% we wszystkich przeciwników.',
               hits: 3, dmgMult: 1.90, target: 'all' },
  },

  // ---------- LECZENIE ----------
  healing: {
    decayPerUse: 0.10,        // każde kolejne leczenie o 10% słabsze
    decayLinear: true,        // true = 100/90/80, false = 100/90/81
    minEffect: 0.10,          // podłoga — leczenie nigdy nie schodzi poniżej 10%
    autoThreshold: 0.30,      // automat leczy poniżej 30% HP
    startingPotions: 5,
    potionHealPct: 0.35,      // mikstura leczy 35% max HP
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
    hpPerLevel: 12,
    attrPointsPerFloor: 3,
    // Postać startuje z pustymi atrybutami i workiem punktów — pierwsza decyzja
    // gracza to jego build, a nie cudza rozpiska.
    startingAttrs: { sila: 0, intelekt: 0, zrecznosc: 0, wytrzymalosc: 0 },
    startingAttrPoints: 10,
    // mnożniki: (1 + atrybut / dzielnik)
    strDamageDivisor: 100,    // Siła → obrażenia bronią mele
    intMagicDivisor: 100,     // Intelekt → obrażenia magiczne
    agiDamageDivisor: 130,    // Zręczność → obrażenia z dystansu
                              // wyższy dzielnik, bo Zręczność daje też prędkość i kryt
    agiSpeedDivisor: 200,
    agiCritDivisor: 500,      // +0.2% kryta za punkt
    staArmorPerPoint: 2,
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
      label: 'Bohater', dmgAttrs: ['sila', 'intelekt', 'zrecznosc'], dmgDivisor: 110,
      bronie: 'wszystko, co uniesiesz',
      opis: 'Główna postać. Nie ma klasy i nie będzie jej miała — buduje się atrybutami, sprzętem i drzewkiem.',
      startWeapon: 'Wyszczerbiony Topór', startWtype: 'mele',
    },

    // ---- PONIŻEJ: klasy Sojuszników. Gracz ich NIE wybiera. ----
    // Zostają w configu, bo drzewka i skalowanie są policzone i przetestowane.
    // Wejdą, gdy Sojusznicy zaczną walczyć.
    wojownik: {
      label: 'Wojownik', dmgAttrs: ['sila'], dmgDivisor: 100,
      bronie: 'miecz, młot, topór — dwuręczne',
      opis: 'Najprostsza droga w górę wieży. Cała Siła idzie w obrażenia, nic nie dzieli mu uwagi. Wytrzymałość dokłada HP i pancerz, więc znosi więcej błędów niż ktokolwiek inny.',
      startWeapon: 'Wyszczerbiony Topór', startWtype: 'mele',
    },
    paladyn: {
      label: 'Paladyn', dmgAttrs: ['sila', 'intelekt'], dmgDivisor: 115,
      bronie: 'jednoręczna broń i tarcza',
      opis: 'Obrażenia rosną mu i z Siły, i z Intelektu, więc nosi sprzęt, który czysta klasa by wyrzuciła. Płaci za to niższym zyskiem z pojedynczego punktu. Tarcza w drugiej ręce dokłada pancerz zamiast obrażeń.',
      startWeapon: 'Stępiony Miecz', startWtype: 'mele',
      startOffhand: 'Drewniana Tarcza', startOffWtype: 'tarcza',
    },
    lowca: {
      label: 'Łowca', dmgAttrs: ['zrecznosc'], dmgDivisor: 130,
      bronie: 'łuk, kusza, oszczep',
      opis: 'Jedyna klasa, której główny atrybut robi wszystko naraz: Zręczność daje mu obrażenia, prędkość ciosu, celność i unik. Płaci za to niższym mnożnikiem obrażeń z punktu.',
      startWeapon: 'Nadwątlony Łuk', startWtype: 'dystans',
    },
    tropiciel: {
      label: 'Tropiciel', dmgAttrs: ['zrecznosc', 'intelekt'], dmgDivisor: 125,
      bronie: 'broń dwuczłonowa — nośnik i żywioł',
      opis: 'Dystans podszyty żywiołem: obrażenia rosną i ze Zręczności, i z Intelektu. Zręczność dokłada mu przy okazji prędkość, celność i unik, więc rzadko bywa zmarnowana.',
      startWeapon: 'Okuty Oszczep', startWtype: 'dystans',
    },
    mag: {
      label: 'Mag', dmgAttrs: ['intelekt'], dmgDivisor: 100,
      bronie: 'różdżka, orb, księga',
      opis: 'Najwięcej obrażeń z jednego punktu atrybutu. Intelekt nie daje jednak ani HP, ani uniku, ani celności — Mag, który wsypał wszystko w obrażenia, umiera od dwóch ciosów.',
      startWeapon: 'Pęknięta Różdżka', startWtype: 'magia',
    },
    tancerz: {
      label: 'Tancerz Ostrzy', dmgAttrs: ['zrecznosc', 'sila'], dmgDivisor: 125,
      bronie: 'dwie bronie jednoręczne',
      opis: 'Liczy się i Zręczność, i Siła, a druga broń dokłada własne obrażenia zamiast pancerza tarczy. Szybki i celny, ale bez tarczy obrywa wszystko, czego nie zdąży uniknąć.',
      startWeapon: 'Szczerbaty Kordelas', startWtype: 'mele',
      startOffhand: 'Krótkie Ostrze', startOffWtype: 'mele',
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
    duoFromFloor: 3,
    duoStatMult: 0.65,
    // Boss ma być sprawdzianem wytrzymałości, nie ściany obrażeń:
    // wysoki mnożnik HP, niski mnożnik obrażeń.
    bossStatMult: 1.15,
    bossHpMult: 2.6,
    // skalowanie moba wraz z piętrem
    // UWAGA: growth to mnożnik wykładniczy — gracz rośnie liniowo (ilvl + atrybuty),
    // więc trzymaj go blisko 1.01, inaczej po 20 piętrach moby uciekają bezpowrotnie.
    mobHpBase: 60,   mobHpPerFloor: 22,   mobHpGrowth: 1.010,
    mobDmgBase: 9,   mobDmgPerFloor: 2.4, mobDmgGrowth: 1.006,
    mobSpeedBase: 90, mobSpeedPerFloor: 0.6,
    goldBase: 8, goldPerFloor: 3,
    treePointsPerFloor: 1,
    treePointsPerBoss: 5,
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
      resources: [
        { id: 'miedz',   label: 'Miedź',   lvl: 1,  xp: 8,  ms: 3000 },
        { id: 'cyna',    label: 'Cyna',    lvl: 3,  xp: 14, ms: 3800 },
        { id: 'zelazo',  label: 'Żelazo',  lvl: 5,  xp: 24, ms: 4600 },
        { id: 'wegiel',  label: 'Węgiel',  lvl: 8,  xp: 38, ms: 5400 },
        { id: 'mithril', label: 'Mithril', lvl: 12, xp: 60, ms: 6500 },
      ],
    },
    kowalstwo:   { label: 'Kowalstwo',    ic: '🔨', daje: 'przetapianie i sprzęt', zasila: 'Ekwipunek',
      ladder: [['Sztaba miedzi', 1], ['Brąz', 15], ['Stal', 30], ['Stal hartowana', 45], ['Mithril', 60]] },
    rybolowstwo: {
      label: 'Rybołówstwo', ic: '🐟', daje: 'ryby', zasila: 'Gotowanie',
      grywalne: true,
      xpBase: 22,
      resources: [
        { id: 'plotka',   label: 'Płotka',      lvl: 1,  xp: 7,  ms: 3400 },
        { id: 'pstrag',   label: 'Pstrąg',      lvl: 3,  xp: 13, ms: 4200 },
        { id: 'szczupak', label: 'Szczupak',    lvl: 5,  xp: 22, ms: 5000 },
        { id: 'jesiotr',  label: 'Jesiotr',     lvl: 8,  xp: 36, ms: 5800 },
        { id: 'glebinowa',label: 'Ryba głębin', lvl: 12, xp: 58, ms: 6800 },
      ],
    },
    rolnictwo:   { label: 'Rolnictwo',    ic: '🌾', daje: 'rośliny i zwierzęta', zasila: 'Gotowanie i Alchemia',
      ladder: [['Len', 1], ['Zboże', 14], ['Zioła gorzkie', 28], ['Korzeń nocny', 44], ['Kwiat cierniowy', 58]] },
    gotowanie:   { label: 'Gotowanie',    ic: '🍲', daje: 'buffy przed walką', zasila: 'Drużyna i pet',
      ladder: [['Placek', 1], ['Zupa', 18], ['Pieczeń', 34], ['Uczta', 50], ['Uczta wieży', 65]] },
    alchemia:    { label: 'Alchemia',     ic: '⚗', daje: 'mikstury do walki', zasila: 'Walka',
      ladder: [['Słaba mikstura', 1], ['Mikstura', 20], ['Mocna mikstura', 36], ['Eliksir', 52], ['Eliksir wieży', 68]] },
    runy: {
      label: 'Runy', ic: '✦', daje: 'runy dla magii', zasila: 'Magia',
      grywalne: true,
      xpBase: 26,
      resources: [
        { id: 'runaiskry',  label: 'Runa iskry',   lvl: 1,  xp: 9,  ms: 3600 },
        { id: 'runaognia',  label: 'Runa ognia',   lvl: 3,  xp: 16, ms: 4400 },
        { id: 'runamrozu',  label: 'Runa mrozu',   lvl: 6,  xp: 27, ms: 5200 },
        { id: 'runaburzy',  label: 'Runa burzy',   lvl: 9,  xp: 43, ms: 6000 },
        { id: 'runaotchlani',label:'Runa otchłani',lvl: 13, xp: 68, ms: 7000 },
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
    twoHandDmg: 1.35,         // dwuręczna bije mocniej — to jej cała przewaga
    list: {
      melee:     { label: 'Broń biała', ic: '⚔', opis: 'Obrażenia bronią do walki wręcz' },
      dystans:   { label: 'Łuk',        ic: '🏹', opis: 'Obrażenia bronią dystansową' },
      magia:     { label: 'Różdżka',    ic: '✦', opis: 'Obrażenia bronią magiczną' },
      obrona:    { label: 'Obrona',     ic: '🛡', opis: 'Pancerz i szansa na blok' },
      witalnosc: { label: 'Witalność',  ic: '❤', opis: 'Maksymalne zdrowie' },
    },
    // Bonus ZA POZIOM. Skille broni liczą się tylko wtedy, gdy trzymasz tę broń.
    perLevel: {
      melee:     { dmgPct: 0.012 },
      dystans:   { dmgPct: 0.012 },
      magia:     { dmgPct: 0.012 },
      obrona:    { armorPct: 0.015, block: 0.004 },
      witalnosc: { hpPct: 0.010 },
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
    rows: { wojownik: 1, paladyn: 1, tancerz: 1, mag: 2, lowca: 3, tropiciel: 3, bohater: 1 },
    reach: { mele: 1, dystans: 3, magia: 3 },
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
    ally: { hpPct: 0.35, dmgPct: 0.30, armorPct: 0.30, speed: 95 },
    pet:  { hpPct: 0.20, dmgPct: 0.18, armorPct: 0.15, speed: 112 },
    rarityMult: { common: 1.00, uncommon: 1.18, unique: 1.42, heroic: 1.75, legendary: 2.20 },
    // Pet bije szybciej, ale słabiej — ma dokładać stały strumyk, nie ciosy.

    // Drużyna otwiera się po kawałku, a nie cała na starcie. Pierwsze piętra
    // gra się samemu — inaczej gracz nie zdąży poczuć, po co mu ktoś obok.
    //
    // To są progi na PRZYWOŁANIE, nie darmowe prezenty. Sojusznika i peta
    // trzeba sobie wylosować kluczem, gra tylko otwiera taką możliwość.
    unlock: {
      ally1: 3,     // piętro 3 — otwiera się slot i przywoływanie sojuszników
      pet: 10,      // walka przed bossem aktu — otwiera się przywoływanie petów
    },
    // Sloty 2 i 3 są świadomie zamknięte — otworzą się, gdy będzie wiadomo,
    // czym je wypełnić i ile drużyna psuje balans.
    lockedSlots: [1, 2],
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
    potionCap: 10,             // tyle mikstur wolno zużyć na całą wyprawę
    goldMult: 1.4,

    // Poziomy ryzyka. mob to mnożnik statystyk przeciwnika, loot mnożnik szans.
    risks: {
      niskie:  { label: 'Niskie ryzyko',  mob: 0.85, lootMult: 1.0, floorOffset: -2,
                 desc: 'Przeciwnicy słabsi od tych z Twojego piętra. Łup skromny, ale pewny.' },
      rowne:   { label: 'Równe ryzyko',   mob: 1.00, lootMult: 1.6, floorOffset: 0,
                 desc: 'Przeciwnicy jak na Twoim piętrze. Uczciwa wymiana.' },
      wysokie: { label: 'Wysokie ryzyko', mob: 1.30, lootMult: 2.6, floorOffset: 3,
                 desc: 'Mocniejsi, niż powinieneś unieść. Sakwa puchnie, śmierć boli.' },
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
    bossMult: 2.4,             // statystyki bossa wyprawy

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
          { id: 'kop', label: 'Przekop się', desc: 'Garść rudy do sakwy, potem walka.',
            skutek: { material: 'miedz', ile: [3, 8], nastepny: 'walka' } },
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

  // ---------- ŁUP ----------
  loot: {
    dropChance: 0.55,         // szansa, że ze zwykłej walki coś wypadnie
    bossDropCount: [3, 6],    // skrzynia bossa: od-do przedmiotów
    // wagi rzadkości ze zwykłej walki
    weightsNormal: { common: 700, uncommon: 220, unique: 70, heroic: 9, legendary: 1, mystic: 0, god: 0 },
    weightsPlus:   { common: 450, uncommon: 350, unique: 160, heroic: 35, legendary: 5, mystic: 0, god: 0 },
    weightsBoss:   { common: 300, uncommon: 330, unique: 250, heroic: 100, legendary: 20, mystic: 0, god: 0 },
    // ilvl przedmiotu względem piętra
    ilvlSpread: [-2, 0],
    // Wagi slotów. Broń niesie prawie całe obrażenia i dzieli się na 3 typy,
    // więc bez podbicia wagi mag trafiał swoją broń raz na 30 dropów.
    slotWeights: {
      // wagi po skasowaniu Pasa i Spodni rozeszły się na resztę pancerza
      bron: 26, offhand: 11, helm: 12, napiersnik: 13,
      buty: 10, rekawice: 10, pierscien: 10, amulet: 8,
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
    weaponDamageBase: 10, weaponDamagePerIlvl: 4.2,
    armorBase: 6, armorPerIlvl: 3.1,
    // próg założenia = ilvl przedmiotu wobec poziomu postaci
    backpackSize: 120,
  },

  // ---------- AFIKSY ----------
  affixes: {
    // rolowane wartości skalują się z ilvl
    pool: [
      { id: 'sila',        label: 'Siła',              min: 2, max: 5,  perIlvl: 0.55 },
      { id: 'intelekt',    label: 'Intelekt',          min: 2, max: 5,  perIlvl: 0.55 },
      { id: 'zrecznosc',   label: 'Zręczność',         min: 2, max: 5,  perIlvl: 0.55 },
      { id: 'wytrzymalosc',label: 'Wytrzymałość',      min: 2, max: 5,  perIlvl: 0.55 },
      { id: 'wszystkie',   label: 'Wszystkie staty',   min: 1, max: 2,  perIlvl: 0.20 },
      { id: 'dmgFlat',     label: 'Obrażenia',         min: 3, max: 8,  perIlvl: 1.10 },
      { id: 'hpFlat',      label: 'Zdrowie',           min: 8, max: 20, perIlvl: 3.20 },
      { id: 'armorFlat',   label: 'Pancerz',           min: 3, max: 7,  perIlvl: 0.90 },
      { id: 'critChance',  label: 'Szansa na kryt',    min: 1, max: 3,  perIlvl: 0.06, pct: true },
      { id: 'critPower',   label: 'Siła kryta',        min: 3, max: 8,  perIlvl: 0.14, pct: true },
      { id: 'speed',       label: 'Prędkość ataku',    min: 1, max: 3,  perIlvl: 0.10 },
      { id: 'accuracy',    label: 'Celność',           min: 1, max: 2,  perIlvl: 0.04, pct: true },
      { id: 'evasion',     label: 'Unik',              min: 1, max: 2,  perIlvl: 0.03, pct: true },
    ],
  },

  // ---------- ULEPSZANIE (jeszcze nieaktywne w kawałku 1) ----------
  upgrade: {
    bands: [
      { to: 6,  fail: 'nic' },
      { to: 10, fail: 'spadek' },
      { to: 15, fail: 'spalenie' },
    ],
    chances: [null, .95,.92,.88,.84,.80, .70,.62,.55,.45, .25,.20,.15,.10,.05],
    energyPerPlus: [0, 20,40,70,110,160, 240,340,470,640, 850,1100,1400,1750,2150],
  },
};

export default CONFIG;
