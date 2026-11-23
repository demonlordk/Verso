import type { AudioMetadataResult } from './lib/audioMetadata';

export type AppView = 'workspace' | 'inspector' | 'guide';

export type TrackFilter = 'all' | 'missing' | 'present';

export interface TrackItem {
  id: string;
  fileName: string;
  sizeBytes: number;
  bytes: Uint8Array;
  metadata: AudioMetadataResult;
  selected: boolean;
  isModified: boolean;
  lastAction?: 'embedded' | 'removed';
}
