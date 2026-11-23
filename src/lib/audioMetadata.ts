import { sniffImageMime } from './imageUtils';

export type AudioFormat = 'mp3' | 'flac';

export const PICTURE_TYPE_COVER_FRONT = 3;
export const PICTURE_TYPE_COVER_BACK = 4;

export const PICTURE_TYPE_NAMES: Record<number, string> = {
  0: 'Other',
  1: '32×32 File Icon',
  2: 'Other File Icon',
  3: 'Cover (front)',
  4: 'Cover (back)',
  5: 'Leaflet page',
  6: 'Media (label side)',
  7: 'Lead artist / soloist',
  8: 'Artist / performer',
  9: 'Conductor',
  10: 'Band / Orchestra',
  11: 'Composer',
  12: 'Lyricist / text writer',
  13: 'Recording location',
  14: 'During recording',
  15: 'During performance',
  16: 'Movie / video screen capture',
  17: 'A bright coloured fish',
  18: 'Illustration',
  19: 'Band / artist logotype',
  20: 'Publisher / studio logotype',
};

export const ID3_FRAME_LABELS: Record<string, string> = {
  TIT2: 'Title',
  TPE1: 'Artist',
  TPE2: 'Album Artist',
  TALB: 'Album',
  TYER: 'Year',
  TDRC: 'Recording Date',
  TRCK: 'Track Number',
  TPOS: 'Disc Number',
  TCON: 'Genre',
  TCOM: 'Composer',
  TPUB: 'Publisher',
  TSSE: 'Encoder',
  COMM: 'Comment',
  USLT: 'Lyrics',
  TXXX: 'User Text',
};

export interface EmbeddedPicture {
  type: number;
  typeName: string;
  typeHex: string;
  mimeType: string;
  description: string;
  data: Uint8Array;
  width?: number;
  height?: number;
  colorDepth?: number;
  sizeBytes: number;
  previewUrl: string;
}

export interface TextFrameInfo {
  id: string;
  label: string;
  value: string;
  sizeBytes: number;
}

export interface AudioMetadataResult {
  format: AudioFormat;
  containerVersion: string;
  title: string | null;
  artist: string | null;
  album: string | null;
  year: string | null;
  trackNumber: string | null;
  pictures: EmbeddedPicture[];
  frontCover: EmbeddedPicture | null;
  backCover: EmbeddedPicture | null;
  textFrames: TextFrameInfo[];
  totalFrameCount: number;
  metadataSizeBytes: number;
  audioPayloadOffset: number;
  audioPayloadSizeBytes: number;
  warnings: string[];
}

export interface BackCoverEmbedOptions {
  data: Uint8Array;
  mimeType: string;
  description: string;
  width: number;
  height: number;
}

export function formatPictureTypeHex(type: number): string {
  return `0x${type.toString(16).toUpperCase().padStart(2, '0')}`;
}

export function getPictureTypeName(type: number): string {
  return PICTURE_TYPE_NAMES[type] ?? `Unknown (${formatPictureTypeHex(type)})`;
}

// --- Binary helpers ---

function readUint32BE(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] << 24) |
      (bytes[offset + 1] << 16) |
      (bytes[offset + 2] << 8) |
      bytes[offset + 3]) >>>
    0
  );
}

function readUint32LE(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] |
      (bytes[offset + 1] << 8) |
      (bytes[offset + 2] << 16) |
      (bytes[offset + 3] << 24)) >>>
    0
  );
}

function readUint24BE(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] << 16) | (bytes[offset + 1] << 8) | bytes[offset + 2];
}

function writeUint32BE(value: number): Uint8Array {
  return new Uint8Array([
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  ]);
}

function readSynchsafe32(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] & 0x7f) << 21) |
    ((bytes[offset + 1] & 0x7f) << 14) |
    ((bytes[offset + 2] & 0x7f) << 7) |
    (bytes[offset + 3] & 0x7f)
  );
}

function writeSynchsafe32(value: number): Uint8Array {
  return new Uint8Array([
    (value >>> 21) & 0x7f,
    (value >>> 14) & 0x7f,
    (value >>> 7) & 0x7f,
    value & 0x7f,
  ]);
}

function decodeAscii(bytes: Uint8Array, start: number, end: number): string {
  let out = '';
  for (let i = start; i < end; i++) {
    out += String.fromCharCode(bytes[i]);
  }
  return out;
}

function encodeAscii(text: string): Uint8Array {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    out[i] = text.charCodeAt(i) & 0x7f;
  }
  return out;
}

function isPureLatin1(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) > 0xff) return false;
  }
  return true;
}

function encodeLatin1(text: string): Uint8Array {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    out[i] = text.charCodeAt(i) & 0xff;
  }
  return out;
}

function encodeUtf16LEWithBom(text: string): Uint8Array {
  const out = new Uint8Array(2 + text.length * 2);
  out[0] = 0xff;
  out[1] = 0xfe;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    out[2 + i * 2] = code & 0xff;
    out[2 + i * 2 + 1] = (code >>> 8) & 0xff;
  }
  return out;
}

function concatUint8Arrays(chunks: Uint8Array[]): Uint8Array {
  let total = 0;
  for (const chunk of chunks) total += chunk.byteLength;
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

function deUnsync(bytes: Uint8Array): Uint8Array {
  const out: number[] = [];
  for (let i = 0; i < bytes.length; i++) {
    out.push(bytes[i]);
    if (bytes[i] === 0xff && i + 1 < bytes.length && bytes[i + 1] === 0x00) {
      i++;
    }
  }
  return new Uint8Array(out);
}

function decodeId3Text(encoding: number, slice: Uint8Array): string {
  if (slice.length === 0) return '';
  let text = '';
  try {
    if (encoding === 0) {
      text = new TextDecoder('iso-8859-1').decode(slice);
    } else if (encoding === 1) {
      if (slice.length >= 2 && slice[0] === 0xfe && slice[1] === 0xff) {
        text = new TextDecoder('utf-16be').decode(slice.subarray(2));
      } else if (slice.length >= 2 && slice[0] === 0xff && slice[1] === 0xfe) {
        text = new TextDecoder('utf-16le').decode(slice.subarray(2));
      } else {
        text = new TextDecoder('utf-16le').decode(slice);
      }
    } else if (encoding === 2) {
      text = new TextDecoder('utf-16be').decode(slice);
    } else {
      text = new TextDecoder('utf-8').decode(slice);
    }
  } catch {
    text = decodeAscii(slice, 0, slice.length);
  }
  return text.replace(/\0+$/g, '').trim();
}

function findNullTerminator(bytes: Uint8Array, start: number, doubleNull: boolean): number {
  if (!doubleNull) {
    for (let i = start; i < bytes.length; i++) {
      if (bytes[i] === 0x00) return i;
    }
    return bytes.length;
  }
  for (let i = start; i + 1 < bytes.length; i += 2) {
    if (bytes[i] === 0x00 && bytes[i + 1] === 0x00) return i;
  }
  return bytes.length;
}

function isValidFrameId(bytes: Uint8Array, offset: number): boolean {
  if (offset + 4 > bytes.length) return false;
  for (let i = 0; i < 4; i++) {
    const c = bytes[offset + i];
    const isUpper = c >= 0x41 && c <= 0x5a;
    const isDigit = c >= 0x30 && c <= 0x39;
    if (!isUpper && !isDigit) return false;
  }
  return true;
}

function isFlacMagic(bytes: Uint8Array, offset = 0): boolean {
  return (
    bytes.length >= offset + 4 &&
    bytes[offset] === 0x66 && // f
    bytes[offset + 1] === 0x4c && // L
    bytes[offset + 2] === 0x61 && // a
    bytes[offset + 3] === 0x43 // C
  );
}

function isId3Magic(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 10 &&
    bytes[0] === 0x49 && // I
    bytes[1] === 0x44 && // D
    bytes[2] === 0x33 // 3
  );
}

export function detectAudioFormat(bytes: Uint8Array, fileName = ''): AudioFormat | null {
  if (isFlacMagic(bytes, 0)) return 'flac';
  if (isId3Magic(bytes)) {
    const tagSize = readSynchsafe32(bytes, 6);
    const afterTag = 10 + tagSize;
    if (isFlacMagic(bytes, afterTag)) return 'flac';
    return 'mp3';
  }
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.flac')) return 'flac';
  if (lower.endsWith('.mp3')) return 'mp3';
  // Check raw MPEG frame sync (11 set bits: 0xFF 0xE0)
  if (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) {
    return 'mp3';
  }
  return null;
}

// --- ID3v2 Parsing & Writing ---

interface RawId3Frame {
  id: string;
  flags1: number;
  flags2: number;
  payload: Uint8Array;
}

interface ParsedId3Tag {
  majorVersion: number;
  minorVersion: number;
  tagTotalLength: number; // header + body (+ footer if present)
  frames: RawId3Frame[];
  warnings: string[];
}

function parseRawId3v2(bytes: Uint8Array): ParsedId3Tag | null {
  if (!isId3Magic(bytes)) return null;
  const majorVersion = bytes[3];
  const minorVersion = bytes[4];
  const headerFlags = bytes[5];
  const rawBodySize = readSynchsafe32(bytes, 6);
  const hasFooter = majorVersion === 4 && (headerFlags & 0x10) !== 0;
  const tagTotalLength = Math.min(bytes.length, 10 + rawBodySize + (hasFooter ? 10 : 0));
  const warnings: string[] = [];

  if (majorVersion === 2) {
    warnings.push(
      'Legacy ID3v2.2 header detected. Saving will upgrade the tag container to ID3v2.3 while preserving audio.'
    );
    return {
      majorVersion,
      minorVersion,
      tagTotalLength,
      frames: [],
      warnings,
    };
  }

  if (majorVersion !== 3 && majorVersion !== 4) {
    warnings.push(`Unsupported ID3v2.${majorVersion} header; a clean ID3v2.3 tag will be written.`);
    return {
      majorVersion,
      minorVersion,
      tagTotalLength,
      frames: [],
      warnings,
    };
  }

  let body = bytes.subarray(10, Math.min(bytes.length, 10 + rawBodySize));
  const globalUnsync = (headerFlags & 0x80) !== 0;
  if (globalUnsync && majorVersion === 3) {
    body = deUnsync(body);
  }

  let cursor = 0;
  const hasExtendedHeader = (headerFlags & 0x40) !== 0;
  if (hasExtendedHeader && body.length >= 4) {
    if (majorVersion === 3) {
      const extSize = readUint32BE(body, 0);
      cursor += 4 + extSize;
    } else {
      const extSize = readSynchsafe32(body, 0);
      cursor += extSize;
    }
  }

  const frames: RawId3Frame[] = [];

  while (cursor + 10 <= body.length) {
    if (body[cursor] === 0x00) break; // Padding reached
    if (!isValidFrameId(body, cursor)) break;

    const id = decodeAscii(body, cursor, cursor + 4);
    let frameSize: number;

    if (majorVersion === 4) {
      const hasHighBit =
        (body[cursor + 4] & 0x80) !== 0 ||
        (body[cursor + 5] & 0x80) !== 0 ||
        (body[cursor + 6] & 0x80) !== 0 ||
        (body[cursor + 7] & 0x80) !== 0;

      const synchSize = readSynchsafe32(body, cursor + 4);
      const beSize = readUint32BE(body, cursor + 4);

      if (hasHighBit) {
        frameSize = beSize;
      } else if (synchSize === beSize) {
        frameSize = synchSize;
      } else {
        // Heuristic: pick whichever size lands on valid next frame, padding, or exact end
        const nextSynch = cursor + 10 + synchSize;
        const nextBe = cursor + 10 + beSize;
        const synchValid =
          nextSynch <= body.length &&
          (nextSynch === body.length ||
            body[nextSynch] === 0x00 ||
            isValidFrameId(body, nextSynch));
        const beValid =
          nextBe <= body.length &&
          (nextBe === body.length || body[nextBe] === 0x00 || isValidFrameId(body, nextBe));
        frameSize = !synchValid && beValid ? beSize : synchSize;
      }
    } else {
      frameSize = readUint32BE(body, cursor + 4);
    }

    const flags1 = body[cursor + 8];
    const flags2 = body[cursor + 9];
    cursor += 10;

    if (frameSize <= 0 || cursor + frameSize > body.length) {
      break;
    }

    let payload: Uint8Array = body.slice(cursor, cursor + frameSize);
    cursor += frameSize;

    // Normalize ID3v2.4 per-frame unsynchronisation / data length indicator
    let cleanFlags2 = flags2;
    if (majorVersion === 4) {
      const hasDataLen = (flags2 & 0x01) !== 0;
      const hasFrameUnsync = (flags2 & 0x02) !== 0 || globalUnsync;
      if (hasDataLen && payload.length >= 4) {
        payload = payload.slice(4);
        cleanFlags2 &= ~0x01;
      }
      if (hasFrameUnsync) {
        payload = deUnsync(payload);
        cleanFlags2 &= ~0x02;
      }
    }

    frames.push({
      id,
      flags1,
      flags2: cleanFlags2,
      payload,
    });
  }

  return {
    majorVersion,
    minorVersion,
    tagTotalLength,
    frames,
    warnings,
  };
}

function parseApicPayload(payload: Uint8Array): Omit<EmbeddedPicture, 'previewUrl'> | null {
  if (payload.length < 4) return null;
  const encoding = payload[0];
  const mimeEnd = findNullTerminator(payload, 1, false);
  const declaredMime = decodeAscii(payload, 1, mimeEnd).trim();
  const picTypeOffset = mimeEnd + 1;
  if (picTypeOffset >= payload.length) return null;

  const pictureType = payload[picTypeOffset];
  const descStart = picTypeOffset + 1;
  const doubleNull = encoding === 1 || encoding === 2;
  const descEnd = findNullTerminator(payload, descStart, doubleNull);
  const description = decodeId3Text(encoding, payload.subarray(descStart, descEnd));
  const dataStart = descEnd + (doubleNull ? 2 : 1);
  if (dataStart >= payload.length) return null;

  const data = payload.slice(dataStart);
  const mimeType = sniffImageMime(data, declaredMime || 'image/jpeg');

  return {
    type: pictureType,
    typeName: getPictureTypeName(pictureType),
    typeHex: formatPictureTypeHex(pictureType),
    mimeType,
    description,
    data,
    sizeBytes: data.byteLength,
  };
}

function buildApicPayload(
  options: BackCoverEmbedOptions,
  targetMajorVersion: number
): Uint8Array {
  const mimeBytes = encodeAscii(options.mimeType || 'image/jpeg');
  const desc = options.description.trim();

  let encodingByte: number;
  let descBytes: Uint8Array;
  let descTerminator: Uint8Array;

  if (targetMajorVersion === 4) {
    encodingByte = 0x03; // UTF-8
    descBytes = new TextEncoder().encode(desc);
    descTerminator = new Uint8Array([0x00]);
  } else if (isPureLatin1(desc)) {
    encodingByte = 0x00; // ISO-8859-1 (strict ID3v2.3)
    descBytes = encodeLatin1(desc);
    descTerminator = new Uint8Array([0x00]);
  } else {
    encodingByte = 0x01; // UTF-16 with BOM (strict ID3v2.3)
    descBytes = encodeUtf16LEWithBom(desc);
    descTerminator = new Uint8Array([0x00, 0x00]);
  }

  return concatUint8Arrays([
    new Uint8Array([encodingByte]),
    mimeBytes,
    new Uint8Array([0x00, PICTURE_TYPE_COVER_BACK]),
    descBytes,
    descTerminator,
    options.data,
  ]);
}

function serializeId3Frame(frame: RawId3Frame, majorVersion: number): Uint8Array {
  const idBytes = encodeAscii(frame.id);
  const sizeBytes =
    majorVersion === 4
      ? writeSynchsafe32(frame.payload.byteLength)
      : writeUint32BE(frame.payload.byteLength);
  const flagsBytes = new Uint8Array([frame.flags1, frame.flags2]);
  return concatUint8Arrays([idBytes, sizeBytes, flagsBytes, frame.payload]);
}

// --- FLAC Parsing & Writing ---

interface RawFlacBlock {
  blockType: number;
  data: Uint8Array;
}

interface ParsedFlac {
  leadingPrefixLength: number; // In case an ID3 tag was prepended to FLAC
  blocks: RawFlacBlock[];
  audioPayloadOffset: number;
  warnings: string[];
}

function parseRawFlac(bytes: Uint8Array): ParsedFlac {
  const warnings: string[] = [];
  let offset = 0;

  if (isId3Magic(bytes)) {
    const id3Size = readSynchsafe32(bytes, 6);
    if (isFlacMagic(bytes, 10 + id3Size)) {
      offset = 10 + id3Size;
      warnings.push('Prepended ID3 header skipped; native FLAC PICTURE metadata block will be updated.');
    }
  }

  if (!isFlacMagic(bytes, offset)) {
    throw new Error('Invalid FLAC stream header.');
  }

  const leadingPrefixLength = offset;
  offset += 4; // Skip "fLaC"
  const blocks: RawFlacBlock[] = [];

  while (offset + 4 <= bytes.length) {
    const headerByte = bytes[offset];
    const isLast = (headerByte & 0x80) !== 0;
    const blockType = headerByte & 0x7f;
    const blockLength = readUint24BE(bytes, offset + 1);
    offset += 4;

    if (offset + blockLength > bytes.length) {
      warnings.push('Truncated FLAC metadata block encountered.');
      break;
    }

    blocks.push({
      blockType,
      data: bytes.slice(offset, offset + blockLength),
    });
    offset += blockLength;

    if (isLast) break;
  }

  return {
    leadingPrefixLength,
    blocks,
    audioPayloadOffset: offset,
    warnings,
  };
}

function parseFlacPictureBlock(data: Uint8Array): Omit<EmbeddedPicture, 'previewUrl'> | null {
  if (data.length < 32) return null;
  let pos = 0;
  const pictureType = readUint32BE(data, pos);
  pos += 4;
  const mimeLen = readUint32BE(data, pos);
  pos += 4;
  if (pos + mimeLen + 4 > data.length) return null;
  const declaredMime = decodeAscii(data, pos, pos + mimeLen);
  pos += mimeLen;
  const descLen = readUint32BE(data, pos);
  pos += 4;
  if (pos + descLen + 20 > data.length) return null;
  const description = new TextDecoder('utf-8').decode(data.subarray(pos, pos + descLen));
  pos += descLen;
  const width = readUint32BE(data, pos);
  pos += 4;
  const height = readUint32BE(data, pos);
  pos += 4;
  const colorDepth = readUint32BE(data, pos);
  pos += 4;
  // colorsUsed
  pos += 4;
  const picLen = readUint32BE(data, pos);
  pos += 4;
  if (pos + picLen > data.length) return null;
  const picData = data.slice(pos, pos + picLen);
  const mimeType = sniffImageMime(picData, declaredMime || 'image/jpeg');

  return {
    type: pictureType,
    typeName: getPictureTypeName(pictureType),
    typeHex: formatPictureTypeHex(pictureType),
    mimeType,
    description,
    data: picData,
    width: width || undefined,
    height: height || undefined,
    colorDepth: colorDepth || undefined,
    sizeBytes: picData.byteLength,
  };
}

function buildFlacPictureBlock(options: BackCoverEmbedOptions): Uint8Array {
  const mimeBytes = encodeAscii(options.mimeType || 'image/jpeg');
  const descBytes = new TextEncoder().encode(options.description.trim());
  const colorDepth = options.mimeType === 'image/png' ? 32 : 24;

  const block = concatUint8Arrays([
    writeUint32BE(PICTURE_TYPE_COVER_BACK),
    writeUint32BE(mimeBytes.byteLength),
    mimeBytes,
    writeUint32BE(descBytes.byteLength),
    descBytes,
    writeUint32BE(options.width || 0),
    writeUint32BE(options.height || 0),
    writeUint32BE(colorDepth),
    writeUint32BE(0),
    writeUint32BE(options.data.byteLength),
    options.data,
  ]);

  if (block.byteLength > 0xffffff) {
    throw new Error(
      'Image exceeds the 16 MB FLAC metadata block specification limit. Switch Image Encoding to JPEG to reduce size.'
    );
  }
  return block;
}

function parseVorbisComments(data: Uint8Array): TextFrameInfo[] {
  const results: TextFrameInfo[] = [];
  if (data.length < 8) return results;
  let pos = 0;
  const vendorLen = readUint32LE(data, pos);
  pos += 4 + vendorLen;
  if (pos + 4 > data.length) return results;
  const commentCount = readUint32LE(data, pos);
  pos += 4;
  const decoder = new TextDecoder('utf-8');

  for (let i = 0; i < commentCount; i++) {
    if (pos + 4 > data.length) break;
    const len = readUint32LE(data, pos);
    pos += 4;
    if (pos + len > data.length) break;
    const raw = decoder.decode(data.subarray(pos, pos + len));
    pos += len;
    const eqIndex = raw.indexOf('=');
    if (eqIndex > 0) {
      const key = raw.slice(0, eqIndex).toUpperCase();
      const val = raw.slice(eqIndex + 1);
      if (key !== 'METADATA_BLOCK_PICTURE') {
        results.push({
          id: key,
          label: key.charAt(0) + key.slice(1).toLowerCase(),
          value: val,
          sizeBytes: len,
        });
      }
    }
  }
  return results;
}

// --- Public High-Level API ---

export function revokeMetadataUrls(meta: AudioMetadataResult | null | undefined): void {
  if (!meta) return;
  for (const pic of meta.pictures) {
    if (pic.previewUrl) URL.revokeObjectURL(pic.previewUrl);
  }
}

export function parseAudioMetadata(bytes: Uint8Array, fileName = ''): AudioMetadataResult {
  const format = detectAudioFormat(bytes, fileName);
  if (!format) {
    throw new Error('Unsupported file format. Only MP3 (ID3v2) and FLAC audio files are supported.');
  }

  if (format === 'mp3') {
    const parsed = parseRawId3v2(bytes);
    const pictures: EmbeddedPicture[] = [];
    const textFrames: TextFrameInfo[] = [];
    const warnings = parsed ? [...parsed.warnings] : [];

    let title: string | null = null;
    let artist: string | null = null;
    let album: string | null = null;
    let year: string | null = null;
    let trackNumber: string | null = null;

    if (parsed) {
      for (const frame of parsed.frames) {
        if (frame.id === 'APIC') {
          const pic = parseApicPayload(frame.payload);
          if (pic) {
            const blob = new Blob([pic.data.buffer as ArrayBuffer], { type: pic.mimeType });
            pictures.push({
              ...pic,
              previewUrl: URL.createObjectURL(blob),
            });
          }
        } else if (frame.id.startsWith('T') && frame.id !== 'TXXX' && frame.payload.length >= 1) {
          const value = decodeId3Text(frame.payload[0], frame.payload.subarray(1));
          if (value) {
            textFrames.push({
              id: frame.id,
              label: ID3_FRAME_LABELS[frame.id] ?? frame.id,
              value,
              sizeBytes: frame.payload.byteLength,
            });
            if (frame.id === 'TIT2') title = value;
            if (frame.id === 'TPE1') artist = value;
            if (frame.id === 'TALB') album = value;
            if (frame.id === 'TYER' || frame.id === 'TDRC') year = year ?? value;
            if (frame.id === 'TRCK') trackNumber = value;
          }
        } else if (frame.id === 'TXXX' && frame.payload.length >= 2) {
          const encoding = frame.payload[0];
          const doubleNull = encoding === 1 || encoding === 2;
          const sep = findNullTerminator(frame.payload, 1, doubleNull);
          const key = decodeId3Text(encoding, frame.payload.subarray(1, sep));
          const val = decodeId3Text(
            encoding,
            frame.payload.subarray(sep + (doubleNull ? 2 : 1))
          );
          if (key || val) {
            textFrames.push({
              id: `TXXX:${key || 'Custom'}`,
              label: key || 'User Text',
              value: val,
              sizeBytes: frame.payload.byteLength,
            });
          }
        }
      }
    }

    const frontCover = pictures.find((p) => p.type === PICTURE_TYPE_COVER_FRONT) ?? null;
    const backCover = pictures.find((p) => p.type === PICTURE_TYPE_COVER_BACK) ?? null;
    const audioPayloadOffset = parsed ? parsed.tagTotalLength : 0;

    return {
      format: 'mp3',
      containerVersion: parsed
        ? `ID3v2.${parsed.majorVersion}.${parsed.minorVersion}`
        : 'ID3v2.3 (No existing tag)',
      title,
      artist,
      album,
      year,
      trackNumber,
      pictures,
      frontCover,
      backCover,
      textFrames,
      totalFrameCount: parsed ? parsed.frames.length : 0,
      metadataSizeBytes: audioPayloadOffset,
      audioPayloadOffset,
      audioPayloadSizeBytes: Math.max(0, bytes.byteLength - audioPayloadOffset),
      warnings,
    };
  }

  // FLAC
  const parsedFlac = parseRawFlac(bytes);
  const pictures: EmbeddedPicture[] = [];
  const textFrames: TextFrameInfo[] = [];

  for (const block of parsedFlac.blocks) {
    if (block.blockType === 4) {
      textFrames.push(...parseVorbisComments(block.data));
    } else if (block.blockType === 6) {
      const pic = parseFlacPictureBlock(block.data);
      if (pic) {
        const blob = new Blob([pic.data.buffer as ArrayBuffer], { type: pic.mimeType });
        pictures.push({
          ...pic,
          previewUrl: URL.createObjectURL(blob),
        });
      }
    }
  }

  const findTag = (keys: string[]): string | null => {
    for (const k of keys) {
      const hit = textFrames.find((f) => f.id === k);
      if (hit) return hit.value;
    }
    return null;
  };

  const frontCover = pictures.find((p) => p.type === PICTURE_TYPE_COVER_FRONT) ?? null;
  const backCover = pictures.find((p) => p.type === PICTURE_TYPE_COVER_BACK) ?? null;

  return {
    format: 'flac',
    containerVersion: 'FLAC Native Metadata',
    title: findTag(['TITLE']),
    artist: findTag(['ARTIST', 'ALBUMARTIST']),
    album: findTag(['ALBUM']),
    year: findTag(['DATE', 'YEAR']),
    trackNumber: findTag(['TRACKNUMBER']),
    pictures,
    frontCover,
    backCover,
    textFrames,
    totalFrameCount: parsedFlac.blocks.length,
    metadataSizeBytes: parsedFlac.audioPayloadOffset - parsedFlac.leadingPrefixLength,
    audioPayloadOffset: parsedFlac.audioPayloadOffset,
    audioPayloadSizeBytes: Math.max(0, bytes.byteLength - parsedFlac.audioPayloadOffset),
    warnings: parsedFlac.warnings,
  };
}

export function embedBackCoverInAudio(
  sourceBytes: Uint8Array,
  fileName: string,
  backCover: BackCoverEmbedOptions | null
): Uint8Array {
  const format = detectAudioFormat(sourceBytes, fileName);
  if (!format) {
    throw new Error('Unsupported audio format. Provide an MP3 or FLAC file.');
  }

  if (format === 'mp3') {
    const parsed = parseRawId3v2(sourceBytes);
    const targetMajorVersion = parsed && parsed.majorVersion === 4 ? 4 : 3;
    const preservedFrames: RawId3Frame[] = [];

    if (parsed && (parsed.majorVersion === 3 || parsed.majorVersion === 4)) {
      for (const frame of parsed.frames) {
        if (frame.id === 'APIC') {
          const pic = parseApicPayload(frame.payload);
          if (pic && pic.type === PICTURE_TYPE_COVER_BACK) {
            continue; // Replace or strip existing Cover (back)
          }
        }
        preservedFrames.push(frame);
      }
    }

    if (backCover) {
      preservedFrames.push({
        id: 'APIC',
        flags1: 0x00,
        flags2: 0x00,
        payload: buildApicPayload(backCover, targetMajorVersion),
      });
    }

    const serializedFrames = preservedFrames.map((f) =>
      serializeId3Frame(f, targetMajorVersion)
    );
    const padding = new Uint8Array(256); // Standard zero-padding
    const bodyBytes = concatUint8Arrays([...serializedFrames, padding]);

    const header = new Uint8Array(10);
    header[0] = 0x49; // I
    header[1] = 0x44; // D
    header[2] = 0x33; // 3
    header[3] = targetMajorVersion;
    header[4] = 0x00;
    header[5] = 0x00;
    header.set(writeSynchsafe32(bodyBytes.byteLength), 6);

    const audioStart = parsed ? parsed.tagTotalLength : 0;
    const audioPayload = sourceBytes.subarray(audioStart);

    return concatUint8Arrays([header, bodyBytes, audioPayload]);
  }

  // FLAC
  const parsedFlac = parseRawFlac(sourceBytes);
  const keptBlocks: RawFlacBlock[] = [];

  for (const block of parsedFlac.blocks) {
    if (block.blockType === 1) {
      // Drop old padding; we append a fresh compact padding block at the end
      continue;
    }
    if (block.blockType === 6) {
      const pic = parseFlacPictureBlock(block.data);
      if (pic && pic.type === PICTURE_TYPE_COVER_BACK) {
        continue; // Replace or strip existing Cover (back)
      }
    }
    keptBlocks.push(block);
  }

  if (backCover) {
    keptBlocks.push({
      blockType: 6,
      data: buildFlacPictureBlock(backCover),
    });
  }

  // Add standard 1024-byte padding block at the end
  keptBlocks.push({
    blockType: 1,
    data: new Uint8Array(1024),
  });

  const chunks: Uint8Array[] = [];
  if (parsedFlac.leadingPrefixLength > 0) {
    chunks.push(sourceBytes.subarray(0, parsedFlac.leadingPrefixLength));
  }
  chunks.push(new Uint8Array([0x66, 0x4c, 0x61, 0x43])); // "fLaC"

  for (let i = 0; i < keptBlocks.length; i++) {
    const block = keptBlocks[i];
    const isLast = i === keptBlocks.length - 1;
    const len = block.data.byteLength;
    const blockHeader = new Uint8Array([
      (isLast ? 0x80 : 0x00) | (block.blockType & 0x7f),
      (len >>> 16) & 0xff,
      (len >>> 8) & 0xff,
      len & 0xff,
    ]);
    chunks.push(blockHeader);
    chunks.push(block.data);
  }

  chunks.push(sourceBytes.subarray(parsedFlac.audioPayloadOffset));
  return concatUint8Arrays(chunks);
}
