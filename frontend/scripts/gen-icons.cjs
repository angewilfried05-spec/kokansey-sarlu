// Génère les icônes KOKANSEY (logo "K" or sur fond vert) en PNG + ICO.
// Usage : node scripts/gen-icons.cjs  → écrit dans ../public/
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const GREEN = [26, 77, 46];      // #1a4d2e
const GOLD = [201, 162, 39];     // #c9a227

// --- helpers pixel ---
function makeCanvas(size) {
  return new Uint8Array(size * size * 4);
}
function setPx(buf, size, x, y, [r, g, b, a = 255]) {
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const i = (y * size + x) * 4;
  buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = a;
}
function distToSeg(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx, cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}
function drawLogo(size) {
  const buf = makeCanvas(size);
  const R = size * 0.19;                      // arrondi des coins
  // fond vert arrondi
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const inX = x >= R && x < size - R, inY = y >= R && y < size - R;
      let inside = inX || inY;
      if (!inside) {
        const cx = x < R ? R : size - R, cy = y < R ? R : size - R;
        inside = Math.hypot(x - cx + 0.5, y - cy + 0.5) <= R;
      }
      if (inside) setPx(buf, size, x, y, GREEN);
    }
  }
  // lettre K : barre verticale + 2 bras
  const sw = size * 0.11;                     // épaisseur des traits
  const cx0 = size * 0.345;
  const y0 = size * 0.28, y1 = size * 0.72;   // haut/bas de la barre
  const jx = cx0, jy = size * 0.50;           // jonction
  const ax = size * 0.67;                     // extrémité droite des bras
  const segs = [
    [cx0, y0, cx0, y1],
    [jx + sw * 0.3, jy, ax, y0 + size * 0.02],
    [jx + sw * 0.3, jy, ax, y1 - size * 0.02],
  ];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (segs.some(([x1, y1, x2, y2]) => distToSeg(x, y, x1, y1, x2, y2) <= sw / 2)) {
        setPx(buf, size, x, y, GOLD);
      }
    }
  }
  return buf;
}

// --- encodage PNG (sans dépendance) ---
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function encodePNG(rgba, size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filtre none
    Buffer.from(rgba.buffer, y * size * 4, size * 4).copy(raw, y * (size * 4 + 1) + 1);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0)),
  ]);
}
function encodeICO(png, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(1, 4);
  const dir = Buffer.alloc(16);
  dir[0] = size >= 256 ? 0 : size; dir[1] = size >= 256 ? 0 : size;
  dir.writeUInt16LE(1, 6); dir.writeUInt16LE(32, 8);
  dir.writeUInt32LE(png.length, 8); dir.writeUInt32LE(22, 12);
  return Buffer.concat([header, dir, png]);
}

const outDir = path.join(__dirname, '..', 'public');
for (const size of [512, 192, 48]) {
  const png = encodePNG(drawLogo(size), size);
  if (size === 48) {
    fs.writeFileSync(path.join(outDir, 'favicon.ico'), encodeICO(png, size));
    console.log('favicon.ico');
  } else {
    fs.writeFileSync(path.join(outDir, `icon-${size}.png`), png);
    console.log(`icon-${size}.png`);
  }
}
