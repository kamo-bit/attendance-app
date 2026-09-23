import sharp, { type Sharp } from "sharp";
import { decode as decodeBmp } from "bmp-ts";
import decodeIco from "decode-ico";

export const MAX_PROFILE_PHOTO_BYTES = 2 * 1024 * 1024;
const MAX_PIXELS = 40_000_000;
const MAX_DIMENSION = 16_384;
const MAX_OUTPUT_BYTES = 128 * 1024;
const INVALID_PHOTO = "File foto tidak valid atau format gambar belum didukung. Pilih gambar lain.";

export class ProfilePhotoError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
    this.name = "ProfilePhotoError";
  }
}

function invalid(): never {
  throw new ProfilePhotoError(INVALID_PHOTO);
}

function checkDimensions(width: number | undefined, height: number | undefined) {
  if (!width || !height || !Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1)
    invalid();
  if (width > MAX_DIMENSION || height > MAX_DIMENSION || width * height > MAX_PIXELS)
    throw new ProfilePhotoError("Resolusi foto terlalu besar. Gunakan gambar maksimal 40 megapiksel dan 16.384 piksel per sisi.");
}

function encodedImage(input: Buffer) {
  return sharp(input, { failOn: "warning", limitInputPixels: MAX_PIXELS, pages: 1, sequentialRead: true })
    .timeout({ seconds: 10 });
}

function rawImage(data: Uint8Array | Uint8ClampedArray, width: number, height: number) {
  checkDimensions(width, height);
  if (data.byteLength !== width * height * 4) invalid();
  return sharp(Buffer.from(data.buffer, data.byteOffset, data.byteLength), {
    raw: { width, height, channels: 4 }, limitInputPixels: MAX_PIXELS, failOn: "warning",
  }).timeout({ seconds: 10 });
}

// A raster result is always stored. External references and active SVG content are rejected before libvips sees XML.
function checkSvg(input: Buffer) {
  const svg = input.toString("utf8");
  if (svg.includes("\0") || /<!\s*(?:DOCTYPE|ENTITY)\b|<\s*(?:[\w.-]+:)?(?:script|foreignObject)\b|<\?xml-stylesheet\b|\b(?:on[a-z]+|xml:base)\s*=|@import|\\/i.test(svg))
    throw new ProfilePhotoError("SVG berisi skrip atau referensi eksternal. Gunakan SVG sederhana atau gambar PNG/JPG.");
  for (const match of svg.matchAll(/\b(?:[\w.-]+:)?href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)) {
    if (!/^#[\w.:-]+$/.test(match[1] ?? match[2] ?? match[3] ?? ""))
      throw new ProfilePhotoError("SVG tidak boleh memuat gambar atau sumber eksternal.");
  }
  for (const match of svg.matchAll(/url\s*\(([^)]*)\)/gi)) {
    if (!/^[\s'"]*#[\w.:-]+[\s'"]*$/.test(match[1]))
      throw new ProfilePhotoError("SVG tidak boleh memuat gambar atau sumber eksternal.");
  }
}

function bmpImage(input: Buffer): Sharp {
  if (input.length < 54) invalid();
  const headerSize = input.readUInt32LE(14);
  if (![40, 52, 56, 108, 124].includes(headerSize) || input.length < 14 + headerSize) invalid();
  const width = input.readInt32LE(18);
  const height = Math.abs(input.readInt32LE(22));
  checkDimensions(width, height);
  const bits = input.readUInt16LE(28);
  const compression = input.readUInt32LE(30);
  const colors = input.readUInt32LE(46);
  if (input.readUInt16LE(26) !== 1 || ![1, 4, 8, 16, 24, 32].includes(bits)) invalid();
  // RLE is deliberately excluded: this decoder's RLE implementation does not preserve all pixel layouts.
  if (![0, 3, 6].includes(compression) || (compression !== 0 && bits !== 16 && bits !== 32)) invalid();
  if (colors > 256 || (bits <= 8 && colors > 2 ** bits)) invalid();
  const paletteEntries = bits <= 8 ? colors || 2 ** bits : colors;
  const maskBytes = headerSize === 40 && compression !== 0 ? (compression === 6 ? 16 : 12) : 0;
  const headerEnd = 14 + headerSize + maskBytes + paletteEntries * 4;
  const offset = input.readUInt32LE(10);
  const stride = Math.ceil(width * bits / 32) * 4;
  if (offset < headerEnd || offset + stride * height > input.length) invalid();
  // bmp-ts reads pixel data immediately after its header; remove any legal padding gap.
  const normalized = offset === headerEnd ? input : Buffer.concat([input.subarray(0, headerEnd), input.subarray(offset)]);
  const decoded = decodeBmp(normalized);
  const data = decoded.data;
  const alphaOffset = headerSize >= 56 || compression === 6 ? 14 + 52 : -1;
  const hasAlphaMask = alphaOffset >= 0 && input.readUInt32LE(alphaOffset) !== 0;
  // bmp-ts exposes ABGR (unused alpha is zero), so convert in place to RGBA.
  for (let index = 0; index < data.length; index += 4) {
    const alpha = hasAlphaMask ? data[index] : 255;
    const blue = data[index + 1];
    const green = data[index + 2];
    data[index] = data[index + 3];
    data[index + 1] = green;
    data[index + 2] = blue;
    data[index + 3] = alpha;
  }
  return rawImage(data, decoded.width, decoded.height);
}

function icoImage(input: Buffer): Sharp {
  if (input.length < 22) invalid();
  const count = input.readUInt16LE(4);
  if (count < 1 || count > 64 || input.length < 6 + count * 16) invalid();
  let selected = { entry: 6, area: 0, offset: 0, size: 0, width: 0, height: 0 };
  for (let index = 0; index < count; index++) {
    const entry = 6 + index * 16;
    const width = input[entry] || 256;
    const height = input[entry + 1] || 256;
    const size = input.readUInt32LE(entry + 8);
    const offset = input.readUInt32LE(entry + 12);
    if (size < 8 || offset < 6 + count * 16 || offset + size > input.length) invalid();
    if (width * height > selected.area) selected = { entry, width, height, area: width * height, offset, size };
  }
  const payload = input.subarray(selected.offset, selected.offset + selected.size);
  if (payload.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
    return encodedImage(payload);
  if (payload.length < 40 || payload.readUInt32LE(0) !== 40) invalid();
  const width = payload.readInt32LE(4);
  const doubleHeight = payload.readInt32LE(8);
  const height = doubleHeight / 2;
  checkDimensions(width, height);
  if (width !== selected.width || height !== selected.height || payload.readUInt16LE(12) !== 1 || payload.readUInt32LE(16) !== 0) invalid();
  const bits = payload.readUInt16LE(14);
  const colors = payload.readUInt32LE(32);
  if (![1, 4, 8, 24, 32].includes(bits) || colors > 256 || (bits <= 8 && colors > 2 ** bits)) invalid();
  const paletteBytes = (bits <= 8 ? colors || 2 ** bits : colors) * 4;
  const pixelBytes = Math.ceil(width * bits / 32) * 4 * height;
  const maskBytes = Math.ceil(width / 32) * 4 * height;
  const minimumBytes = 40 + paletteBytes + pixelBytes + (bits < 32 ? maskBytes : 0);
  if (payload.length < minimumBytes) invalid();
  // Only decode the selected representation, never all ICO entries simultaneously.
  const single = Buffer.concat([input.subarray(0, 6), input.subarray(selected.entry, selected.entry + 16), payload]);
  single.writeUInt16LE(1, 4);
  single.writeUInt32LE(22, 18);
  const [decoded] = decodeIco(single);
  if (!decoded || decoded.type !== "bmp") invalid();
  if (bits === 32 && decoded.data.every((value, index) => index % 4 !== 3 || value === 0)) {
    const maskOffset = 40 + paletteBytes + pixelBytes;
    const hasMask = payload.length >= maskOffset + maskBytes;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const mask = hasMask ? payload[maskOffset + (height - y - 1) * Math.ceil(width / 32) * 4 + (x >> 3)] : 0;
        decoded.data[(y * width + x) * 4 + 3] = mask & (1 << (7 - x % 8)) ? 0 : 255;
      }
    }
  }
  return rawImage(decoded.data, decoded.width, decoded.height);
}

async function heifImage(input: Buffer): Promise<Sharp> {
  const { default: libheif } = await import("libheif-js/wasm-bundle");
  await libheif.ready;
  const decoder = new libheif.HeifDecoder();
  let images: ReturnType<typeof decoder.decode> = [];
  try {
    images = decoder.decode(input);
    if (!images.length || images.length > 64) invalid();
    const image = images.find((candidate) => candidate.is_primary()) ?? images[0];
    const width = image.get_width();
    const height = image.get_height();
    checkDimensions(width, height);
    const data = await new Promise<Uint8ClampedArray>((resolve, reject) => {
      image.display({ width, height, data: new Uint8ClampedArray(width * height * 4) }, (result) => {
        if (result) resolve(result.data);
        else reject(new ProfilePhotoError(INVALID_PHOTO));
      });
    });
    return rawImage(data, width, height);
  } finally {
    for (const image of images) image.free();
    decoder.decoder?.delete();
  }
}

export async function normalizeProfilePhoto(input: Buffer): Promise<Buffer> {
  if (!Buffer.isBuffer(input) || input.length === 0)
    throw new ProfilePhotoError("Pilih file foto yang tidak kosong.");
  if (input.length > MAX_PROFILE_PHOTO_BYTES)
    throw new ProfilePhotoError("Ukuran foto maksimal 2 MB. Pilih file yang lebih kecil.", 413);
  try {
    let pipeline: Sharp;
    let checkedSvg = false;
    if (input.subarray(0, 2).toString("ascii") === "BM") {
      pipeline = bmpImage(input);
    } else if (input.length >= 6 && input.readUInt32LE(0) === 0x00010000) {
      pipeline = icoImage(input);
    } else if (input.length >= 16 && input.subarray(4, 8).toString("ascii") === "ftyp" &&
      ["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"].includes(input.subarray(8, 12).toString("ascii"))) {
      pipeline = await heifImage(input);
    } else {
      const textStart = input.toString("utf8").trimStart();
      if (textStart.startsWith("<")) {
        checkSvg(input);
        checkedSvg = true;
      } else {
        const signature = input.subarray(0, 12);
        const supportedRaster =
          signature.subarray(0, 3).equals(Buffer.from([255, 216, 255])) ||
          signature.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
          ["GIF87a", "GIF89a"].includes(signature.subarray(0, 6).toString("ascii")) ||
          (signature.subarray(0, 4).toString("ascii") === "RIFF" && signature.subarray(8, 12).toString("ascii") === "WEBP") ||
          signature.subarray(0, 4).equals(Buffer.from([73, 73, 42, 0])) ||
          signature.subarray(0, 4).equals(Buffer.from([77, 77, 0, 42])) ||
          signature.subarray(0, 4).equals(Buffer.from([73, 73, 43, 0])) ||
          signature.subarray(0, 4).equals(Buffer.from([77, 77, 0, 43])) ||
          (signature.subarray(4, 8).toString("ascii") === "ftyp" && ["avif", "avis"].includes(signature.subarray(8, 12).toString("ascii")));
        if (!supportedRaster) invalid();
      }
      pipeline = encodedImage(input);
    }
    const metadata = await pipeline.metadata();
    if (!metadata.format || !["jpeg", "png", "webp", "gif", "tiff", "svg", "heif", "raw"].includes(metadata.format)) invalid();
    if (metadata.format === "svg" && !checkedSvg) invalid();
    checkDimensions(metadata.width, metadata.pageHeight ?? metadata.height);
    const output = await pipeline.autoOrient().resize(256, 256, { fit: "cover", position: "centre" })
      .webp({ quality: 82, effort: 4 }).toBuffer();
    if (output.length > MAX_OUTPUT_BYTES)
      throw new ProfilePhotoError("Foto belum bisa diperkecil. Coba gunakan gambar lain.");
    return output;
  } catch (error) {
    if (error instanceof ProfilePhotoError) throw error;
    throw new ProfilePhotoError(INVALID_PHOTO);
  }
}
