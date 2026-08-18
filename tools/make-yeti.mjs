// PLACEHOLDER grafiki Kolosa. Rysowany kodem, bo w repo nie ma zależności
// graficznych — i dlatego ma być PODMIENIONY na prawdziwy obrazek.
// Podmiana: wrzuć własny plik jako public/img/yeti.png. Nic więcej.
//
//   node tools/make-yeti.mjs

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'img');
mkdirSync(OUT, { recursive: true });

const TBL = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = 0xFFFFFFFF;
  for (const b of buf) c = TBL[(c ^ b) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};

function png(w, h, draw) {
  const px = Buffer.alloc(w * h * 4);
  // Kanały MUSZĄ być przycięte do 0–255. Bufor maskuje przepełnienie do ośmiu
  // bitów, więc 260 robiło się 4 i biały śnieg wychodził żółty.
  const kl = (v) => (v < 0 ? 0 : v > 255 ? 255 : v | 0);
  draw((x, y, r, g, b, a = 255) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = ((y | 0) * w + (x | 0)) * 4;
    px[i] = kl(r); px[i + 1] = kl(g); px[i + 2] = kl(b); px[i + 3] = kl(a);
  });
  const raw = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    px.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Yeti: bryła futra na mroźnym tle, dwa świecące ślepia i kły.
// Świadomie prosty — to zaślepka, nie ilustracja.
const W = 640, H = 400;

const elipsa = (set, cx, cy, rx, ry, col, szum = 0) => {
  for (let y = cy - ry; y <= cy + ry; y++) {
    for (let x = cx - rx; x <= cx + rx; x++) {
      const dx = (x - cx) / rx, dy = (y - cy) / ry;
      if (dx * dx + dy * dy > 1) continue;
      const s = szum ? ((Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1 + 1) % 1 : 0.5;
      const d = szum ? (s - 0.5) * szum : 0;
      set(x, y, col[0] + d | 0, col[1] + d | 0, col[2] + d | 0);
    }
  }
};

writeFileSync(join(OUT, 'yeti.png'), png(W, H, (set) => {
  // mroźne tło z pionowym gradientem
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const t = y / H;
      const r = 0x0D + t * 18, g = 0x16 + t * 26, b = 0x22 + t * 34;
      // zamieć: rzadkie jasne punkty
      const s = ((Math.sin(x * 3.17 + y * 7.13) * 43758.5453) % 1 + 1) % 1;
      const snieg = s > 0.9975 ? 90 : 0;
      set(x, y, r + snieg | 0, g + snieg | 0, b + snieg | 0);
    }
  }
  // turnie w tle
  for (const [px, ph] of [[110, 250], [250, 300], [400, 265], [540, 300]]) {
    for (let y = H - ph; y < H; y++) {
      const szer = (y - (H - ph)) * 0.85;
      for (let x = px - szer; x <= px + szer; x++) set(x, y, 0x1B, 0x26, 0x35);
    }
  }

  const cx = W / 2;
  const FUTRO = [0xD8, 0xE4, 0xF0], CIEN = [0xA8, 0xBC, 0xD2];
  elipsa(set, cx - 130, 300, 52, 78, CIEN, 34);            // ramię lewe
  elipsa(set, cx + 130, 300, 52, 78, CIEN, 34);            // ramię prawe
  elipsa(set, cx, 300, 132, 108, FUTRO, 40);               // tors
  elipsa(set, cx, 176, 86, 76, FUTRO, 40);                 // głowa
  elipsa(set, cx, 208, 44, 30, CIEN, 20);                  // pysk

  // ślepia — lodowy błękit
  elipsa(set, cx - 34, 168, 13, 10, [0x6E, 0xD8, 0xFF]);
  elipsa(set, cx + 34, 168, 13, 10, [0x6E, 0xD8, 0xFF]);
  elipsa(set, cx - 34, 168, 5, 6, [0x0B, 0x1B, 0x2A]);
  elipsa(set, cx + 34, 168, 5, 6, [0x0B, 0x1B, 0x2A]);

  // kły
  for (let i = 0; i < 2; i++) {
    const kx = cx + (i ? 16 : -16);
    for (let y = 214; y < 238; y++) {
      const szer = Math.max(0, 6 - (y - 214) / 4);
      for (let x = kx - szer; x <= kx + szer; x++) set(x, y, 0xF6, 0xFA, 0xFF);
    }
  }
}));
console.log('public/img/yeti.png — zaślepka. Podmień własnym plikiem o tej nazwie.');
