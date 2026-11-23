import { ArrowLeft } from 'lucide-react';

interface FormatGuideProps {
  onBackToWorkspace: () => void;
}

const COMPATIBILITY_ROWS = [
  {
    player: 'MusicBee (Windows)',
    mp3Back: 'Supported (APIC 0x04)',
    flacBack: 'Supported (Type 4)',
    notes: 'Displays back cover in artwork cycling and dedicated album sleeve panels.',
  },
  {
    player: 'foobar2000',
    mp3Back: 'Supported (APIC 0x04)',
    flacBack: 'Supported (Type 4)',
    notes: 'Native Back Cover tab inside Album Art Viewer and Properties.',
  },
  {
    player: 'Mp3tag / Kid3 / Yate',
    mp3Back: 'Supported (APIC 0x04)',
    flacBack: 'Supported (Type 4)',
    notes: 'Recognized directly as "Back Cover" alongside existing "Front Cover".',
  },
  {
    player: 'Symfonium & Gonemad (Android)',
    mp3Back: 'Supported (APIC 0x04)',
    flacBack: 'Supported (Type 4)',
    notes: 'Reads multi-picture artwork blocks when JPEG or PNG is embedded.',
  },
  {
    player: 'VLC Media Player',
    mp3Back: 'Preserved in container',
    flacBack: 'Preserved in container',
    notes: 'Shows Front Cover by default while keeping Back Cover metadata intact.',
  },
];

export function FormatGuide({ onBackToWorkspace }: FormatGuideProps) {
  return (
    <section aria-label="Cover (Back) Format Specification" className="max-w-4xl mx-auto flex flex-col gap-8">
      <div>
        <button
          type="button"
          onClick={onBackToWorkspace}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#525B67] hover:text-[#111418] transition-colors duration-150 mb-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Back to Workspace</span>
        </button>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-[#111418]">
          How Cover (Back) Metadata Works
        </h1>
        <p className="mt-2 text-sm text-[#525B67] leading-relaxed max-w-2xl">
          Verso edits only the metadata header of your audio file directly in memory. The compressed or lossless audio stream is copied byte-for-byte with zero re-encoding.
        </p>
      </div>

      {/* Binary Spec Comparison */}
      <div className="bg-white border border-[#E2E6EC] rounded-xl grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#ECEFF4]">
        <div className="p-6 flex flex-col gap-3">
          <div className="font-mono text-xs text-[#1D4ED8] font-medium">MP3 · ID3v2.3 &amp; ID3v2.4</div>
          <h2 className="font-display text-lg font-semibold text-[#111418]">
            APIC Frame (Picture Type 0x04)
          </h2>
          <p className="text-sm text-[#525B67] leading-relaxed">
            Writes a standard Attached Picture (<code className="font-mono text-xs text-[#111418]">APIC</code>) frame with the picture-type byte set to <code className="font-mono text-xs text-[#111418]">0x04</code> (Cover back). Any existing Front Cover (<code className="font-mono text-xs text-[#111418]">0x03</code>) and all text tags remain untouched.
          </p>
          <dl className="mt-2 pt-3 border-t border-[#ECEFF4] space-y-2 text-xs">
            <div className="flex justify-between gap-4">
              <dt className="text-[#525B67]">Frame identifier</dt>
              <dd className="font-mono text-[#111418]">APIC</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#525B67]">Picture type byte</dt>
              <dd className="font-mono text-[#111418]">0x04 (Cover back)</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#525B67]">Container version</dt>
              <dd className="font-mono text-[#111418]">Preserves ID3v2.4 or writes ID3v2.3</dd>
            </div>
          </dl>
        </div>

        <div className="p-6 flex flex-col gap-3">
          <div className="font-mono text-xs text-[#1D4ED8] font-medium">FLAC · Native Stream</div>
          <h2 className="font-display text-lg font-semibold text-[#111418]">
            METADATA_BLOCK_PICTURE (Type 4)
          </h2>
          <p className="text-sm text-[#525B67] leading-relaxed">
            Inserts a native FLAC metadata block (type <code className="font-mono text-xs text-[#111418]">6</code>) with big-endian picture type <code className="font-mono text-xs text-[#111418]">4</code>, exact pixel dimensions, color depth, and raw image payload while preserving Vorbis comments and Front Cover blocks.
          </p>
          <dl className="mt-2 pt-3 border-t border-[#ECEFF4] space-y-2 text-xs">
            <div className="flex justify-between gap-4">
              <dt className="text-[#525B67]">Metadata block type</dt>
              <dd className="font-mono text-[#111418]">6 (PICTURE)</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#525B67]">Picture type uint32</dt>
              <dd className="font-mono text-[#111418]">0x00000004 (Cover back)</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#525B67]">Max image block size</dt>
              <dd className="font-mono text-[#111418]">16 MB (24-bit block length)</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Player Compatibility Matrix */}
      <div className="bg-white border border-[#E2E6EC] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#ECEFF4]">
          <h2 className="font-display text-base font-semibold text-[#111418]">
            Music Player &amp; Tagger Support
          </h2>
          <p className="text-xs text-[#525B67] mt-0.5">
            JPEG and PNG provide the broadest compatibility across desktop and portable audio players.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#ECEFF4] bg-[#FAFBFD] text-xs font-medium text-[#525B67]">
                <th className="py-2.5 pl-6 pr-3">Application</th>
                <th className="py-2.5 px-3">MP3</th>
                <th className="py-2.5 px-3">FLAC</th>
                <th className="py-2.5 pl-3 pr-6">Behavior</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ECEFF4] text-sm">
              {COMPATIBILITY_ROWS.map((row) => (
                <tr key={row.player}>
                  <td className="py-3 pl-6 pr-3 font-medium text-[#111418] whitespace-nowrap">
                    {row.player}
                  </td>
                  <td className="py-3 px-3 font-mono text-xs text-[#15803D] whitespace-nowrap">
                    {row.mp3Back}
                  </td>
                  <td className="py-3 px-3 font-mono text-xs text-[#15803D] whitespace-nowrap">
                    {row.flacBack}
                  </td>
                  <td className="py-3 pl-3 pr-6 text-xs text-[#525B67]">{row.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Privacy Note */}
      <div className="text-xs text-[#7C8694] leading-relaxed">
        Note on M4A/MP4 containers: Standard MP4 <code className="font-mono text-[#525B67]">covr</code> atoms do not carry a picture-type byte distinguishing front vs. back covers. For reliable Cover (Back) tagging, use MP3 (ID3v2) or FLAC. All processing happens strictly inside your browser with zero file uploads.
      </div>
    </section>
  );
}
