// Generator herbu postaci.
// Trzy wartości: kształt, symbol, kolor. Rysowane jako SVG, więc ostre w każdym rozmiarze
// i waży tyle, co nic — trzy liczby w bazie zamiast pliku graficznego.

export const SHAPES = {
  tarcza:    { label: 'Tarcza',     d: 'M50 6 L88 20 V52 C88 76 70 90 50 96 C30 90 12 76 12 52 V20 Z' },
  romb:      { label: 'Romb',       d: 'M50 4 L94 50 L50 96 L6 50 Z' },
  kolo:      { label: 'Koło',       d: 'M50 5 A45 45 0 1 1 49.9 5 Z' },
  szesciokat:{ label: 'Sześciokąt', d: 'M50 4 L90 27 V73 L50 96 L10 73 V27 Z' },
  kaplan:    { label: 'Kapliczka',  d: 'M50 4 L90 24 V62 C90 82 72 92 50 96 C28 92 10 82 10 62 V24 Z' },
  klin:      { label: 'Klin',       d: 'M10 8 H90 V56 L50 96 L10 56 Z' },
};

// Znaki z wymuszoną prezentacją tekstową (U+FE0E), żeby system nie podmienił ich na emoji.
export const SYMBOLS = {
  miecz:   { label: 'Miecz',    g: '⚔︎' },
  mlot:    { label: 'Młot',     g: '⚒︎' },
  gwiazda: { label: 'Gwiazda',  g: '✦' },
  iskra:   { label: 'Iskra',    g: '✧' },
  ksiezyc: { label: 'Księżyc',  g: '☾' },
  proporzec:{ label: 'Proporzec', g: '⚑︎' },
  krzyz:   { label: 'Krzyż',    g: '✚' },
  oko:     { label: 'Oko',      g: '◈' },
  grot:    { label: 'Grot',     g: '▲' },
  slonce:  { label: 'Słońce',   g: '✹' },
  wieza:   { label: 'Wieża',    g: '☗' },
  plaster: { label: 'Plaster',  g: '⬢' },
};

export const COLORS = {
  mosiadz:  { label: 'Mosiądz',  base: '#C89A4A', ink: '#17120B' },
  miedz:    { label: 'Miedź',    base: '#9A5B34', ink: '#160C06' },
  krew:     { label: 'Krew',     base: '#B03A32', ink: '#170807' },
  bluszcz:  { label: 'Bluszcz',  base: '#4E9E6A', ink: '#08160E' },
  stal:     { label: 'Stal',     base: '#6E7C88', ink: '#0C1013' },
  lazur:    { label: 'Lazur',    base: '#4C86A8', ink: '#08131A' },
  ametyst:  { label: 'Ametyst',  base: '#8A5CC4', ink: '#100A18' },
  zloto:    { label: 'Złoto',    base: '#E8C35A', ink: '#1A1405' },
};

export const DEFAULT_CREST = { shape: 'tarcza', symbol: 'miecz', color: 'mosiadz' };

const keys = (o) => Object.keys(o);

export function randomCrest() {
  const pick = (o) => keys(o)[Math.floor(Math.random() * keys(o).length)];
  return { shape: pick(SHAPES), symbol: pick(SYMBOLS), color: pick(COLORS) };
}

export function crestSvg(crest, size = 64) {
  const c = { ...DEFAULT_CREST, ...(crest ?? {}) };
  const shape = SHAPES[c.shape] ?? SHAPES.tarcza;
  const sym = SYMBOLS[c.symbol] ?? SYMBOLS.miecz;
  const col = COLORS[c.color] ?? COLORS.mosiadz;
  const id = `g${c.shape}${c.color}`.replace(/[^a-z0-9]/gi, '');

  return `<svg class="crest" viewBox="0 0 100 100" width="${size}" height="${size}"
    xmlns="http://www.w3.org/2000/svg" role="img" aria-label="herb postaci">
    <defs>
      <linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${col.base}" stop-opacity=".95"/>
        <stop offset="1" stop-color="${col.base}" stop-opacity=".62"/>
      </linearGradient>
    </defs>
    <path d="${shape.d}" fill="url(#${id})" stroke="${col.base}" stroke-width="3"/>
    <path d="${shape.d}" fill="none" stroke="#00000055" stroke-width="1.5" transform="translate(0,2)"/>
    <text x="50" y="58" text-anchor="middle" dominant-baseline="middle"
      font-size="42" fill="${col.ink}"
      font-family="'Iowan Old Style','Palatino Linotype',Palatino,Georgia,serif">${sym.g}</text>
  </svg>`;
}
