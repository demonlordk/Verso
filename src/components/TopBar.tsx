import { Plus } from 'lucide-react';
import type { AppView } from '../types';

interface TopBarProps {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
  onAddAudioClick: () => void;
  trackCount: number;
}

const NAV_ITEMS: Array<{ id: AppView; label: string }> = [
  { id: 'workspace', label: 'Workspace' },
  { id: 'inspector', label: 'Tag Inspector' },
  { id: 'guide', label: 'Format Guide' },
];

export function TopBar({
  activeView,
  onNavigate,
  onAddAudioClick,
  trackCount,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-[#E2E6EC]">
      <div className="max-w-[1320px] mx-auto px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-element Brand Wordmark */}
        <button
          type="button"
          onClick={() => onNavigate('workspace')}
          className="font-display text-xl font-bold tracking-tight text-[#111418] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 rounded-sm"
        >
          Verso
        </button>

        {/* Zone 2: Clean single-line navigation links */}
        <nav aria-label="Primary" className="flex items-center gap-6 sm:gap-8 overflow-x-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`relative h-16 inline-flex items-center text-sm font-medium whitespace-nowrap shrink-0 transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 ${
                  isActive
                    ? 'text-[#111418]'
                    : 'text-[#525B67] hover:text-[#111418]'
                }`}
              >
                {item.label}
                {item.id === 'inspector' && trackCount > 0 ? (
                  <span className="ml-1.5 font-mono text-xs text-[#7C8694] tabular-nums">
                    {trackCount}
                  </span>
                ) : null}
                {isActive ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-[2px] bg-[#1D4ED8]"
                  />
                ) : null}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single primary action */}
        <div className="shrink-0">
          <button
            type="button"
            onClick={onAddAudioClick}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#111418] hover:bg-[#232933] active:scale-[0.99] rounded-lg transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Add Audio Files</span>
          </button>
        </div>
      </div>
    </header>
  );
}
