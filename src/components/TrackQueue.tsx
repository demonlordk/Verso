import { useState, type DragEvent } from 'react';
import {
  Check,
  Download,
  FileAudio,
  Minus,
  Search,
  SlidersHorizontal,
  Trash2,
  Upload,
} from 'lucide-react';
import { formatBytes } from '../lib/imageUtils';
import type { TrackFilter, TrackItem } from '../types';

interface TrackQueueProps {
  tracks: TrackItem[];
  activeTrackId: string | null;
  searchQuery: string;
  filter: TrackFilter;
  isLoadingSample: boolean;
  onSearchChange: (value: string) => void;
  onFilterChange: (filter: TrackFilter) => void;
  onSelectTrack: (id: string) => void;
  onToggleTrackChecked: (id: string) => void;
  onToggleAllChecked: (checked: boolean) => void;
  onAddFiles: (files: FileList | File[]) => void;
  onOpenFilePicker: () => void;
  onLoadSample: () => void;
  onInspectTrack: (id: string) => void;
  onDownloadTrack: (track: TrackItem) => void;
  onRemoveTrack: (id: string) => void;
  onClearAll: () => void;
}

export function TrackQueue({
  tracks,
  activeTrackId,
  searchQuery,
  filter,
  isLoadingSample,
  onSearchChange,
  onFilterChange,
  onSelectTrack,
  onToggleTrackChecked,
  onToggleAllChecked,
  onAddFiles,
  onOpenFilePicker,
  onLoadSample,
  onInspectTrack,
  onDownloadTrack,
  onRemoveTrack,
  onClearAll,
}: TrackQueueProps) {
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const mp3Count = tracks.filter((t) => t.metadata.format === 'mp3').length;
  const flacCount = tracks.filter((t) => t.metadata.format === 'flac').length;
  const withBackCount = tracks.filter((t) => Boolean(t.metadata.backCover)).length;
  const selectedCount = tracks.filter((t) => t.selected).length;

  const filteredTracks = tracks.filter((track) => {
    if (filter === 'missing' && track.metadata.backCover) return false;
    if (filter === 'present' && !track.metadata.backCover) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      track.fileName.toLowerCase().includes(q) ||
      (track.metadata.title?.toLowerCase().includes(q) ?? false) ||
      (track.metadata.artist?.toLowerCase().includes(q) ?? false) ||
      (track.metadata.album?.toLowerCase().includes(q) ?? false)
    );
  });

  const allFilteredSelected =
    filteredTracks.length > 0 && filteredTracks.every((t) => t.selected);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingOver) setIsDraggingOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onAddFiles(e.dataTransfer.files);
    }
  };

  return (
    <section aria-label="Audio tracks" className="flex flex-col gap-5 min-w-0">
      {/* Section Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-2xl sm:text-[28px] font-semibold tracking-tight text-[#111418]">
            Cover (Back) Metadata Workbench
          </h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[#525B67]">
            {tracks.length === 0 ? (
              <span>
                Drop MP3 or FLAC tracks to embed ID3v2 APIC 0x04 or FLAC PICTURE type 4 artwork without re-encoding.
              </span>
            ) : (
              <>
                <span className="font-mono tabular-nums text-[#111418] font-medium">
                  {tracks.length} {tracks.length === 1 ? 'track' : 'tracks'}
                </span>
                <span aria-hidden="true" className="text-[#CBD2DC]">·</span>
                <span className="font-mono tabular-nums">
                  {mp3Count} MP3 / {flacCount} FLAC
                </span>
                <span aria-hidden="true" className="text-[#CBD2DC]">·</span>
                <span className="font-mono tabular-nums">
                  {withBackCount} of {tracks.length} have back cover
                </span>
                <span aria-hidden="true" className="text-[#CBD2DC]">·</span>
                <span className="font-mono tabular-nums">
                  {selectedCount} selected
                </span>
              </>
            )}
          </div>
        </div>

        {tracks.length > 0 ? (
          <div className="flex items-center gap-4 shrink-0">
            <button
              type="button"
              onClick={onClearAll}
              className="text-sm font-medium text-[#525B67] hover:text-[#B91C1C] transition-colors duration-150 whitespace-nowrap cursor-pointer"
            >
              Clear queue
            </button>
          </div>
        ) : null}
      </div>

      {/* Empty State vs Populated Table */}
      {tracks.length === 0 ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`bg-white border rounded-xl p-10 sm:p-14 text-center transition-colors duration-150 ${
            isDraggingOver
              ? 'border-[#1D4ED8] bg-[#EFF4FF]'
              : 'border-[#E2E6EC] border-dashed hover:border-[#B8C2D1]'
          }`}
        >
          <div className="mx-auto w-12 h-12 rounded-xl bg-[#F1F4F9] text-[#111418] flex items-center justify-center mb-5">
            <FileAudio className="w-6 h-6" aria-hidden="true" />
          </div>
          <h2 className="font-display text-xl font-semibold text-[#111418]">
            Drop your MP3 or FLAC files here
          </h2>
          <p className="mt-2 text-sm text-[#525B67] max-w-md mx-auto leading-relaxed">
            Existing Front Cover (0x03), title, artist, album, and audio streams remain completely untouched. Everything runs locally in your browser.
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onOpenFilePicker}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-lg transition-colors duration-150 whitespace-nowrap cursor-pointer"
            >
              <Upload className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Select Audio Files</span>
            </button>

            <button
              type="button"
              onClick={onLoadSample}
              disabled={isLoadingSample}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-[#111418] bg-white hover:bg-[#F6F7F9] border border-[#D4DBE5] rounded-lg transition-colors duration-150 whitespace-nowrap cursor-pointer disabled:opacity-60"
            >
              <span>{isLoadingSample ? 'Loading sample...' : 'Load sample album (3 MP3s)'}</span>
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-[#ECEFF4] flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-[#7C8694]">
            <span>MP3 · ID3v2.3 &amp; ID3v2.4 (APIC 0x04)</span>
            <span aria-hidden="true">·</span>
            <span>FLAC · Native PICTURE Block (Type 4)</span>
            <span aria-hidden="true">·</span>
            <span>Batch Album Support</span>
          </div>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`bg-white border rounded-xl overflow-hidden transition-colors duration-150 ${
            isDraggingOver ? 'border-[#1D4ED8] ring-2 ring-[#1D4ED8]/15' : 'border-[#E2E6EC]'
          }`}
        >
          {/* Compact Toolbar: Search + Segmented Filter + Drop-more hint */}
          <div className="px-4 py-3 border-b border-[#ECEFF4] flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search
                className="w-4 h-4 text-[#7C8694] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Filter by title, artist, or filename"
                aria-label="Filter tracks"
                className="w-full pl-9 pr-3 py-1.5 text-sm text-[#111418] placeholder:text-[#8E98A6] bg-[#F6F7F9] border border-[#E2E6EC] rounded-lg focus:bg-white focus:border-[#1D4ED8] focus:outline-none transition-colors duration-150"
              />
            </div>

            <div className="flex items-center gap-3">
              <div
                role="tablist"
                aria-label="Filter by back cover status"
                className="inline-flex items-center p-0.5 bg-[#F1F4F9] rounded-lg"
              >
                {(
                  [
                    { id: 'all', label: 'All' },
                    { id: 'missing', label: 'No Back Cover' },
                    { id: 'present', label: 'Has Back Cover' },
                  ] as const
                ).map((tab) => {
                  const active = filter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => onFilterChange(tab.id)}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
                        active
                          ? 'bg-white text-[#111418] shadow-xs'
                          : 'text-[#525B67] hover:text-[#111418]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* High-Density Track Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#ECEFF4] bg-[#FAFBFD] text-xs font-medium text-[#525B67]">
                  <th className="py-2.5 pl-4 pr-2 w-10">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={(e) => onToggleAllChecked(e.target.checked)}
                      aria-label="Select all visible tracks"
                      className="w-4 h-4 rounded border-[#CBD2DC] accent-[#1D4ED8] cursor-pointer align-middle"
                    />
                  </th>
                  <th className="py-2.5 px-3">Track</th>
                  <th className="py-2.5 px-3 w-20 text-center whitespace-nowrap">Front 0x03</th>
                  <th className="py-2.5 px-3 w-36 whitespace-nowrap">Back 0x04</th>
                  <th className="py-2.5 pl-3 pr-4 w-28 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECEFF4]">
                {filteredTracks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 px-6 text-center text-sm text-[#525B67]">
                      No tracks match the current filter.
                    </td>
                  </tr>
                ) : (
                  filteredTracks.map((track) => {
                    const isActive = track.id === activeTrackId;
                    const displayTitle = track.metadata.title || track.fileName;
                    const subParts = [
                      track.metadata.artist,
                      track.metadata.album,
                      track.metadata.format.toUpperCase(),
                      formatBytes(track.sizeBytes),
                    ].filter(Boolean);

                    return (
                      <tr
                        key={track.id}
                        onClick={() => onSelectTrack(track.id)}
                        className={`group transition-colors duration-150 cursor-pointer ${
                          isActive ? 'bg-[#EFF4FF]/65' : 'hover:bg-[#FAFBFD]'
                        }`}
                      >
                        <td
                          className="py-3 pl-4 pr-2 align-middle"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={track.selected}
                            onChange={() => onToggleTrackChecked(track.id)}
                            aria-label={`Select ${track.fileName}`}
                            className="w-4 h-4 rounded border-[#CBD2DC] accent-[#1D4ED8] cursor-pointer align-middle"
                          />
                        </td>

                        <td className="py-3 px-3 align-middle max-w-[300px]">
                          <div className="font-medium text-sm text-[#111418] truncate">
                            {displayTitle}
                          </div>
                          <div className="mt-0.5 text-xs text-[#525B67] truncate font-mono tabular-nums">
                            {subParts.join(' · ')}
                          </div>
                        </td>

                        {/* Front Cover (0x03) Thumbnail */}
                        <td className="py-3 px-3 align-middle text-center">
                          <div className="inline-flex items-center justify-center">
                            {track.metadata.frontCover ? (
                              <img
                                src={track.metadata.frontCover.previewUrl}
                                alt="Embedded front cover"
                                referrerPolicy="no-referrer"
                                className="w-9 h-9 rounded object-cover border border-[#E2E6EC] bg-[#F1F4F9]"
                              />
                            ) : (
                              <div
                                title="No front cover"
                                className="w-9 h-9 rounded border border-dashed border-[#D4DBE5] bg-[#FAFBFD] flex items-center justify-center text-[#9AA4B2]"
                              >
                                <Minus className="w-3.5 h-3.5" aria-hidden="true" />
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Back Cover (0x04) Thumbnail + Unboxed Status */}
                        <td className="py-3 px-3 align-middle">
                          <div className="flex items-center gap-2.5">
                            {track.metadata.backCover ? (
                              <img
                                src={track.metadata.backCover.previewUrl}
                                alt="Embedded back cover"
                                referrerPolicy="no-referrer"
                                className="w-9 h-9 rounded object-cover border border-[#E2E6EC] bg-[#F1F4F9] shrink-0"
                              />
                            ) : (
                              <div
                                title="No back cover embedded"
                                className="w-9 h-9 rounded border border-dashed border-[#D4DBE5] bg-[#FAFBFD] flex items-center justify-center text-[#9AA4B2] shrink-0"
                              >
                                <Minus className="w-3.5 h-3.5" aria-hidden="true" />
                              </div>
                            )}

                            <div className="min-w-0">
                              {track.metadata.backCover ? (
                                <div className="inline-flex items-center gap-1 text-xs font-medium text-[#15803D] whitespace-nowrap">
                                  <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                                  <span>{track.isModified ? 'Updated' : 'Embedded'}</span>
                                </div>
                              ) : (
                                <div className="text-xs text-[#7C8694] whitespace-nowrap">
                                  {track.lastAction === 'removed' ? 'Removed' : 'Missing'}
                                </div>
                              )}
                              {track.metadata.backCover ? (
                                <div className="text-[11px] font-mono tabular-nums text-[#7C8694]">
                                  {formatBytes(track.metadata.backCover.sizeBytes)}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </td>

                        {/* Row Actions */}
                        <td
                          className="py-3 pl-3 pr-4 align-middle text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="inline-flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => onInspectTrack(track.id)}
                              title="Inspect binary metadata frames"
                              aria-label={`Inspect metadata for ${track.fileName}`}
                              className="p-2 text-[#525B67] hover:text-[#111418] hover:bg-[#ECEFF4] rounded-md transition-colors duration-150 cursor-pointer"
                            >
                              <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDownloadTrack(track)}
                              title="Download audio file"
                              aria-label={`Download ${track.fileName}`}
                              className={`p-2 rounded-md transition-colors duration-150 cursor-pointer ${
                                track.isModified
                                  ? 'text-[#1D4ED8] hover:bg-[#DBEAFE]'
                                  : 'text-[#525B67] hover:text-[#111418] hover:bg-[#ECEFF4]'
                              }`}
                            >
                              <Download className="w-4 h-4" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onRemoveTrack(track.id)}
                              title="Remove from queue"
                              aria-label={`Remove ${track.fileName}`}
                              className="p-2 text-[#7C8694] hover:text-[#B91C1C] hover:bg-[#FEE2E2]/60 rounded-md transition-colors duration-150 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" aria-hidden="true" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Slim Drop-More Footer Strip */}
          <div className="px-4 py-2.5 bg-[#FAFBFD] border-t border-[#ECEFF4] flex flex-wrap items-center justify-between gap-2 text-xs text-[#525B67]">
            <span>Drop additional MP3 or FLAC files anywhere on this list to append them.</span>
            <button
              type="button"
              onClick={onOpenFilePicker}
              className="font-medium text-[#1D4ED8] hover:text-[#1E40AF] whitespace-nowrap cursor-pointer"
            >
              Browse files
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
