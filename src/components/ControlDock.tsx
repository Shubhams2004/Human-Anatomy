import React from 'react';
import {
  ChevronDown,
  ChevronUp,
  Eye,
  Ghost,
  Layers,
  MapPin,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { CameraPreset, ViewMode } from '../data/anatomyData';

interface ControlDockProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  explodeAmount: number;
  onExplodeChange: (value: number) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  transparentBody: boolean;
  onToggleTransparentBody: () => void;
  showTransparentToggle: boolean;
  animatePhysiology: boolean;
  onTogglePhysiology: () => void;
  physiologySpeed: number;
  onCycleSpeed: () => void;
  autoRotate: boolean;
  onToggleAutoRotate: () => void;
  showLabels: boolean;
  onToggleLabels: () => void;
  zoomPercent: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onCameraPreset: (preset: CameraPreset) => void;
}

export const ControlDock: React.FC<ControlDockProps> = ({
  collapsed,
  onToggleCollapse,
  explodeAmount,
  onExplodeChange,
  viewMode,
  onViewModeChange,
  transparentBody,
  onToggleTransparentBody,
  showTransparentToggle,
  animatePhysiology,
  onTogglePhysiology,
  physiologySpeed,
  onCycleSpeed,
  autoRotate,
  onToggleAutoRotate,
  showLabels,
  onToggleLabels,
  zoomPercent,
  onZoomIn,
  onZoomOut,
  onCameraPreset,
}) => {
  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-20 w-[min(960px,95vw)] transition-transform duration-300 ease-out ${
        collapsed ? 'translate-y-[calc(100%+20px)]' : 'translate-y-0'
      }`}
    >
      <div className="flex justify-center mb-1.5">
        <button
          type="button"
          onClick={onToggleCollapse}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#0f172a]/95 border border-slate-700/70 text-xs font-medium text-slate-300 hover:text-white transition-colors shadow-md whitespace-nowrap cursor-pointer ${
            collapsed ? '-translate-y-[calc(100%+24px)]' : ''
          }`}
        >
          {collapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 text-sky-400" />
              <span>Show Controls</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 text-sky-400" />
              <span>Hide Controls</span>
            </>
          )}
        </button>
      </div>

      <div className="rounded-xl bg-[#0f172a]/94 border border-slate-700/70 shadow-2xl px-3.5 py-2.5 flex flex-col gap-2.5">
        {/* Row 1 */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-[180px] flex-1 max-w-[260px]">
            <span className="flex items-center gap-1 text-xs font-medium text-slate-300 whitespace-nowrap">
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              Explode
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={explodeAmount}
              onChange={(e) => onExplodeChange(parseFloat(e.target.value))}
              aria-label="Exploded view separation"
              className="anatomy-slider w-full"
            />
            <span className="font-mono-tabular text-xs text-slate-400 w-8 text-right">
              {Math.round(explodeAmount * 100)}%
            </span>
          </div>

          {/* View Mode */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-900/90 border border-slate-800">
            {(
              [
                { id: 'anatomical', label: 'Anatomical' },
                { id: 'xray', label: 'X-Ray' },
                { id: 'wireframe', label: 'Wireframe' },
              ] as { id: ViewMode; label: string }[]
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => onViewModeChange(m.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  viewMode === m.id
                    ? 'bg-sky-500 text-slate-950'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Playback & Visual Toggles */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {showTransparentToggle && (
              <button
                type="button"
                onClick={onToggleTransparentBody}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  transparentBody
                    ? 'bg-sky-500/20 border-sky-400/50 text-sky-300'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
                title="Transparent outer body envelope"
              >
                <Ghost className="w-3.5 h-3.5" />
                <span>Transparent</span>
              </button>
            )}

            <button
              type="button"
              onClick={onTogglePhysiology}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                animatePhysiology
                  ? 'bg-rose-500/15 border-rose-400/50 text-rose-300'
                  : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title="Play/Pause physiological animation"
            >
              {animatePhysiology ? (
                <Pause className="w-3.5 h-3.5" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              <span>{animatePhysiology ? 'Pause' : 'Play'}</span>
            </button>

            <button
              type="button"
              onClick={onCycleSpeed}
              className="font-mono-tabular px-2 py-1.5 rounded-lg text-xs font-medium bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-white cursor-pointer"
              title="Cycle animation speed"
            >
              {physiologySpeed}x
            </button>

            <button
              type="button"
              onClick={onToggleAutoRotate}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                autoRotate
                  ? 'bg-sky-500/15 border-sky-400/50 text-sky-300'
                  : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Orbit</span>
            </button>

            <button
              type="button"
              onClick={onToggleLabels}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                showLabels
                  ? 'bg-sky-500/15 border-sky-400/50 text-sky-300'
                  : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Pin</span>
            </button>
          </div>
        </div>

        {/* Row 2: Camera Presets + Zoom */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-800/80">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="flex items-center gap-1 text-xs text-slate-400 mr-1 whitespace-nowrap">
              <Eye className="w-3.5 h-3.5 text-slate-500" />
              View
            </span>
            {(
              [
                { id: 'front', label: 'Front' },
                { id: 'back', label: 'Back' },
                { id: 'left', label: 'Left' },
                { id: 'right', label: 'Right' },
                { id: 'superior', label: 'Top' },
                { id: 'reset', label: 'Reset' },
              ] as { id: CameraPreset; label: string }[]
            ).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onCameraPreset(p.id)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-600 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {p.id === 'reset' && <RotateCcw className="w-3 h-3" />}
                <span>{p.label}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden md:inline text-[11px] text-slate-500 whitespace-nowrap">
              Drag to rotate · Pinch or scroll to zoom
            </span>
            <div className="flex items-center rounded-lg bg-slate-900/90 border border-slate-800">
              <button
                type="button"
                onClick={onZoomOut}
                className="p-1.5 text-slate-300 hover:text-white cursor-pointer"
                aria-label="Zoom out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono-tabular text-xs text-slate-300 px-2 min-w-[44px] text-center border-x border-slate-800">
                {zoomPercent}%
              </span>
              <button
                type="button"
                onClick={onZoomIn}
                className="p-1.5 text-slate-300 hover:text-white cursor-pointer"
                aria-label="Zoom in"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
