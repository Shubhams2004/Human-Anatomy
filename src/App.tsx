import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CameraPreset,
  ORGAN_OVERVIEWS,
  OrganSystemId,
  ViewMode,
} from './data/anatomyData';
import {
  AnatomyViewport,
  ViewportActions,
} from './components/AnatomyViewport';
import { ControlDock } from './components/ControlDock';
import { InspectorPanel } from './components/InspectorPanel';

const ORGAN_TABS: OrganSystemId[] = [
  'torso',
  'heart',
  'brain',
  'lungs',
  'digestive',
  'kidneys',
];

export default function App() {
  const [activeOrgan, setActiveOrgan] = useState<OrganSystemId>('heart');
  const [selectedPartId, setSelectedPartId] = useState<string | null>(
    'heart_ventricles',
  );
  const [explodeAmount, setExplodeAmount] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('anatomical');
  const [animatePhysiology, setAnimatePhysiology] = useState(true);
  const [autoRotate, setAutoRotate] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [zoomPercent, setZoomPercent] = useState(100);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true,
  );

  const viewportActionsRef = useRef<ViewportActions | null>(null);

  const handleSelectOrgan = useCallback((organId: OrganSystemId) => {
    setActiveOrgan(organId);
    setExplodeAmount(0);
    const firstPart = ORGAN_OVERVIEWS[organId].parts[0] ?? null;
    setSelectedPartId(organId === 'torso' ? null : firstPart);
  }, []);

  const handleSelectPart = useCallback((partId: string | null) => {
    setSelectedPartId(partId);
    if (partId) {
      setInspectorOpen(true);
    }
  }, []);

  // Keyboard shortcut 'H' for Zen / Hide Controls
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key.toLowerCase() === 'h') {
        setDockCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#0b101b]">
      {/* Full-Viewport Interactive 3D Canvas */}
      <AnatomyViewport
        activeOrgan={activeOrgan}
        selectedPartId={selectedPartId}
        onSelectPart={handleSelectPart}
        explodeAmount={explodeAmount}
        viewMode={viewMode}
        animatePhysiology={animatePhysiology}
        autoRotate={autoRotate}
        showLabels={showLabels}
        onZoomChange={setZoomPercent}
        actionsRef={viewportActionsRef}
      />

      {/* Minimal Top-Left Brand & Organ Switcher */}
      <header className="fixed top-4 left-4 z-20 flex flex-col gap-2.5 max-w-[calc(100vw-150px)]">
        <div className="flex items-baseline gap-2.5 px-1">
          <h1 className="font-display text-base sm:text-lg font-semibold tracking-tight text-slate-100 whitespace-nowrap">
            Human Anatomy 3D Atlas
          </h1>
          <span className="hidden md:inline text-xs text-slate-400 whitespace-nowrap">
            {ORGAN_OVERVIEWS[activeOrgan].latinName}
          </span>
        </div>

        <nav
          className="flex items-center gap-1 p-1 rounded-xl bg-[#0f172a]/94 border border-slate-700/70 shadow-lg overflow-x-auto max-w-full"
          aria-label="Organ system selector"
        >
          {ORGAN_TABS.map((id) => {
            const isActive = activeOrgan === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleSelectOrgan(id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-sky-500 text-slate-950'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                {ORGAN_OVERVIEWS[id].label}
              </button>
            );
          })}
        </nav>
      </header>

      {/* Collapsible Right-Side Educational Inspector */}
      <InspectorPanel
        activeOrgan={activeOrgan}
        selectedPartId={selectedPartId}
        onSelectPart={setSelectedPartId}
        onFocusOrgan={handleSelectOrgan}
        isOpen={inspectorOpen}
        onToggleOpen={() => setInspectorOpen((v) => !v)}
      />

      {/* Collapsible Bottom Control Dock */}
      <ControlDock
        collapsed={dockCollapsed}
        onToggleCollapse={() => setDockCollapsed((v) => !v)}
        explodeAmount={explodeAmount}
        onExplodeChange={setExplodeAmount}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        animatePhysiology={animatePhysiology}
        onTogglePhysiology={() => setAnimatePhysiology((v) => !v)}
        autoRotate={autoRotate}
        onToggleAutoRotate={() => setAutoRotate((v) => !v)}
        showLabels={showLabels}
        onToggleLabels={() => setShowLabels((v) => !v)}
        zoomPercent={zoomPercent}
        onZoomIn={() => viewportActionsRef.current?.zoomIn()}
        onZoomOut={() => viewportActionsRef.current?.zoomOut()}
        onCameraPreset={(preset: CameraPreset) =>
          viewportActionsRef.current?.applyPreset(preset)
        }
      />
    </main>
  );
}
