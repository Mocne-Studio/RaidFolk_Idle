// Generator ikon PNG — bez zależności, przez wbudowany zlib.
// node tools/make-icons.mjs

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
mkdirSync(OUT, { recursive: true });

// --- CRC32 ---
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

function png(size, draw) {
  const px = Buffer.alloc(size * size * 4);
  draw((x, y, r, g, b, a = 255) => {
    const i = (y * size + x) * 4;
    px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = a;
  });

  // scanline: filter byte 0 + RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Ikona: ciemny kamień + mosiężna wieża. Bez tekstu — czytelna w 48 px.
function drawIcon(size) {
  const S = size, c = S / 2;
  const BG = [0x14, 0x11, 0x0E];
  const BRASS = [0xC8, 0x9A, 0x4A];
  const DARK = [0x8A, 0x67, 0x2C];

  return (set) => {
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      // tło z delikatnym gradientem od góry
      const t = y / S;
      set(x, y, BG[0] + t * 10 | 0, BG[1] + t * 8 | 0, BG[2] + t * 6 | 0);
    }

    // wieża: trzy zwężające się kondygnacje
    const levels = [
      { w: .46, y0: .62, y1: .86 },
      { w: .34, y0: .40, y1: .62 },
      { w: .22, y0: .20, y1: .40 },
    ];
    for (const L of levels) {
      const half = L.w * S / 2;
      for (let y = L.y0 * S | 0; y < L.y1 * S; y++) {
        for (let x = c - half | 0; x < c + half; x++) {
          if (x < 0 || x >= S || y < 0 || y >= S) continue;
          const edge = Math.abs(x - c) > half - Math.max(1, S / 64);
          const col = edge ? DARK : BRASS;
          set(x, y, col[0], col[1], col[2]);
        }
      }
      // ciemna szczelina między kondygnacjami
      const gy = L.y0 * S | 0;
      for (let x = c - half | 0; x < c + half; x++) {
        for (let d = 0; d < Math.max(1, S / 48); d++) {
          if (x >= 0 && x < S && gy + d < S) set(x, gy + d, 0x2A, 0x20, 0x14);
        }
      }
    }

    // iskra na szczycie
    const r = Math.max(1, S / 22);
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
      if (x * x + y * y <= r * r) {
        const px = c + x | 0, py = .17 * S + y | 0;
        if (px >= 0 && px < S && py >= 0 && py < S) set(px, py, 0xE8, 0xC3, 0x5A);
      }
    }
  };
}

for (const size of [192, 512]) {
  writeFileSync(join(OUT, `icon-${size}.png`), png(size, drawIcon(size)));
  console.log(`public/icons/icon-${size}.png`);
}
