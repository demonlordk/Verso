import { loadImageAssetFromBytes, type BackCoverAsset } from './imageUtils';

export const SAMPLE_FRONT_COVER_URL =
  '/src/assets/images/sample_front_cover_1795465224747.jpg';
export const SAMPLE_BACK_COVER_URL =
  '/src/assets/images/sample_back_cover_1795465224450.jpg';

function writeUint32BE(val: number): Uint8Array {
  return new Uint8Array([
    (val >>> 24) & 0xff,
    (val >>> 16) & 0xff,
    (val >>> 8) & 0xff,
    val & 0xff,
  ]);
}

function writeSynchsafe32(val: number): Uint8Array {
  return new Uint8Array([
    (val >>> 21) & 0x7f,
    (val >>> 14) & 0x7f,
    (val >>> 7) & 0x7f,
    val & 0x7f,
  ]);
}

function encodeAscii(str: string): Uint8Array {
  const out = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) out[i] = str.charCodeAt(i) & 0x7f;
  return out;
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, p) => sum + p.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.byteLength;
  }
  return out;
}

function makeTextFrame(id: string, text: string): Uint8Array {
  const payload = concatBytes([new Uint8Array([0x00]), encodeAscii(text)]);
  return concatBytes([
    encodeAscii(id),
    writeUint32BE(payload.byteLength),
    new Uint8Array([0x00, 0x00]),
    payload,
  ]);
}

function makeFrontCoverApicFrame(jpegBytes: Uint8Array): Uint8Array {
  const payload = concatBytes([
    new Uint8Array([0x00]), // ISO-8859-1
    encodeAscii('image/jpeg'),
    new Uint8Array([0x00]), // null-terminated MIME
    new Uint8Array([0x03]), // 0x03 = Cover (front)
    encodeAscii('Front sleeve'),
    new Uint8Array([0x00]), // null-terminated description
    jpegBytes,
  ]);
  return concatBytes([
    encodeAscii('APIC'),
    writeUint32BE(payload.byteLength),
    new Uint8Array([0x00, 0x00]),
    payload,
  ]);
}

/**
 * Generates valid silent MPEG-1 Layer III frames (128 kbps, 44.1 kHz, Joint Stereo, 417 bytes/frame)
 * so external media players and tag editors recognize the sample track as a standard MP3 file.
 */
function createSilentMpegFrames(frameCount: number): Uint8Array {
  const frameSize = 417;
  const output = new Uint8Array(frameCount * frameSize);
  for (let i = 0; i < frameCount; i++) {
    const offset = i * frameSize;
    output[offset] = 0xff;
    output[offset + 1] = 0xfb; // MPEG1 Layer III, no CRC
    output[offset + 2] = 0x90; // 128 kbps, 44.1 kHz, no padding
    output[offset + 3] = 0x64; // Joint Stereo
  }
  return output;
}

interface SampleTrackSpec {
  fileName: string;
  title: string;
  artist: string;
  album: string;
  year: string;
  trackNumber: string;
}

const SAMPLE_ALBUM_TRACKS: SampleTrackSpec[] = [
  {
    fileName: '01 - Sora Takahashi - Concrete Nocturne.mp3',
    title: 'Concrete Nocturne',
    artist: 'Sora Takahashi',
    album: 'Monolith Studies',
    year: '2026',
    trackNumber: '01/03',
  },
  {
    fileName: '02 - Sora Takahashi - Glass Atrium.mp3',
    title: 'Glass Atrium',
    artist: 'Sora Takahashi',
    album: 'Monolith Studies',
    year: '2026',
    trackNumber: '02/03',
  },
  {
    fileName: '03 - Sora Takahashi - Quiet Archive.mp3',
    title: 'Quiet Archive',
    artist: 'Sora Takahashi',
    album: 'Monolith Studies',
    year: '2026',
    trackNumber: '03/03',
  },
];

export async function createSampleAlbumFiles(): Promise<
  Array<{ fileName: string; bytes: Uint8Array }>
> {
  let frontCoverBytes: Uint8Array | null = null;
  try {
    const res = await fetch(SAMPLE_FRONT_COVER_URL);
    if (res.ok) {
      frontCoverBytes = new Uint8Array(await res.arrayBuffer());
    }
  } catch {
    frontCoverBytes = null;
  }

  const audioFrames = createSilentMpegFrames(38); // ~1 second of valid MPEG frames

  return SAMPLE_ALBUM_TRACKS.map((spec) => {
    const frames: Uint8Array[] = [
      makeTextFrame('TIT2', spec.title),
      makeTextFrame('TPE1', spec.artist),
      makeTextFrame('TALB', spec.album),
      makeTextFrame('TYER', spec.year),
      makeTextFrame('TRCK', spec.trackNumber),
    ];
    if (frontCoverBytes) {
      frames.push(makeFrontCoverApicFrame(frontCoverBytes));
    }
    const padding = new Uint8Array(128);
    const body = concatBytes([...frames, padding]);
    const header = concatBytes([
      encodeAscii('ID3'),
      new Uint8Array([0x03, 0x00, 0x00]),
      writeSynchsafe32(body.byteLength),
    ]);
    return {
      fileName: spec.fileName,
      bytes: concatBytes([header, body, audioFrames]),
    };
  });
}

export async function loadSampleBackCoverAsset(): Promise<BackCoverAsset> {
  const res = await fetch(SAMPLE_BACK_COVER_URL);
  if (!res.ok) {
    throw new Error('Could not load sample back cover image.');
  }
  const bytes = new Uint8Array(await res.arrayBuffer());
  return loadImageAssetFromBytes(bytes, 'monolith_studies_back_cover.jpg', 'image/jpeg');
}
