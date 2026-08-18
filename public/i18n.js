// JĘZYKI — polski i angielski.
//
// ZASADA: POLSKI TEKST JEST KLUCZEM. `t('Ekwipunek')` zwraca 'Equipment' po
// angielsku i 'Ekwipunek' po polsku. Nie ma osobnej tabeli identyfikatorów.
//
// Dlaczego tak, a nie klucze w rodzaju `nav.equipment`:
//   1. Gra ma 4258 linii z polskim wklejonym w szablony. Wymyślanie kluczy
//      znaczyłoby przepisanie każdego ekranu, a nie dodanie tłumaczenia.
//   2. POLSKI JEST POPRAWNY Z DEFINICJI — brak wpisu w słowniku oddaje tekst
//      wejściowy, więc nieprzetłumaczony ekran pokazuje polski, a nie `???`.
//   3. Komunikaty błędów z serwera przychodzą po polsku i tłumaczą się TYM SAMYM
//      słownikiem. Serwer nie musi wiedzieć o istnieniu języków.
//
// Cena: zmiana polskiej treści gubi tłumaczenie. Dlatego przy poprawianiu
// polskiego tekstu trzeba poprawić też klucz w EN — `brakujace()` na dole
// mówi, czego brakuje.

// ---------------------------------------------------------------- słownik

// Angielskie odpowiedniki. Klucz = dokładny polski tekst z UI.
// Rośnie razem z tłumaczeniem kolejnych ekranów.
const EN = {
  // ---- nawigacja i szkielet ----
  'Przygody': 'Adventures',
  'Drużyna': 'Party',
  'Ekwipunek': 'Equipment',
  'Skille': 'Skills',
  'Przywołanie': 'Summoning',
  'Kronika': 'Chronicle',
  'Pomoc': 'Help',

  // ---- ekran wejścia ----
  'Wybierz swoje logo': 'Choose your emblem',
  'Imię': 'Name',
  'Losuj herb': 'Random emblem',
  'Kształt': 'Shape',
  'Symbol': 'Symbol',
  'Kolor tarczy': 'Shield colour',
  'Kolor obramowania': 'Border colour',
  'Kolor symbolu': 'Symbol colour',
  'Wejdź do wieży': 'Enter the tower',
  'Masz już postać?': 'Already have a character?',
  'kod postaci': 'character code',
  'Wczytaj postać': 'Load character',
  'Podaj imię': 'Enter a name',
  'Nie znaleziono postaci': 'Character not found',

  // ---- ustawienia ----
  'Ustawienia': 'Settings',
  'Motyw': 'Theme',
  'Jakość': 'Quality',
  'Dźwięk': 'Sound',
  'Głośność': 'Volume',
  'Język': 'Language',
  'Wysoka': 'High',
  'Niska': 'Low',
  'Animacje, cienie i gradienty.': 'Animations, shadows and gradients.',
  'Bez animacji i cieni. Dla słabszych telefonów.': 'No animations or shadows. For slower phones.',
  'Mrok': 'Gloom',
  'Mosiądz Świetlisty': 'Radiant Brass',
  'Otchłań': 'Abyss',
  'Krew': 'Blood',
  'Pergamin': 'Parchment',
  'Domyślny. Sadza, kamień i mosiądz.': 'Default. Soot, stone and brass.',
  'Gradient. Tło żyje, panele mają ciepły odblask.': 'Gradient. The background breathes, panels catch a warm glow.',
  'Zimny fiolet i stal.': 'Cold violet and steel.',
  'Czerń i rdza. Najciemniejszy.': 'Black and rust. The darkest one.',
  'Jedyny jasny. Na dzień i na słońce.': 'The only light one. For daylight.',

  // ---- karta gracza ----
  'Moc': 'Power',
  'Poziom': 'Level',
  'Piętro': 'Floor',
  'Złoto': 'Gold',
  'Zdrowie': 'Health',
  'Atak': 'Attack',
  'Obrona': 'Defence',
  'Pancerz': 'Armour',
  'Pancerz · pula': 'Armour · pool',
  'O sobie': 'About',
  'Gildia': 'Guild',
  'Konto założone': 'Account created',
  'Ranking': 'Leaderboard',

  // ---- Kolos i Tytan ----
  'Jego liczby': 'Its numbers',
  'Ile Ci brakuje': 'How far you are',
  'Twój cios': 'Your hit',
  'Ciosów na zdarcie pancerza': 'Hits to strip the armour',
  'Ciosów do jego zabicia': 'Hits to kill it',
  'Jego cios w Ciebie': 'Its hit on you',
  'Jego tur do Twojej śmierci': 'Its turns until you die',
  'omijasz go': 'you bypass it',
  'Łup': 'Loot',
  'Jak bije': 'How it strikes',

  // ---- walka ----
  'Walka': 'Combat',
  'Do walki': 'Fight',
  'Uciekaj': 'Flee',
  'Atak słaby': 'Weak strike',
  'Atak średni': 'Medium strike',
  'Atak mocny': 'Strong strike',
  'pudło': 'miss',
  'KRYT': 'CRIT',
  'BLOK': 'BLOCK',
  'podchodzi': 'closes in',
  'pada': 'falls',

  // ---- częste przyciski ----
  'Zamknij': 'Close',
  'Wróć': 'Back',
  'Dalej': 'Next',
  'Anuluj': 'Cancel',
  'Zapisz': 'Save',
  'Przerwij': 'Stop',
  'Potwierdź': 'Confirm',
  'Otwarte': 'Open',
  'Zamknięte': 'Locked',
};

// Formy mnogie. Polski ma trzy (1 / 2–4 / 5+), angielski dwie.
// Klucz = forma pojedyncza po polsku.
const MNOGIE = {
  'mikstura':  { pl: ['mikstura', 'mikstury', 'mikstur'],   en: ['potion', 'potions'] },
  'cios':      { pl: ['cios', 'ciosy', 'ciosów'],           en: ['hit', 'hits'] },
  'tura':      { pl: ['tura', 'tury', 'tur'],               en: ['turn', 'turns'] },
  'piętro':    { pl: ['piętro', 'piętra', 'pięter'],        en: ['floor', 'floors'] },
  'przedmiot': { pl: ['przedmiot', 'przedmioty', 'przedmiotów'], en: ['item', 'items'] },
  'punkt':     { pl: ['punkt', 'punkty', 'punktów'],        en: ['point', 'points'] },
  'sztuka':    { pl: ['sztuka', 'sztuki', 'sztuk'],         en: ['unit', 'units'] },
  'namiot':    { pl: ['namiot', 'namioty', 'namiotów'],     en: ['tent', 'tents'] },
};

export const JEZYKI = [
  { id: 'pl', label: 'Polski',  ic: '🇵🇱' },
  { id: 'en', label: 'English', ic: '🇬🇧' },
];

// ---------------------------------------------------------------- silnik

let LANG = 'pl';

export const getLang = () => LANG;

export function setLang(l) {
  LANG = JEZYKI.some(j => j.id === l) ? l : 'pl';
  // <html lang> to nie ozdoba: od niego zależy dzielenie wyrazów, czytnik
  // ekranowy i podpowiedzi pisowni w polach tekstowych.
  if (typeof document !== 'undefined') document.documentElement.lang = LANG;
  return LANG;
}

// Podstawianie wartości: t('Piętro {n}', { n: 5 }).
const wstaw = (s, vars) => vars
  ? s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m))
  : s;

// TŁUMACZENIE. Brak wpisu oddaje tekst wejściowy — ekran pokazuje wtedy polski,
// a nie pustkę ani identyfikator. To jest celowa siatka bezpieczeństwa.
export function t(s, vars) {
  if (s == null) return '';
  if (LANG === 'pl') return wstaw(String(s), vars);
  const txt = EN[s] ?? String(s);
  return wstaw(txt, vars);
}

// ODMIANA PRZEZ LICZBĘ. `odmiana(5, 'mikstura')` → „5 mikstur" / „5 potions".
// Polskie zasady: 1 → pojedyncza; 2–4 (poza 12–14) → forma druga; reszta → trzecia.
export function odmiana(n, klucz, bezLiczby = false) {
  const f = MNOGIE[klucz];
  const liczba = bezLiczby ? '' : n + ' ';
  if (!f) return liczba + t(klucz);
  if (LANG === 'en') return liczba + f.en[n === 1 ? 0 : 1];
  const abs = Math.abs(n) % 100;
  const ost = abs % 10;
  if (abs === 1) return liczba + f.pl[0];
  if (ost >= 2 && ost <= 4 && !(abs >= 12 && abs <= 14)) return liczba + f.pl[1];
  return liczba + f.pl[2];
}

// ---------------------------------------------------------------- kontrola

// Czego brakuje w słowniku. Do konsoli w czasie tłumaczenia — nie do gry.
// Wywołanie: `import('/i18n.js').then(m => console.table(m.brakujace()))`.
const NIEZNANE = new Set();

export function zglosBrak(s) {
  if (LANG !== 'pl' && s && !EN[s]) NIEZNANE.add(s);
}

export const brakujace = () => [...NIEZNANE].sort();

export const slownik = () => EN;
