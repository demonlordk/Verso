/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import JSZip from 'jszip';
import { BackCoverPanel } from './components/BackCoverPanel';
import { FormatGuide } from './components/FormatGuide';
import { TagInspector } from './components/TagInspector';
import { TopBar } from './components/TopBar';
import { TrackQueue } from './components/TrackQueue';
import {
  embedBackCoverInAudio,
  parseAudioMetadata,
  revokeMetadataUrls,
} from './lib/audioMetadata';
import {
  extensionForMime,
  loadImageAssetFromFile,
  prepareImageForEmbedding,
  triggerBlobDownload,
  type BackCoverAsset,
  type ImageEncodingMode,
} from './lib/imageUtils';
import {
  createSampleAlbumFiles,
  loadSampleBackCoverAsset,
} from './lib/sampleAudio';
import type { AppView, TrackFilter, TrackItem } from './types';

function createTrackId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `track-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function App() {
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const tracksRef = useRef<TrackItem[]>([]);
  const stagedBackCoverRef = useRef<BackCoverAsset | null>(null);

  const [activeView, setActiveView] = useState<AppView>('workspace');
  const [tracks, setTracks] = useState<TrackItem[]>([]);
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<TrackFilter>('all');

  const [stagedBackCover, setStagedBackCover] = useState<BackCoverAsset | null>(null);
  const [description, setDescription] = useState('');
  const [encodingMode, setEncodingMode] = useState<ImageEncodingMode>('original');

  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const [isEmbedding, setIsEmbedding] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    tone: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);

  useEffect(() => {
    stagedBackCoverRef.current = stagedBackCover;
  }, [stagedBackCover]);

  useEffect(() => {
    return () => {
      for (const track of tracksRef.current) {
        revokeMetadataUrls(track.metadata);
      }
      if (stagedBackCoverRef.current?.previewUrl) {
        URL.revokeObjectURL(stagedBackCoverRef.current.previewUrl);
      }
    };
  }, []);

  const activeTrack =
    tracks.find((t) => t.id === activeTrackId) ?? tracks[0] ?? null;
  const selectedTrackCount = tracks.filter((t) => t.selected).length;
  const modifiedTracks = tracks.filter((t) => t.isModified);

  const handleAddAudioFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    const added: TrackItem[] = [];
    const errors: string[] = [];

    for (const file of files) {
      try {
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        const metadata = parseAudioMetadata(bytes, file.name);
        added.push({
          id: createTrackId(),
          fileName: file.name,
          sizeBytes: bytes.byteLength,
          bytes,
          metadata,
          selected: true,
          isModified: false,
        });
      } catch (err) {
        errors.push(
          `${file.name}: ${err instanceof Error ? err.message : 'Unsupported file.'}`
        );
      }
    }

    if (added.length > 0) {
      setTracks((prev) => [...prev, ...added]);
      setActiveTrackId((current) => current ?? added[0].id);
      setActiveView('workspace');
      setStatusMessage(
        errors.length > 0
          ? {
              tone: 'error',
              text: `Loaded ${added.length} track(s). Skipped ${errors.length}: ${errors[0]}`,
            }
          : {
              tone: 'success',
              text: `Loaded ${added.length} ${added.length === 1 ? 'track' : 'tracks'} ready for Cover (Back) tagging.`,
            }
      );
    } else if (errors.length > 0) {
      setStatusMessage({ tone: 'error', text: errors[0] });
    }
  };

  const handleLoadSampleAlbum = async () => {
    setIsLoadingSample(true);
    setStatusMessage(null);
    try {
      const sampleFiles = await createSampleAlbumFiles();
      const loadedTracks: TrackItem[] = sampleFiles.map((item) => ({
        id: createTrackId(),
        fileName: item.fileName,
        sizeBytes: item.bytes.byteLength,
        bytes: item.bytes,
        metadata: parseAudioMetadata(item.bytes, item.fileName),
        selected: true,
        isModified: false,
      }));
      setTracks((prev) => [...prev, ...loadedTracks]);
      setActiveTrackId(loadedTracks[0].id);

      // Also pre-load sample back cover if none staged yet so the user sees it immediately
      if (!stagedBackCover) {
        const sampleBack = await loadSampleBackCoverAsset();
        setStagedBackCover(sampleBack);
      }
      setStatusMessage({
        tone: 'success',
        text: 'Loaded 3 sample MP3 tracks (with Front Cover 0x03) and a matching Back Cover sleeve image.',
      });
    } catch (err) {
      setStatusMessage({
        tone: 'error',
        text: err instanceof Error ? err.message : 'Could not load sample tracks.',
      });
    } finally {
      setIsLoadingSample(false);
    }
  };

  const handleSelectImageFile = async (file: File) => {
    setStatusMessage(null);
    try {
      const asset = await loadImageAssetFromFile(file);
      setStagedBackCover((prev) => {
        if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
        return asset;
      });
    } catch (err) {
      setStatusMessage({
        tone: 'error',
        text: err instanceof Error ? err.message : 'Could not read image file.',
      });
    }
  };

  const handleLoadSampleBackCover = async () => {
    setStatusMessage(null);
    try {
      const asset = await loadSampleBackCoverAsset();
      setStagedBackCover((prev) => {
        if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
        return asset;
      });
    } catch (err) {
      setStatusMessage({
        tone: 'error',
        text: err instanceof Error ? err.message : 'Could not load sample back cover.',
      });
    }
  };

  const handleClearStagedImage = () => {
    setStagedBackCover((prev) => {
      if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
  };

  const handleEmbedBackCover = async () => {
    if (!stagedBackCover || selectedTrackCount === 0) return;
    setIsEmbedding(true);
    setStatusMessage(null);

    try {
      const prepared = await prepareImageForEmbedding(stagedBackCover, encodingMode);
      let updatedCount = 0;
      const errors: string[] = [];

      const nextTracks = tracks.map((track) => {
        if (!track.selected) return track;
        try {
          const updatedBytes = embedBackCoverInAudio(track.bytes, track.fileName, {
            data: prepared.data,
            mimeType: prepared.mimeType,
            description,
            width: prepared.width,
            height: prepared.height,
          });
          const updatedMeta = parseAudioMetadata(updatedBytes, track.fileName);
          revokeMetadataUrls(track.metadata);
          updatedCount++;
          return {
            ...track,
            bytes: updatedBytes,
            sizeBytes: updatedBytes.byteLength,
            metadata: updatedMeta,
            isModified: true,
            lastAction: 'embedded' as const,
          };
        } catch (err) {
          errors.push(
            `${track.fileName}: ${err instanceof Error ? err.message : 'Embedding failed.'}`
          );
          return track;
        }
      });

      setTracks(nextTracks);

      if (errors.length > 0) {
        setStatusMessage({
          tone: 'error',
          text:
            updatedCount > 0
              ? `Embedded into ${updatedCount} track(s), but ${errors.length} failed: ${errors[0]}`
              : errors[0],
        });
      } else {
        setStatusMessage({
          tone: 'success',
          text: `Embedded Cover (Back) tag (0x04) into ${updatedCount} ${
            updatedCount === 1 ? 'track' : 'tracks'
          }. Front covers and existing tags were preserved.`,
        });
      }
    } catch (err) {
      setStatusMessage({
        tone: 'error',
        text: err instanceof Error ? err.message : 'Failed to prepare artwork.',
      });
    } finally {
      setIsEmbedding(false);
    }
  };

  const handleRemoveBackCoverFromSelected = () => {
    const targets = tracks.filter((t) => t.selected && t.metadata.backCover);
    if (targets.length === 0) {
      setStatusMessage({
        tone: 'error',
        text: 'None of the selected tracks currently have a Cover (Back) tag to strip.',
      });
      return;
    }

    let strippedCount = 0;
    const nextTracks = tracks.map((track) => {
      if (!track.selected || !track.metadata.backCover) return track;
      const updatedBytes = embedBackCoverInAudio(track.bytes, track.fileName, null);
      const updatedMeta = parseAudioMetadata(updatedBytes, track.fileName);
      revokeMetadataUrls(track.metadata);
      strippedCount++;
      return {
        ...track,
        bytes: updatedBytes,
        sizeBytes: updatedBytes.byteLength,
        metadata: updatedMeta,
        isModified: true,
        lastAction: 'removed' as const,
      };
    });

    setTracks(nextTracks);
    setStatusMessage({
      tone: 'success',
      text: `Removed Cover (Back) tag from ${strippedCount} ${
        strippedCount === 1 ? 'track' : 'tracks'
      }.`,
    });
  };

  const handleExtractExistingBackCover = (track: TrackItem) => {
    const back = track.metadata.backCover;
    if (!back) return;
    const baseName = track.fileName.replace(/\.[^/.]+$/, '');
    const ext = extensionForMime(back.mimeType);
    const blob = new Blob([back.data.buffer as ArrayBuffer], { type: back.mimeType });
    triggerBlobDownload(blob, `${baseName}_back_cover.${ext}`);
  };

  const handleDownloadTrack = (track: TrackItem) => {
    const mime = track.metadata.format === 'flac' ? 'audio/flac' : 'audio/mpeg';
    const blob = new Blob([track.bytes.buffer as ArrayBuffer], { type: mime });
    triggerBlobDownload(blob, track.fileName);
  };

  const handleDownloadModified = async () => {
    if (modifiedTracks.length === 0) return;
    if (modifiedTracks.length === 1) {
      handleDownloadTrack(modifiedTracks[0]);
      return;
    }

    setIsZipping(true);
    try {
      const zip = new JSZip();
      const usedNames = new Map<string, number>();

      for (const track of modifiedTracks) {
        let name = track.fileName;
        const count = usedNames.get(name) ?? 0;
        if (count > 0) {
          const dotIdx = name.lastIndexOf('.');
          name =
            dotIdx > 0
              ? `${name.slice(0, dotIdx)} (${count})${name.slice(dotIdx)}`
              : `${name} (${count})`;
        }
        usedNames.set(track.fileName, count + 1);
        zip.file(name, track.bytes);
      }

      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'STORE', // Audio files are already compressed; STORE is instant!
      });
      const albumSlug =
        modifiedTracks[0].metadata.album
          ?.toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_|_$/g, '') || 'tagged_audio';
      triggerBlobDownload(zipBlob, `${albumSlug}_back_cover_tagged.zip`);
    } catch (err) {
      setStatusMessage({
        tone: 'error',
        text: err instanceof Error ? err.message : 'Failed to build ZIP archive.',
      });
    } finally {
      setIsZipping(false);
    }
  };

  const handleToggleTrackChecked = (id: string) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, selected: !t.selected } : t))
    );
  };

  const handleToggleAllChecked = (checked: boolean) => {
    setTracks((prev) => prev.map((t) => ({ ...t, selected: checked })));
  };

  const handleRemoveTrack = (id: string) => {
    setTracks((prev) => {
      const target = prev.find((t) => t.id === id);
      if (target) revokeMetadataUrls(target.metadata);
      const remaining = prev.filter((t) => t.id !== id);
      if (activeTrackId === id) {
        setActiveTrackId(remaining[0]?.id ?? null);
      }
      return remaining;
    });
  };

  const handleClearAll = () => {
    for (const track of tracks) {
      revokeMetadataUrls(track.metadata);
    }
    setTracks([]);
    setActiveTrackId(null);
    setStatusMessage(null);
  };

  const handleInspectTrack = (id: string) => {
    setActiveTrackId(id);
    setActiveView('inspector');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F7F9] text-[#111418]">
      <input
        ref={audioInputRef}
        type="file"
        multiple
        accept=".mp3,.flac,audio/mpeg,audio/flac"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            void handleAddAudioFiles(e.target.files);
          }
          e.target.value = '';
        }}
      />

      <TopBar
        activeView={activeView}
        onNavigate={setActiveView}
        onAddAudioClick={() => audioInputRef.current?.click()}
        trackCount={tracks.length}
      />

      <main className="flex-1 w-full max-w-[1320px] mx-auto px-6 py-8">
        {activeView === 'workspace' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 xl:col-span-8 min-w-0">
              <TrackQueue
                tracks={tracks}
                activeTrackId={activeTrack?.id ?? null}
                searchQuery={searchQuery}
                filter={filter}
                isLoadingSample={isLoadingSample}
                onSearchChange={setSearchQuery}
                onFilterChange={setFilter}
                onSelectTrack={setActiveTrackId}
                onToggleTrackChecked={handleToggleTrackChecked}
                onToggleAllChecked={handleToggleAllChecked}
                onAddFiles={(files) => void handleAddAudioFiles(files)}
                onOpenFilePicker={() => audioInputRef.current?.click()}
                onLoadSample={() => void handleLoadSampleAlbum()}
                onInspectTrack={handleInspectTrack}
                onDownloadTrack={handleDownloadTrack}
                onRemoveTrack={handleRemoveTrack}
                onClearAll={handleClearAll}
              />
            </div>

            <div className="lg:col-span-5 xl:col-span-4 min-w-0">
              <BackCoverPanel
                stagedBackCover={stagedBackCover}
                activeTrack={activeTrack}
                selectedTrackCount={selectedTrackCount}
                modifiedTrackCount={modifiedTracks.length}
                description={description}
                encodingMode={encodingMode}
                isEmbedding={isEmbedding}
                isZipping={isZipping}
                statusMessage={statusMessage}
                onDescriptionChange={setDescription}
                onEncodingModeChange={setEncodingMode}
                onSelectImageFile={(file) => void handleSelectImageFile(file)}
                onClearStagedImage={handleClearStagedImage}
                onLoadSampleBackCover={() => void handleLoadSampleBackCover()}
                onEmbedBackCover={() => void handleEmbedBackCover()}
                onRemoveBackCoverFromSelected={handleRemoveBackCoverFromSelected}
                onExtractExistingBackCover={handleExtractExistingBackCover}
                onDownloadModified={() => void handleDownloadModified()}
              />
            </div>
          </div>
        ) : activeView === 'inspector' ? (
          <TagInspector
            tracks={tracks}
            activeTrack={activeTrack}
            onSelectTrack={setActiveTrackId}
            onBackToWorkspace={() => setActiveView('workspace')}
            onOpenFilePicker={() => audioInputRef.current?.click()}
          />
        ) : (
          <FormatGuide onBackToWorkspace={() => setActiveView('workspace')} />
        )}
      </main>

      <footer className="border-t border-[#E2E6EC] bg-white">
        <div className="max-w-[1320px] mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4 text-xs text-[#7C8694]">
          <span>Verso · Local client-side Cover (Back) metadata tagging</span>
          <span>ID3v2 APIC 0x04 · FLAC PICTURE Type 4 · Zero server uploads</span>
        </div>
      </footer>
    </div>
  );
}
