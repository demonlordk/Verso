import { ArrowLeft, Download, FileAudio } from 'lucide-react';
import {
  PICTURE_TYPE_COVER_BACK,
  type EmbeddedPicture,
} from '../lib/audioMetadata';
import {
  extensionForMime,
  formatBytes,
  shortMimeLabel,
  triggerBlobDownload,
} from '../lib/imageUtils';
import type { TrackItem } from '../types';

interface TagInspectorProps {
  tracks: TrackItem[];
  activeTrack: TrackItem | null;
  onSelectTrack: (id: string) => void;
  onBackToWorkspace: () => void;
  onOpenFilePicker: () => void;
}

export function TagInspector({
  tracks,
  activeTrack,
  onSelectTrack,
  onBackToWorkspace,
  onOpenFilePicker,
}: TagInspectorProps) {
  const handleExtractPicture = (track: TrackItem, pic: EmbeddedPicture) => {
    const baseName = track.fileName.replace(/\.[^/.]+$/, '');
    const safeRole = pic.typeName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const ext = extensionForMime(pic.mimeType);
    const blob = new Blob([pic.data.buffer as ArrayBuffer], { type: pic.mimeType });
    triggerBlobDownload(blob, `${baseName}_${safeRole}.${ext}`);
  };

  if (!activeTrack) {
    return (
      <section className="max-w-3xl mx-auto py-12 text-center bg-white border border-[#E2E6EC] rounded-xl p-10">
        <div className="mx-auto w-12 h-12 rounded-xl bg-[#F1F4F9] text-[#111418] flex items-center justify-center mb-4">
          <FileAudio className="w-6 h-6" aria-hidden="true" />
        </div>
        <h1 className="font-display text-2xl font-semibold text-[#111418]">
          No audio track loaded to inspect
        </h1>
        <p className="mt-2 text-sm text-[#525B67] max-w-md mx-auto">
          Add an MP3 or FLAC file to inspect its binary tag header, APIC/PICTURE frames, and preserved text metadata.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onOpenFilePicker}
            className="px-4 py-2 text-sm font-medium text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-lg transition-colors duration-150 cursor-pointer"
          >
            Add Audio Files
          </button>
          <button
            type="button"
            onClick={onBackToWorkspace}
            className="px-4 py-2 text-sm font-medium text-[#111418] bg-white hover:bg-[#F6F7F9] border border-[#D4DBE5] rounded-lg transition-colors duration-150 cursor-pointer"
          >
            Return to Workspace
          </button>
        </div>
      </section>
    );
  }

  const { metadata } = activeTrack;

  return (
    <section aria-label="Binary Tag Inspector" className="flex flex-col gap-6">
      {/* Top Row: Back + Track Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={onBackToWorkspace}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#525B67] hover:text-[#111418] transition-colors duration-150 mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Back to Workspace</span>
          </button>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-[#111418]">
            {metadata.title || activeTrack.fileName}
          </h1>
          <p className="mt-1 text-xs font-mono text-[#525B67] tabular-nums">
            {activeTrack.fileName} · {formatBytes(activeTrack.sizeBytes)}
          </p>
        </div>

        {tracks.length > 1 ? (
          <div className="flex items-center gap-2.5">
            <label htmlFor="inspect-track-select" className="text-xs font-medium text-[#525B67]">
              Inspecting track
            </label>
            <select
              id="inspect-track-select"
              value={activeTrack.id}
              onChange={(e) => onSelectTrack(e.target.value)}
              className="px-3 py-2 text-sm text-[#111418] bg-white border border-[#D4DBE5] rounded-lg focus:border-[#1D4ED8] focus:outline-none max-w-xs"
            >
              {tracks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.metadata.title || t.fileName}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      {/* Container Binary Metrics Strip */}
      <div className="bg-white border border-[#E2E6EC] rounded-xl grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-[#ECEFF4]">
        <div className="p-5">
          <div className="text-xs text-[#525B67]">Container Standard</div>
          <div className="mt-1 font-mono text-sm font-medium text-[#111418]">
            {metadata.containerVersion}
          </div>
        </div>
        <div className="p-5">
          <div className="text-xs text-[#525B67]">Metadata Header Size</div>
          <div className="mt-1 font-mono text-sm font-medium text-[#111418] tabular-nums">
            {formatBytes(metadata.metadataSizeBytes)} ({metadata.metadataSizeBytes.toLocaleString()} B)
          </div>
        </div>
        <div className="p-5">
          <div className="text-xs text-[#525B67]">Audio Stream Offset</div>
          <div className="mt-1 font-mono text-sm font-medium text-[#111418] tabular-nums">
            0x{metadata.audioPayloadOffset.toString(16).toUpperCase().padStart(6, '0')}
          </div>
        </div>
        <div className="p-5">
          <div className="text-xs text-[#525B67]">Embedded Pictures / Frames</div>
          <div className="mt-1 font-mono text-sm font-medium text-[#111418] tabular-nums">
            {metadata.pictures.length} artwork · {metadata.totalFrameCount} total{' '}
            {metadata.format === 'flac' ? 'blocks' : 'frames'}
          </div>
        </div>
      </div>

      {/* Warnings if any */}
      {metadata.warnings.length > 0 ? (
        <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl px-5 py-3.5 text-sm text-[#92400E]">
          {metadata.warnings.join(' ')}
        </div>
      ) : null}

      {/* Embedded Picture Frames Table */}
      <div className="bg-white border border-[#E2E6EC] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#ECEFF4] flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-semibold text-[#111418]">
              Embedded Picture Blocks ({metadata.format === 'flac' ? 'METADATA_BLOCK_PICTURE' : 'APIC'})
            </h2>
            <p className="text-xs text-[#525B67] mt-0.5">
              Every picture type present inside the audio container. Cover (back) uses picture type 0x04.
            </p>
          </div>
        </div>

        {metadata.pictures.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#525B67]">
            No embedded artwork frames exist in this file yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#ECEFF4] bg-[#FAFBFD] text-xs font-medium text-[#525B67]">
                  <th className="py-2.5 pl-5 pr-3 w-16">Preview</th>
                  <th className="py-2.5 px-3">Picture Type</th>
                  <th className="py-2.5 px-3">Code</th>
                  <th className="py-2.5 px-3">Format &amp; Description</th>
                  <th className="py-2.5 px-3 text-right">Payload Size</th>
                  <th className="py-2.5 pl-3 pr-5 text-right">Extract</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECEFF4]">
                {metadata.pictures.map((pic, index) => {
                  const isBack = pic.type === PICTURE_TYPE_COVER_BACK;
                  return (
                    <tr
                      key={`${pic.type}-${index}`}
                      className={isBack ? 'bg-[#EFF4FF]/50' : ''}
                    >
                      <td className="py-3 pl-5 pr-3">
                        <img
                          src={pic.previewUrl}
                          alt={pic.typeName}
                          referrerPolicy="no-referrer"
                          className="w-12 h-12 rounded object-cover border border-[#E2E6EC]"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-sm font-medium text-[#111418]">
                          {pic.typeName}
                        </div>
                        {isBack ? (
                          <div className="text-xs text-[#1D4ED8] font-medium mt-0.5">
                            Target Back Cover Tag
                          </div>
                        ) : null}
                      </td>
                      <td className="py-3 px-3 font-mono text-xs text-[#525B67] tabular-nums">
                        {pic.typeHex} ({pic.type})
                      </td>
                      <td className="py-3 px-3 text-sm text-[#525B67]">
                        <div className="font-mono text-xs text-[#111418]">
                          {shortMimeLabel(pic.mimeType)} ({pic.mimeType})
                          {pic.width && pic.height ? ` · ${pic.width}×${pic.height}` : ''}
                        </div>
                        <div className="text-xs text-[#7C8694] mt-0.5">
                          {pic.description ? `Description: "${pic.description}"` : 'No description'}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-xs text-[#111418] tabular-nums">
                        {formatBytes(pic.sizeBytes)}
                      </td>
                      <td className="py-3 pl-3 pr-5 text-right">
                        <button
                          type="button"
                          onClick={() => handleExtractPicture(activeTrack, pic)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#111418] bg-white hover:bg-[#F6F7F9] border border-[#D4DBE5] rounded-md transition-colors duration-150 whitespace-nowrap cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Save Image</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Preserved Text Frames Table */}
      <div className="bg-white border border-[#E2E6EC] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#ECEFF4]">
          <h2 className="font-display text-base font-semibold text-[#111418]">
            Preserved Text Metadata
          </h2>
          <p className="text-xs text-[#525B67] mt-0.5">
            All non-back-cover frames are copied verbatim when writing the updated file.
          </p>
        </div>

        {metadata.textFrames.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#525B67]">
            No text metadata frames found in this file.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#ECEFF4] bg-[#FAFBFD] text-xs font-medium text-[#525B67]">
                  <th className="py-2.5 pl-5 pr-3 w-36">Frame ID</th>
                  <th className="py-2.5 px-3 w-40">Field</th>
                  <th className="py-2.5 px-3">Value</th>
                  <th className="py-2.5 pl-3 pr-5 text-right w-28">Bytes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECEFF4] text-sm">
                {metadata.textFrames.map((frame, i) => (
                  <tr key={`${frame.id}-${i}`}>
                    <td className="py-2.5 pl-5 pr-3 font-mono text-xs text-[#525B67]">
                      {frame.id}
                    </td>
                    <td className="py-2.5 px-3 text-xs font-medium text-[#374151]">
                      {frame.label}
                    </td>
                    <td className="py-2.5 px-3 text-sm text-[#111418] break-all">
                      {frame.value}
                    </td>
                    <td className="py-2.5 pl-3 pr-5 text-right font-mono text-xs text-[#7C8694] tabular-nums">
                      {frame.sizeBytes}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
