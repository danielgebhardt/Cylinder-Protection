/**
 * App icons for the platforms that need bitmaps (iOS app icon + launch logo, web app
 * icons), derived from the same artwork the Android launcher icon was generated from
 * (assets/icon-*.png, see README). Nothing here is committed output: scripts/icon.ts
 * writes the iOS PNGs and scripts/lib/webapp.ts emits the web icons into the build.
 *
 * Dependency-free on purpose (runs on the macOS CI runner and inside Vite): a minimal
 * PNG decoder for 8-bit RGB/RGBA, an area-averaging resampler and a PNG encoder.
 */
import { readFileSync } from 'node:fs';
import { deflateSync, inflateSync } from 'node:zlib';

/** Dark green at the edge of the Android icon / splash background (launch screens). */
export const LAUNCH_BG = '#14240F';
/** The game's page background (index.html, Capacitor backgroundColor). */
export const PAGE_BG = '#0C1428';

const ASSETS = new URL('../../assets/', import.meta.url);

/** RGBA image, premultiplied alpha, channel values 0..255. */
interface Img {
  w: number;
  h: number;
  px: Float32Array;
}

function readPng(name: string): Img {
  const buf = readFileSync(new URL(name, ASSETS));
  let pos = 8;
  let w = 0;
  let h = 0;
  let channels = 0;
  const idat: Buffer[] = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('latin1', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      const [depth, color, , , interlace] = data.subarray(8);
      channels = color === 6 ? 4 : color === 2 ? 3 : 0;
      if (depth !== 8 || !channels || interlace) throw new Error(`${name}: only 8-bit RGB/RGBA non-interlaced PNGs`);
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * channels;
  const out = new Uint8Array(w * h * channels);
  for (let y = 0; y < h; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? out[y * stride + i - channels] : 0;
      const b = y > 0 ? out[(y - 1) * stride + i] : 0;
      const c = y > 0 && i >= channels ? out[(y - 1) * stride + i - channels] : 0;
      let v = line[i];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      out[y * stride + i] = v & 255;
    }
  }
  const px = new Float32Array(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const al = channels === 4 ? out[i * 4 + 3] : 255;
    for (let k = 0; k < 3; k++) px[i * 4 + k] = (out[i * channels + k] * al) / 255;
    px[i * 4 + 3] = al;
  }
  return { w, h, px };
}

function crop(img: Img, x0: number, y0: number, w: number, h: number): Img {
  const px = new Float32Array(w * h * 4);
  for (let y = 0; y < h; y++) px.set(img.px.subarray(((y0 + y) * img.w + x0) * 4, ((y0 + y) * img.w + x0 + w) * 4), y * w * 4);
  return { w, h, px };
}

/** One axis of an area-averaging resample: each output cell averages the source span it covers. */
function resampleAxis(img: Img, size: number, horizontal: boolean): Img {
  const src = horizontal ? img.w : img.h;
  const other = horizontal ? img.h : img.w;
  const w = horizontal ? size : img.w;
  const h = horizontal ? img.h : size;
  const px = new Float32Array(w * h * 4);
  const s = src / size;
  for (let o = 0; o < other; o++) {
    for (let d = 0; d < size; d++) {
      const a = d * s;
      const b = Math.min(src, a + Math.max(s, 1));
      const acc = [0, 0, 0, 0];
      let total = 0;
      for (let i = Math.floor(a); i < Math.ceil(b); i++) {
        const wgt = Math.min(b, i + 1) - Math.max(a, i);
        if (wgt <= 0) continue;
        const si = (horizontal ? o * img.w + i : i * img.w + o) * 4;
        for (let k = 0; k < 4; k++) acc[k] += img.px[si + k] * wgt;
        total += wgt;
      }
      const di = (horizontal ? o * w + d : d * w + o) * 4;
      for (let k = 0; k < 4; k++) px[di + k] = acc[k] / total;
    }
  }
  return { w, h, px };
}

const resize = (img: Img, size: number): Img => resampleAxis(resampleAxis(img, size, true), size, false);

function over(bottom: Img, top: Img): Img {
  const px = new Float32Array(bottom.px);
  for (let i = 0; i < px.length; i += 4) {
    const k = 1 - top.px[i + 3] / 255;
    for (let c = 0; c < 4; c++) px[i + c] = top.px[i + c] + px[i + c] * k;
  }
  return { w: bottom.w, h: bottom.h, px };
}

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));

/** Paint onto a solid colour: fully opaque (iOS rejects app icons with alpha). */
function flatten(img: Img, bg: string): Img {
  const [r, g, b] = hex(bg);
  const solid = new Float32Array(img.px.length);
  for (let i = 0; i < solid.length; i += 4) solid.set([r, g, b, 255], i);
  return over({ w: img.w, h: img.h, px: solid }, img);
}

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function chunk(type: string, data: Buffer): Buffer {
  const td = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  let c = 0xffffffff;
  for (const byte of td) c = CRC[(c ^ byte) & 255] ^ (c >>> 8);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE((c ^ 0xffffffff) >>> 0);
  return Buffer.concat([len, td, crc]);
}

/** Encode as PNG: RGBA, or RGB (no alpha channel at all) when opaque is set. */
function encode(img: Img, opaque: boolean): Buffer {
  const ch = opaque ? 3 : 4;
  const stride = img.w * ch + 1;
  const raw = Buffer.alloc(stride * img.h);
  for (let y = 0; y < img.h; y++) {
    for (let x = 0; x < img.w; x++) {
      const i = (y * img.w + x) * 4;
      const a = img.px[i + 3];
      const o = y * stride + 1 + x * ch;
      for (let k = 0; k < 3; k++) raw[o + k] = a > 0 ? Math.min(255, Math.round((img.px[i + k] * 255) / a)) : 0;
      if (!opaque) raw[o + 3] = Math.round(a);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(img.w, 0);
  ihdr.writeUInt32BE(img.h, 4);
  ihdr.set([8, opaque ? 2 : 6, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** The full launcher icon (assets/icon-only.png, the Android legacy icon), opaque. */
export const squareIcon = (size: number): Buffer => encode(resize(flatten(readPng('icon-only.png'), LAUNCH_BG), size), true);

/**
 * Maskable web icon: the Android adaptive icon (background + foreground layers). Its
 * artwork sits in the centre like Android's safe zone, so any mask shape keeps it whole.
 */
export const maskableIcon = (size: number): Buffer =>
  encode(resize(flatten(over(readPng('icon-background.png'), readPng('icon-foreground.png')), LAUNCH_BG), size), true);

/** Launch-screen logo: the glowing Moonwell from the adaptive foreground, transparent. */
export const launchLogo = (size: number): Buffer => encode(resize(crop(readPng('icon-foreground.png'), 224, 212, 576, 576), size), false);
