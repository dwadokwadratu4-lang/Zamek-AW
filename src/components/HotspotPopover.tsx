import React from 'react';
import { X, Landmark } from 'lucide-react';
import { ERAS, EraId, HOTSPOTS, HotspotId } from '../types/castle';

interface HotspotPopoverProps {
  hotspotId: HotspotId;
  era: EraId;
  onClose: () => void;
  onSelectHotspot: (id: HotspotId) => void;
}

export const HotspotPopover: React.FC<HotspotPopoverProps> = ({
  hotspotId,
  era,
  onClose,
  onSelectHotspot,
}) => {
  const data = HOTSPOTS[hotspotId];
  const note = data.notesByEra[era];
  const eraMeta = ERAS.find((e) => e.id === era)!;
  const hotspotOrder: HotspotId[] = ['chapel', 'palace', 'gatehouse'];

  return (
    <div
      className="fixed inset-x-4 top-20 z-30 mx-auto max-w-md rounded-xl bg-[#181210]/95 border border-[#D4AF37]/40 p-4 text-[#F5EFE6] shadow-2xl sm:inset-x-auto sm:right-5 sm:top-20 sm:w-96"
      role="dialog"
      aria-label={data.title}
    >
      <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
        <div className="min-w-0">
          <p className="text-[11px] font-mono-tabular tracking-wider uppercase text-[#D4AF37]">
            {eraMeta.century} · {data.subtitle}
          </p>
          <h3 className="mt-0.5 font-display text-xl font-semibold leading-tight text-white">
            {data.title}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Zamknij notę historyczną"
          className="p-2 -mr-1 -mt-1 rounded-lg text-[#B8ADA0] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-3 space-y-2.5">
        <h4 className="text-sm font-semibold text-[#F3D982] flex items-center gap-1.5">
          <Landmark className="w-3.5 h-3.5 shrink-0 text-[#D4AF37]" />
          <span>{note.heading}</span>
        </h4>
        <p className="text-[13px] leading-relaxed text-[#E7DFD3]">{note.body}</p>
        <p className="text-xs leading-relaxed text-[#AFA497] border-t border-white/10 pt-2">
          {note.detail}
        </p>
      </div>

      <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between gap-2">
        <span className="text-[11px] text-[#9E9285]">Obiekty na makiecie:</span>
        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg">
          {hotspotOrder.map((id, idx) => {
            const active = id === hotspotId;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onSelectHotspot(id)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#D4AF37] text-[#1A080C] font-semibold'
                    : 'text-[#C9BFAF] hover:text-white hover:bg-white/10'
                }`}
              >
                {idx === 0 ? 'Kaplica' : idx === 1 ? 'Pałac' : 'Brama'}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
