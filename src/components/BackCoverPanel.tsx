import { useRef, useState, type DragEvent } from 'react';
import {
  Archive,
  CheckCircle2,
  Download,
  ImagePlus,
  Layers,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  formatBytes,
  shortMimeLabel,
  type BackCoverAsset,
  type ImageEncodingMode,
} from '../lib/imageUtils';
import type { TrackItem } from '../types';

interface BackCoverPanelProps {
  stagedBackCover: BackCoverAsset | null;
  activeTrack: TrackItem | null;
  selectedTrackCount: number;
  modifiedTrackCount: number;
  description: string;
  encodingMode: ImageEncodingMode;
  isEmbedding: boolean;
  isZipping: boolean;
  statusMessage: { tone: 'success' | 'error'; text: string } | null;
  onDescriptionChange: (value: string) => void;
  onEncodingModeChange: (mode: ImageEncodingMode) => void;
  onSelectImageFile: (file: File) => void;
  onClearStagedImage: () => void;
  onLoadSampleBackCover: () => void;
  onEmbedBackCover: () => void;
  onRemoveBackCoverFromSelected: () => void;
  onExtractExistingBackCover: (track: TrackItem) => void;
  onDownloadModified: () => void;
}

export function BackCoverPanel({
  stagedBackCover,
  activeTrack,
  selectedTrackCount,
  modifiedTrackCount,
  description,
  encodingMode,
  isEmbedding,
  isZipping,
  statusMessage,
  onDescriptionChange,
  onEncodingModeChange,
  onSelectImageFile,
  onClearStagedImage,
  onLoadSampleBackCover,
  onEmbedBackCover,
  onRemoveBackCoverFromSelected,
  onExtractExistingBackCover,
  onDownloadModified,
}: BackCoverPanelProps) {
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [previewSide, setPreviewSide] = useState<'back' | 'front'>('back');

  const existingFront = activeTrack?.metadata.frontCover ?? null;
  const existingBack = activeTrack?.metadata.backCover ?? null;

  // Determine which image is shown in the 1:1 sleeve preview
  const effectiveSide = previewSide === 'front' && existingFront ? 'front' : 'back';
  const activeBackPreviewUrl = stagedBackCover?.previewUrl ?? existingBack?.previewUrl ?? null;
  const activeBackMetaText = stagedBackCover
    ? `${shortMimeLabel(stagedBackCover.mimeType)} · ${stagedBackCover.width} × ${stagedBackCover.height} px · ${formatBytes(stagedBackCover.sizeBytes)}`
    : existingBack
      ? `Embedded in track · ${shortMimeLabel(existingBack.mimeType)} · ${formatBytes(existingBack.sizeBytes)}`
      : null;

  const canEmbed = Boolean(stagedBackCover) && selectedTrackCount > 0 && !isEmbedding;
  const isWebpOriginal =
    stagedBackCover?.mimeType === 'image/webp' && encodingMode === 'original';

  const handleImageDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingImage) setIsDraggingImage(true);
  };

  const handleImageDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingImage(false);
  };

  const handleImageDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingImage(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setPreviewSide('back');
      onSelectImageFile(file);
    }
  };

  return (
    <aside
      aria-label="Cover (Back) Artwork Controls"
      className="bg-white border border-[#E2E6EC] rounded-xl p-6 flex flex-col gap-5 lg:sticky lg:top-24"
    >
      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            setPreviewSide('back');
            onSelectImageFile(file);
          }
          e.target.value = '';
        }}
      />

      {/* Panel Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-[#111418]">
            Cover (Back) Artwork
          </h2>
          <p className="mt-0.5 text-xs font-mono text-[#525B67]">
            Target tag · APIC 0x04 / FLAC Type 4
          </p>
        </div>

        {existingFront ? (
          <div
            role="tablist"
            aria-label="Sleeve side preview"
            className="inline-flex items-center p-0.5 bg-[#F1F4F9] rounded-lg shrink-0"
          >
            <button
              type="button"
              role="tab"
              aria-selected={effectiveSide === 'back'}
              onClick={() => setPreviewSide('back')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors duration-150 whitespace-nowrap cursor-pointer ${
                effectiveSide === 'back'
                  ? 'bg-white text-[#111418] shadow-xs'
                  : 'text-[#525B67] hover:text-[#111418]'
              }`}
            >
              Back
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={effectiveSide === 'front'}
              onClick={() => setPreviewSide('front')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors duration-150 whitespace-nowrap cursor-pointer ${
                effectiveSide === 'front'
                  ? 'bg-white text-[#111418] shadow-xs'
                  : 'text-[#525B67] hover:text-[#111418]'
              }`}
            >
              Front
            </button>
          </div>
        ) : null}
      </div>

      {/* 1:1 Sleeve Drop & Preview Frame */}
      <div
        onDragOver={handleImageDragOver}
        onDragLeave={handleImageDragLeave}
        onDrop={handleImageDrop}
        className={`relative aspect-square w-full rounded-lg overflow-hidden border transition-colors duration-150 ${
          isDraggingImage
            ? 'border-[#1D4ED8] bg-[#EFF4FF]'
            : activeBackPreviewUrl || (effectiveSide === 'front' && existingFront)
              ? 'border-[#E2E6EC] bg-[#F6F7F9]'
              : 'border-dashed border-[#CBD2DC] bg-[#FAFBFD]'
        }`}
      >
        {effectiveSide === 'front' && existingFront ? (
          <div className="w-full h-full relative">
            <img
              src={existingFront.previewUrl}
              alt="Existing front cover (0x03)"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent px-4 py-3 text-white">
              <div className="text-xs font-medium">Existing Front Cover (0x03)</div>
              <div className="text-[11px] font-mono text-white/80 tabular-nums">
                Preserved untouched · {shortMimeLabel(existingFront.mimeType)} ·{' '}
                {formatBytes(existingFront.sizeBytes)}
              </div>
            </div>
          </div>
        ) : activeBackPreviewUrl ? (
          <div className="w-full h-full relative group">
            <img
              src={activeBackPreviewUrl}
              alt="Cover (Back) artwork preview"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent px-4 py-3 flex items-end justify-between gap-2">
              <div className="min-w-0 text-white">
                <div className="text-xs font-medium truncate">
                  {stagedBackCover ? stagedBackCover.fileName : 'Current Track Back Cover'}
                </div>
                {activeBackMetaText ? (
                  <div className="text-[11px] font-mono text-white/80 tabular-nums truncate">
                    {activeBackMetaText}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="px-2.5 py-1.5 text-xs font-medium text-[#111418] bg-white/95 hover:bg-white rounded-md transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer"
              >
                Change
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
            <div className="w-11 h-11 rounded-lg bg-[#EFF2F7] text-[#525B67] flex items-center justify-center mb-3.5">
              <ImagePlus className="w-5 h-5" aria-hidden="true" />
            </div>
            <p className="text-sm font-medium text-[#111418]">
              Drop your Back Cover image here
            </p>
            <p className="mt-1 text-xs text-[#7C8694]">
              JPEG, PNG, or WebP · Square sleeve scans recommended
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#111418] bg-white hover:bg-[#F6F7F9] border border-[#D4DBE5] rounded-lg transition-colors duration-150 whitespace-nowrap cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Choose Image</span>
              </button>
              <button
                type="button"
                onClick={onLoadSampleBackCover}
                className="px-2.5 py-2 text-xs font-medium text-[#1D4ED8] hover:text-[#1E40AF] transition-colors duration-150 whitespace-nowrap cursor-pointer"
              >
                Use sample back cover
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Staged Image Quick Bar */}
      {stagedBackCover ? (
        <div className="flex items-center justify-between gap-2 text-xs text-[#525B67]">
          <span className="font-mono tabular-nums truncate">
            Ready · {shortMimeLabel(stagedBackCover.mimeType)} · {stagedBackCover.width}×
            {stagedBackCover.height} · {formatBytes(stagedBackCover.sizeBytes)}
          </span>
          <button
            type="button"
            onClick={onClearStagedImage}
            className="text-[#525B67] hover:text-[#B91C1C] font-medium whitespace-nowrap shrink-0 cursor-pointer"
          >
            Clear image
          </button>
        </div>
      ) : null}

      {/* Minimal Metadata Options */}
      <div className="pt-4 border-t border-[#ECEFF4] flex flex-col gap-4">
        <div>
          <label
            htmlFor="back-cover-description"
            className="block text-xs font-medium text-[#374151] mb-1.5"
          >
            Picture description <span className="font-normal text-[#7C8694]">(optional)</span>
          </label>
          <input
            id="back-cover-description"
            type="text"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Leave blank or enter e.g. Back cover"
            className="w-full px-3 py-2 text-sm text-[#111418] placeholder:text-[#9AA4B2] bg-[#FAFBFD] border border-[#E2E6EC] rounded-lg focus:bg-white focus:border-[#1D4ED8] focus:outline-none transition-colors duration-150"
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-[#374151]">Image encoding</span>
          <div
            role="radiogroup"
            aria-label="Image encoding mode"
            className="inline-flex items-center p-0.5 bg-[#F1F4F9] rounded-lg"
          >
            <button
              type="button"
              role="radio"
              aria-checked={encodingMode === 'original'}
              onClick={() => onEncodingModeChange('original')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors duration-150 whitespace-nowrap cursor-pointer ${
                encodingMode === 'original'
                  ? 'bg-white text-[#111418] shadow-xs'
                  : 'text-[#525B67] hover:text-[#111418]'
              }`}
            >
              Original
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={encodingMode === 'jpeg_optimized'}
              onClick={() => onEncodingModeChange('jpeg_optimized')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors duration-150 whitespace-nowrap cursor-pointer ${
                encodingMode === 'jpeg_optimized'
                  ? 'bg-white text-[#111418] shadow-xs'
                  : 'text-[#525B67] hover:text-[#111418]'
              }`}
            >
              JPEG 92%
            </button>
          </div>
        </div>

        {isWebpOriginal ? (
          <p className="text-xs text-[#B45309] leading-relaxed">
            WebP artwork is valid in metadata containers, but switching to JPEG 92% ensures wider compatibility with older hardware players and car stereos.
          </p>
        ) : null}
      </div>

      {/* Dominant Primary Action */}
      <div className="pt-4 border-t border-[#ECEFF4] flex flex-col gap-2.5">
        <button
          type="button"
          onClick={onEmbedBackCover}
          disabled={!canEmbed}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] active:scale-[0.99] disabled:bg-[#CBD5E1] disabled:text-[#64748B] disabled:cursor-not-allowed rounded-lg transition-all duration-150 cursor-pointer"
        >
          <Layers className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>
            {isEmbedding
              ? 'Embedding Cover (Back)...'
              : selectedTrackCount === 0
                ? 'Select Audio Tracks to Embed'
                : selectedTrackCount === 1
                  ? 'Embed Cover (Back) into 1 Track'
                  : `Embed Cover (Back) into ${selectedTrackCount} Tracks`}
          </span>
        </button>

        {modifiedTrackCount > 0 ? (
          <button
            type="button"
            onClick={onDownloadModified}
            disabled={isZipping}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-[#111418] bg-[#F1F4F9] hover:bg-[#E5EAF2] border border-[#D4DBE5] rounded-lg transition-colors duration-150 cursor-pointer disabled:opacity-60"
          >
            {modifiedTrackCount > 1 ? (
              <Archive className="w-4 h-4 shrink-0" aria-hidden="true" />
            ) : (
              <Download className="w-4 h-4 shrink-0" aria-hidden="true" />
            )}
            <span>
              {isZipping
                ? 'Packaging ZIP...'
                : modifiedTrackCount === 1
                  ? 'Download Tagged Audio File'
                  : `Download ${modifiedTrackCount} Tagged Files (.zip)`}
            </span>
          </button>
        ) : null}

        {statusMessage ? (
          <div
            role="status"
            className={`mt-1 flex items-start gap-2 text-xs leading-relaxed ${
              statusMessage.tone === 'success' ? 'text-[#15803D]' : 'text-[#B91C1C]'
            }`}
          >
            {statusMessage.tone === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            ) : null}
            <span>{statusMessage.text}</span>
          </div>
        ) : null}
      </div>

      {/* Existing Back Cover Management for Active / Selected Tracks */}
      {(existingBack || selectedTrackCount > 0) && activeTrack ? (
        <div className="pt-4 border-t border-[#ECEFF4] flex flex-wrap items-center justify-between gap-2 text-xs">
          {existingBack ? (
            <button
              type="button"
              onClick={() => onExtractExistingBackCover(activeTrack)}
              className="inline-flex items-center gap-1.5 font-medium text-[#111418] hover:text-[#1D4ED8] transition-colors duration-150 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Extract back cover</span>
            </button>
          ) : (
            <span className="text-[#7C8694]">No back cover on selected track</span>
          )}

          {selectedTrackCount > 0 ? (
            <button
              type="button"
              onClick={onRemoveBackCoverFromSelected}
              className="inline-flex items-center gap-1.5 font-medium text-[#525B67] hover:text-[#B91C1C] transition-colors duration-150 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Strip back cover tag</span>
            </button>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}
