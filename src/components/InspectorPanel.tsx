import React from 'react';
import { BookOpen, ChevronRight, Focus, X } from 'lucide-react';
import {
  ANATOMICAL_PARTS,
  ORGAN_OVERVIEWS,
  OrganSystemId,
} from '../data/anatomyData';

interface InspectorPanelProps {
  activeOrgan: OrganSystemId;
  selectedPartId: string | null;
  onSelectPart: (partId: string | null) => void;
  onFocusOrgan: (organId: OrganSystemId) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  activeOrgan,
  selectedPartId,
  onSelectPart,
  onFocusOrgan,
  isOpen,
  onToggleOpen,
}) => {
  const overview = ORGAN_OVERVIEWS[activeOrgan];
  const part = selectedPartId ? ANATOMICAL_PARTS[selectedPartId] : null;

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={onToggleOpen}
        className="fixed top-4 right-4 z-20 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#0f172a]/94 border border-slate-700/70 text-xs font-medium text-slate-200 hover:text-white hover:border-slate-500 transition-colors shadow-lg whitespace-nowrap cursor-pointer"
      >
        <BookOpen className="w-3.5 h-3.5 text-sky-400" />
        <span>Study Guide</span>
      </button>
    );
  }

  return (
    <aside
      className="fixed top-4 right-4 z-20 w-[min(340px,90vw)] max-h-[calc(100vh-170px)] flex flex-col rounded-xl bg-[#0f172a]/94 border border-slate-700/70 shadow-2xl overflow-hidden"
      aria-label="Anatomical Study Inspector"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-4 py-3.5 border-b border-slate-800">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs text-sky-400 font-medium">
            <span>{part ? part.system : overview.system}</span>
            <span aria-hidden="true">·</span>
            <span className="italic text-slate-400 truncate">
              {part ? part.latinName : overview.latinName}
            </span>
          </div>
          <h2 className="font-display text-base font-semibold text-slate-100 mt-0.5 leading-snug">
            {part ? part.name : overview.label}
          </h2>
        </div>
        <button
          type="button"
          onClick={onToggleOpen}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer shrink-0"
          aria-label="Close study guide"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Body */}
      <div className="anatomy-scroll overflow-y-auto px-4 py-3.5 space-y-4">
        {part ? (
          <>
            <p className="text-[13px] leading-relaxed text-slate-300">
              {part.summary}
            </p>

            {/* Tabular Physiological Metrics */}
            <div className="grid grid-cols-3 gap-2 py-2.5 border-y border-slate-800/90">
              {part.metrics.map((m) => (
                <div key={m.label} className="min-w-0">
                  <div className="text-[11px] text-slate-400 truncate">
                    {m.label}
                  </div>
                  <div className="font-mono-tabular text-xs font-semibold text-slate-100 mt-0.5 truncate">
                    {m.value}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xs font-semibold text-slate-200">
                Physiological Function
              </h3>
              <p className="text-[13px] leading-relaxed text-slate-400">
                {part.function}
              </p>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xs font-semibold text-slate-200">
                Clinical & Study Note
              </h3>
              <p className="text-[13px] leading-relaxed text-slate-400">
                {part.clinicalNote}
              </p>
            </div>

            {activeOrgan === 'torso' && (
              <button
                type="button"
                onClick={() => onFocusOrgan(part.organId)}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-sky-500/15 border border-sky-400/40 text-xs font-medium text-sky-300 hover:bg-sky-500/25 transition-colors cursor-pointer"
              >
                <Focus className="w-3.5 h-3.5" />
                <span>Isolate {ORGAN_OVERVIEWS[part.organId].label}</span>
              </button>
            )}
          </>
        ) : (
          <p className="text-[13px] leading-relaxed text-slate-300">
            {overview.description}
          </p>
        )}

        {/* Structure Quick-Select List */}
        <div className="pt-2 border-t border-slate-800/90 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-200">
              Anatomical Structures
            </h3>
            {part && (
              <button
                type="button"
                onClick={() => onSelectPart(null)}
                className="text-[11px] text-sky-400 hover:text-sky-300 cursor-pointer"
              >
                Clear selection
              </button>
            )}
          </div>
          <div className="space-y-1">
            {overview.parts.map((pid) => {
              const pInfo = ANATOMICAL_PARTS[pid];
              if (!pInfo) return null;
              const isActive = selectedPartId === pid;
              return (
                <button
                  key={pid}
                  type="button"
                  onClick={() => onSelectPart(isActive ? null : pid)}
                  className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-sky-500/15 text-sky-200 border border-sky-400/40'
                      : 'text-slate-300 hover:bg-slate-800/70 border border-transparent'
                  }`}
                >
                  <span className="truncate font-medium">{pInfo.name}</span>
                  <ChevronRight
                    className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                      isActive ? 'text-sky-400 translate-x-0.5' : 'text-slate-500'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
};
