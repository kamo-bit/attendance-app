import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { gzipSync } from "node:zlib";
import ts from "typescript";
import sharp from "sharp";

const require = createRequire(import.meta.url);
const output = ts.transpileModule(readFileSync(new URL("../src/lib/profile-photo.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;
const compiled = { exports: {} };
new Function("exports", "require", output)(compiled.exports, require);
const { normalizeProfilePhoto, MAX_PROFILE_PHOTO_BYTES, ProfilePhotoError } = compiled.exports;

async function inspect(input) {
  const result = await normalizeProfilePhoto(input);
  const metadata = await sharp(result).metadata();
  assert.equal(metadata.format, "webp");
  assert.equal(metadata.width, 256);
  assert.equal(metadata.height, 256);
  assert.ok(!metadata.pages || metadata.pages === 1);
  assert.ok(result.length <= 128 * 1024);
  assert.equal(metadata.exif, undefined);
  assert.equal(metadata.icc, undefined);
  return result;
}

const solid = () => sharp({ create: { width: 32, height: 24, channels: 3, background: { r: 220, g: 40, b: 20 } } });
async function assertRed(input) {
  const result = await inspect(input);
  const { data } = await sharp(result).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const center = (128 * 256 + 128) * 4;
  assert.ok(data[center] > 200 && data[center + 1] < 70 && data[center + 2] < 70, `unexpected RGB ${Array.from(data.subarray(center, center + 4))}`);
  assert.equal(data[center + 3], 255);
}

function bmp(bits = 24, width = 4, height = 4) {
  const colors = bits <= 8 ? 2 : 0;
  const offset = 54 + colors * 4;
  const stride = Math.ceil(width * bits / 32) * 4;
  const buffer = Buffer.alloc(offset + stride * height);
  buffer.write("BM"); buffer.writeUInt32LE(buffer.length, 2); buffer.writeUInt32LE(offset, 10);
  buffer.writeUInt32LE(40, 14); buffer.writeInt32LE(width, 18); buffer.writeInt32LE(height, 22);
  buffer.writeUInt16LE(1, 26); buffer.writeUInt16LE(bits, 28); buffer.writeUInt32LE(colors, 46);
  if (colors) buffer[54 + 4 + 2] = 255;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const start = offset + stride * y;
      if (bits === 1) buffer[start + (x >> 3)] |= 1 << (7 - x % 8);
      else if (bits === 4) buffer[start + (x >> 1)] |= 1 << (x % 2 ? 0 : 4);
      else if (bits === 8) buffer[start + x] = 1;
      else if (bits === 16) buffer.writeUInt16LE(0x7c00, start + x * 2);
      else buffer[start + x * (bits / 8) + 2] = 255;
    }
  }
  return buffer;
}

function icon(payload, width = 16, height = 16, bits = 32) {
  const header = Buffer.alloc(22);
  header.writeUInt16LE(1, 2); header.writeUInt16LE(1, 4);
  header[6] = width === 256 ? 0 : width; header[7] = height === 256 ? 0 : height;
  header.writeUInt16LE(1, 10); header.writeUInt16LE(bits, 12);
  header.writeUInt32LE(payload.length, 14); header.writeUInt32LE(22, 18);
  return Buffer.concat([header, payload]);
}

test("normalizes JPEG, PNG, WebP, GIF, TIFF and AVIF to small static WebP", async () => {
  for (const format of ["jpeg", "png", "webp", "gif", "tiff", "avif"])
    await inspect(await solid().toFormat(format).toBuffer());
});

test("uses only the first frame of animated GIF and WebP", async () => {
  const frames = Buffer.alloc(16 * 32 * 3);
  for (let index = 0; index < 16 * 32; index++) frames[index * 3 + (index < 16 * 16 ? 0 : 2)] = 255;
  for (const format of ["gif", "webp"]) {
    const source = await sharp(frames, { raw: { width: 16, height: 32, channels: 3, pageHeight: 16 } })
      .toFormat(format, { loop: 0, delay: [100, 100] }).toBuffer();
    assert.equal((await sharp(source, { animated: true }).metadata()).pages, 2);
    await assertRed(source);
  }
});

test("rasterizes a safe SVG and rejects active/external SVG including disguised encodings", async () => {
  const safe = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="24"><rect width="32" height="24" fill="#f00"/></svg>';
  await assertRed(Buffer.from(safe));
  const attacks = [
    '<!DOCTYPE svg [<!ENTITY payload SYSTEM "file:///etc/passwd">]>' + safe,
    safe.replace("<rect", '<script>alert(1)</script><rect'),
    safe.replace("<rect", '<s:script xmlns:s="http://www.w3.org/2000/svg">alert(1)</s:script><rect'),
    safe.replace("<rect", '<image href="https://example.test/image.png"/><rect'),
    safe.replace("<rect", '<image href="&#104;ttps://example.test/image.png"/><rect'),
    safe.replace("<rect", '<style>@import "https://example.test/style";</style><rect'),
    safe.replace('fill="#f00"', 'fill="url(https://example.test/gradient)"'),
    safe.replace("<rect", '<foreignObject><div>external</div></foreignObject><rect'),
    safe.replace("<rect", '<rect onclick="alert(1)"/><rect'),
    safe.replace("<rect", '<use xml:base="https://example.test/svg" href="#shape"/><rect'),
  ];
  for (const svg of attacks) await assert.rejects(normalizeProfilePhoto(Buffer.from(svg)), ProfilePhotoError);
  await assert.rejects(normalizeProfilePhoto(gzipSync(safe)), ProfilePhotoError);
  await assert.rejects(normalizeProfilePhoto(Buffer.from(safe, "utf16le")), ProfilePhotoError);
  await assert.rejects(normalizeProfilePhoto(Buffer.from(" ".repeat(2048) + attacks[2])), ProfilePhotoError);
});

test("supports BMP palette, 16/24/32-bit images with correct opaque RGB", async () => {
  for (const bits of [1, 4, 8, 16, 24, 32]) await assertRed(bmp(bits));
  const padded = bmp();
  const withGap = Buffer.concat([padded.subarray(0, 54), Buffer.alloc(8), padded.subarray(54)]);
  withGap.writeUInt32LE(62, 10);
  await assertRed(withGap);
});

test("supports PNG-backed and bitmap-backed ICO without decoding all representations", async () => {
  await inspect(icon(await solid().resize(16, 16).png().toBuffer()));
  for (const bits of [24, 32]) {
    const bitmap = bmp(bits, 16, 16).subarray(14);
    bitmap.writeInt32LE(32, 8);
    const withMask = Buffer.concat([bitmap, Buffer.alloc(4 * 16)]);
    await assertRed(icon(withMask, 16, 16, bits));
  }
});

test("decodes the official synthetic HEIC color-chart fixture using bundled WASM", async () => {
  const fixture = readFileSync(new URL("./fixtures/profile-photo/rainbow.heic", import.meta.url));
  await inspect(fixture);
});

test("auto-orients JPEG before crop and strips source metadata", async () => {
  const width = 16, height = 32;
  const pixels = Buffer.alloc(width * height * 3);
  for (let i = 0; i < width * height; i++) pixels[i * 3 + (i < width * height / 2 ? 0 : 2)] = 255;
  const jpeg = await sharp(pixels, { raw: { width, height, channels: 3 } })
    .withMetadata({ orientation: 6, exif: { IFD0: { Copyright: "test metadata must be removed" } } }).jpeg().toBuffer();
  const result = await inspect(jpeg);
  const { data } = await sharp(result).raw().toBuffer({ resolveWithObject: true });
  const left = (128 * 256 + 32) * 3, right = (128 * 256 + 224) * 3;
  assert.ok(data[left + 2] > 200 && data[right] > 200);
});

test("checks original byte size before conversion, accepts exactly 2MiB, and rejects invalid files", async () => {
  const png = await solid().png().toBuffer();
  await inspect(Buffer.concat([png, Buffer.alloc(MAX_PROFILE_PHOTO_BYTES - png.length)]));
  await assert.rejects(normalizeProfilePhoto(Buffer.alloc(MAX_PROFILE_PHOTO_BYTES + 1)), (error) => error.status === 413);
  for (const input of [Buffer.alloc(0), Buffer.from("not a picture"), Buffer.from("%PDF-1.5"), png.subarray(0, 24), Buffer.from([0xff, 0xd8, 0xff])])
    await assert.rejects(normalizeProfilePhoto(input), ProfilePhotoError);
});

test("rejects compressed image bombs, oversized BMP/ICO headers, malformed palette and truncated bitmap before allocation", async () => {
  const oversizedPng = await sharp({ create: { width: 16_385, height: 1, channels: 3, background: "white" } }).png().toBuffer();
  await assert.rejects(normalizeProfilePhoto(oversizedPng), /Resolusi/);
  const oversizedSvg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="8000" height="6000"/>');
  await assert.rejects(normalizeProfilePhoto(oversizedSvg), ProfilePhotoError);
  const hugeBmp = bmp(); hugeBmp.writeInt32LE(100_000, 18);
  await assert.rejects(normalizeProfilePhoto(hugeBmp), /Resolusi/);
  const hugePalette = bmp(8); hugePalette.writeUInt32LE(0xffffffff, 46);
  await assert.rejects(normalizeProfilePhoto(hugePalette), ProfilePhotoError);
  await assert.rejects(normalizeProfilePhoto(bmp().subarray(0, 56)), ProfilePhotoError);
  const hugeDib = bmp(32, 16, 16).subarray(14); hugeDib.writeInt32LE(100_000, 4);
  await assert.rejects(normalizeProfilePhoto(icon(hugeDib)), /Resolusi/);
  const shortDib = bmp(24, 16, 16).subarray(14, 60); shortDib.writeInt32LE(32, 8);
  await assert.rejects(normalizeProfilePhoto(icon(shortDib)), ProfilePhotoError);
});
