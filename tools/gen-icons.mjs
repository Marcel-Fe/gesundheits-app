// Erzeugt App-Icons (grünes Feld + weißes Gesundheits-Kreuz) als echte PNGs.
// Lauf: node tools/gen-icons.mjs   → schreibt icons/icon-192.png & icon-512.png
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return (buf) => {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = t[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
})();

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(CRC(td), 0);
  return Buffer.concat([len, td, crc]);
}

function png(size) {
  const [bgR, bgG, bgB] = [0x16, 0xA3, 0x4A]; // grün
  const rows = Buffer.alloc((size * 4 + 1) * size);
  const arm = Math.round(size * 0.16);          // Balkenbreite
  const a0 = (size - arm) / 2, a1 = a0 + arm;   // zentrierter Balken
  const pad = Math.round(size * 0.22);          // Rand des Kreuzes
  for (let y = 0; y < size; y++) {
    const ro = y * (size * 4 + 1);
    rows[ro] = 0; // Filter 0
    for (let x = 0; x < size; x++) {
      const inV = x >= a0 && x < a1 && y >= pad && y < size - pad;
      const inH = y >= a0 && y < a1 && x >= pad && x < size - pad;
      const white = inV || inH;
      const o = ro + 1 + x * 4;
      rows[o] = white ? 255 : bgR;
      rows[o + 1] = white ? 255 : bgG;
      rows[o + 2] = white ? 255 : bgB;
      rows[o + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit, RGBA
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(rows)), chunk('IEND', Buffer.alloc(0))]);
}

mkdirSync('icons', { recursive: true });
for (const s of [192, 512]) {
  writeFileSync(`icons/icon-${s}.png`, png(s));
  console.log(`icons/icon-${s}.png geschrieben`);
}
