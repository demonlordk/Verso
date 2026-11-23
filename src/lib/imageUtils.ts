export interface BackCoverAsset {
  fileName: string;
  mimeType: string;
  data: Uint8Array;
  width: number;
  height: number;
  sizeBytes: number;
  previewUrl: string;
}

export type ImageEncodingMode = 'original' | 'jpeg_optimized';

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function shortMimeLabel(mimeType: string): string {
  const lower = mimeType.toLowerCase();
  if (lower === 'image/jpeg' || lower === 'image/jpg') return 'JPEG';
  if (lower === 'image/png') return 'PNG';
  if (lower === 'image/webp') return 'WebP';
  if (lower === 'image/gif') return 'GIF';
  return lower.replace('image/', '').toUpperCase() || 'IMAGE';
}

export function extensionForMime(mimeType: string): string {
  const lower = mimeType.toLowerCase();
  if (lower === 'image/png') return 'png';
  if (lower === 'image/webp') return 'webp';
  if (lower === 'image/gif') return 'gif';
  return 'jpg';
}

export function sniffImageMime(bytes: Uint8Array, fallback = 'image/jpeg'): string {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return 'image/png';
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp';
  }
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return 'image/gif';
  }
  return fallback;
}

export function readImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('Could not decode image dimensions.'));
    img.src = url;
  });
}

export async function loadImageAssetFromBytes(
  bytes: Uint8Array,
  fileName: string,
  declaredMime?: string
): Promise<BackCoverAsset> {
  const mimeType = sniffImageMime(bytes, declaredMime || 'image/jpeg');
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: mimeType });
  const previewUrl = URL.createObjectURL(blob);
  try {
    const { width, height } = await readImageDimensions(previewUrl);
    return {
      fileName,
      mimeType,
      data: bytes,
      width,
      height,
      sizeBytes: bytes.byteLength,
      previewUrl,
    };
  } catch (err) {
    URL.revokeObjectURL(previewUrl);
    throw err;
  }
}

export async function loadImageAssetFromFile(file: File): Promise<BackCoverAsset> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  return loadImageAssetFromBytes(bytes, file.name, file.type);
}

export async function prepareImageForEmbedding(
  asset: BackCoverAsset,
  mode: ImageEncodingMode,
  maxDimension = 1500,
  jpegQuality = 0.92
): Promise<{ data: Uint8Array; mimeType: string; width: number; height: number }> {
  if (mode === 'original') {
    return {
      data: asset.data,
      mimeType: asset.mimeType,
      width: asset.width,
      height: asset.height,
    };
  }

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Failed to decode image for JPEG conversion.'));
    el.src = asset.previewUrl;
  });

  let targetW = img.naturalWidth;
  let targetH = img.naturalHeight;
  if (Math.max(targetW, targetH) > maxDimension) {
    const scale = maxDimension / Math.max(targetW, targetH);
    targetW = Math.max(1, Math.round(targetW * scale));
    targetH = Math.max(1, Math.round(targetH * scale));
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context is unavailable.');
  }
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, targetW, targetH);
  ctx.drawImage(img, 0, 0, targetW, targetH);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) resolve(result);
        else reject(new Error('JPEG encoding failed.'));
      },
      'image/jpeg',
      jpegQuality
    );
  });

  const buffer = await blob.arrayBuffer();
  return {
    data: new Uint8Array(buffer),
    mimeType: 'image/jpeg',
    width: targetW,
    height: targetH,
  };
}

export function triggerBlobDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}
