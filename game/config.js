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
