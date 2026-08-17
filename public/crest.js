// Generator herbu postaci.
// Cztery wartości: kształt, symbol, kolor środka, kolor obramowania.
// Rysowane jako SVG — ostre w każdym rozmiarze, a w bazie leżą cztery słowa
// zamiast pliku graficznego.

// cy — pionowy środek optyczny kształtu. Każdy ma inny, bo tarcza jest ciężka u dołu,
// a klin u góry. Bez tego symbol pływa.
export const SHAPES = {
  tarcza:    { label: 'Tarcza',     cy: 50, d: 'M50 6 L88 20 V52 C88 76 70 90 50 96 C30 90 12 76 12 52 V20 Z' },
  romb:      { label: 'Romb',       cy: 50, d: 'M50 4 L94 50 L50 96 L6 50 Z' },
  kolo:      { label: 'Koło',       cy: 50, d: 'M50 5 A45 45 0 1 1 49.9 5 Z' },
  szesciokat:{ label: 'Sześciokąt', cy: 50, d: 'M50 4 L90 27 V73 L50 96 L10 73 V27 Z' },
  kaplica:   { label: 'Kapliczka',  cy: 52, d: 'M50 4 L90 24 V62 C90 82 72 92 50 96 C28 92 10 82 10 62 V24 Z' },
  klin:      { label: 'Klin',       cy: 44, d: 'M10 8 H90 V56 L50 96 L10 56 Z' },
};

// Znaki z wymuszoną prezentacją tekstową (U+FE0E), żeby system nie podmienił ich na emoji.
export const SYMBOLS = {
  miecz:    { label: 'Miecz',      g: '⚔︎' },
  mlot:     { label: 'Młot',       g: '⚒︎' },
  kotwica:  { label: 'Kotwica',    g: '⚓︎' },
  waga:     { label: 'Waga',       g: '⚖︎' },
  alembik:  { label: 'Alembik',    g: '⚗︎' },
  kolo:     { label: 'Koło',       g: '⚙︎' },
  lilia:    { label: 'Lilia',      g: '⚜︎' },
  proporzec:{ label: 'Proporzec',  g: '⚑︎' },
  gwiazda:  { label: 'Gwiazda',    g: '✦' },
  iskra:    { label: 'Iskra',      g: '✧' },
  blysk:    { label: 'Błysk',      g: '✶' },
  slonce:   { label: 'Słońce',     g: '✹' },
  rozeta:   { label: 'Rozeta',     g: '❂' },
  kwiat:    { label: 'Kwiat',      g: '❉' },
  splot:    { label: 'Splot',      g: '❋' },
  krzyz:    { label: 'Krzyż',      g: '✚' },
  krzyzyk:  { label: 'Krzyżyk',    g: '✜' },
  malta:    { label: 'Malta',      g: '✠' },
  oko:      { label: 'Oko',        g: '◈' },
  romb:     { label: 'Romb',       g: '◆' },
  grot:     { label: 'Grot',       g: '▲' },
  ostrze:   { label: 'Ostrze',     g: '▼' },
  plaster:  { label: 'Plaster',    g: '⬢' },
  ksiezyc:  { label: 'Księżyc',    g: '☾' },
  wieza:    { label: 'Wieża',      g: '☗' },
  wiez2:    { label: 'Baszta',     g: '♜' },
  rycerz:   { label: 'Rycerz',     g: '♞' },
  korona:   { label: 'Korona',     g: '♛' },
  trojzab:  { label: 'Trójząb',    g: '♆' },
  glob:     { label: 'Glob',       g: '♁' },
};

export const COLORS = {
  mosiadz: { label: 'Mosiądz', base: '#C89A4A', ink: '#17120B' },
  miedz:   { label: 'Miedź',   base: '#9A5B34', ink: '#160C06' },
  krew:    { label: 'Krew',    base: '#B03A32', ink: '#170807' },
  bluszcz: { label: 'Bluszcz', base: '#4E9E6A', ink: '#08160E' },
  stal:    { label: 'Stal',    base: '#6E7C88', ink: '#0C1013' },
  lazur:   { label: 'Lazur',   base: '#4C86A8', ink: '#08131A' },
  ametyst: { label: 'Ametyst', base: '#8A5CC4', ink: '#100A18' },
  zloto:   { label: 'Złoto',   base: '#E8C35A', ink: '#1A1405' },
  kosc:    { label: 'Kość',    base: '#D8CDBA', ink: '#1A1712' },
  smola:   { label: 'Smoła',   base: '#2E2822', ink: '#D8CDBA' },
};

export const DEFAULT_CREST = {
  shape: 'tarcza', symbol: 'miecz', color: 'mosiadz', border: 'smola', ink: 'smola',
};

const keys = (o) => Object.keys(o);
let seq = 0;

export function randomCrest() {
  const pick = (o) => keys(o)[Math.floor(Math.random() * keys(o).length)];
  const color = pick(COLORS);
  let border = pick(COLORS);
  if (border === color) border = color === 'smola' ? 'zloto' : 'smola';
  let ink = pick(COLORS);
  if (ink === color) ink = color === 'smola' ? 'kosc' : 'smola';
  return { shape: pick(SHAPES), symbol: pick(SYMBOLS), color, border, ink };
}

export function crestSvg(crest, size = 64) {
  const c = { ...DEFAULT_CREST, ...(crest ?? {}) };
  const shape = SHAPES[c.shape] ?? SHAPES.tarcza;
  const sym = SYMBOLS[c.symbol] ?? SYMBOLS.miecz;
  const fill = COLORS[c.color] ?? COLORS.mosiadz;
  const edge = COLORS[c.border] ?? COLORS.smola;
  const ink = COLORS[c.ink] ?? COLORS.smola;
  const id = 'cg' + (++seq);          // unikalny, inaczej gradienty by się nadpisywały

  return `<svg class="crest" viewBox="0 0 100 100" width="${size}" height="${size}"
    xmlns="http://www.w3.org/2000/svg" role="img" aria-label="herb postaci">
    <defs>
      <linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${fill.base}" stop-opacity="1"/>
        <stop offset="1" stop-color="${fill.base}" stop-opacity=".64"/>
      </linearGradient>
    </defs>
    <path d="${shape.d}" fill="url(#${id})" stroke="${edge.base}" stroke-width="7"
      stroke-linejoin="round"/>
    <text x="50" y="${shape.cy}" text-anchor="middle" dominant-baseline="central"
      font-size="40" fill="${ink.base}"
      font-family="'Iowan Old Style','Palatino Linotype',Palatino,Georgia,serif">${sym.g}</text>
  </svg>`;
}
