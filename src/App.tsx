import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import {
  ANATOMICAL_PARTS,
  ANATOMICAL_SYSTEMS,
  AnatomicalSystemId,
  CameraPreset,
  LabWorkspaceMode,
  ORGAN_OVERVIEWS,
  OrganSystemId,
  PATHOLOGY_CASES,
  PHYSIOLOGY_SIMS,
  QuizDifficulty,
  ViewMode,
} from './data/anatomyData';
import {
  AnatomyViewport,
  ViewportActions,
} from './components/AnatomyViewport';
import { ControlDock } from './components/ControlDock';
import { InspectorPanel } from './components/InspectorPanel';
import { LearningActivityType, LeftSidebar } from './components/LeftSidebar';
import {
  LabProgressState,
  loadProgress,
  QuizAttempt,
  saveProgress,
} from './utils/progressStore';

const DEFAULT_SYSTEMS: Record<AnatomicalSystemId, boolean> = {
  skeletal: true,
  muscular: true,
  nervous: true,
  cardiovascular: true,
  respiratory: true,
  digestive: true,
  urinary: true,
  reproductive: true,
  endocrine: true,
  integumentary: true,
};

export default function App() {
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const [workspaceMode, setWorkspaceMode] = useState<LabWorkspaceMode>('explorer');
  const [activeOrgan, setActiveOrgan] = useState<OrganSystemId>('body');
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [lastClickedPartId, setLastClickedPartId] = useState<string | null>(null);

  const [visibleSystems, setVisibleSystems] =
    useState<Record<AnatomicalSystemId, boolean>>(DEFAULT_SYSTEMS);
  const [transparentBody, setTransparentBody] = useState(true);
  const [isolatedPartId, setIsolatedPartId] = useState<string | null>(null);

  const [explodeAmount, setExplodeAmount] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('anatomical');
  const [cutaway, setCutaway] = useState(false);
  const [animatePhysiology, setAnimatePhysiology] = useState(!prefersReducedMotion);
  const [physiologySpeed, setPhysiologySpeed] = useState(1);
  const [activePhysiologyId, setActivePhysiologyId] = useState(PHYSIOLOGY_SIMS[0].id);

  const [activePathologyId, setActivePathologyId] = useState(PATHOLOGY_CASES[0].id);
  const [pathologyShowAffected, setPathologyShowAffected] = useState(true);

  const [learningActivity, setLearningActivity] =
    useState<LearningActivityType>('guided');
  const [quizDifficulty, setQuizDifficulty] = useState<QuizDifficulty>('foundation');

  const [autoRotate, setAutoRotate] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [zoomPercent, setZoomPercent] = useState(100);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [leftOpen, setLeftOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true,
  );
  const [rightOpen, setRightOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true,
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [progress, setProgress] = useState<LabProgressState>(() => loadProgress());

  const viewportActionsRef = useRef<ViewportActions | null>(null);

  const updateProgress = useCallback((updater: (prev: LabProgressState) => LabProgressState) => {
    setProgress((prev) => {
      const next = updater(prev);
      saveProgress(next);
      return next;
    });
  }, []);

  const handleSelectOrgan = useCallback((organId: OrganSystemId) => {
    setActiveOrgan(organId);
    setExplodeAmount(0);
    setIsolatedPartId(null);
    const firstPart = ORGAN_OVERVIEWS[organId].parts[0] ?? null;
    setSelectedPartId(organId === 'body' ? null : firstPart);
  }, []);

  const handleSelectPart = useCallback(
    (partId: string | null) => {
      setSelectedPartId(partId);
      setLastClickedPartId(partId);
      if (partId) {
        setRightOpen(true);
        updateProgress((p) =>
          p.studiedParts.includes(partId)
            ? p
            : { ...p, studiedParts: [...p.studiedParts, partId] },
        );
      }
    },
    [updateProgress],
  );

  const handleWorkspaceMode = useCallback((mode: LabWorkspaceMode) => {
    setWorkspaceMode(mode);
    setIsolatedPartId(null);
    if (mode === 'physiology') {
      const sim = PHYSIOLOGY_SIMS.find((s) => s.id === activePhysiologyId) ?? PHYSIOLOGY_SIMS[0];
      setActiveOrgan(sim.organId);
      setAnimatePhysiology(true);
      setRightOpen(true);
    } else if (mode === 'pathology') {
      const pCase = PATHOLOGY_CASES.find((p) => p.id === activePathologyId) ?? PATHOLOGY_CASES[0];
      setActiveOrgan(pCase.organId);
      setSelectedPartId(pCase.targetPartId);
      setRightOpen(true);
    } else if (mode === 'learning') {
      setRightOpen(true);
    }
  }, [activePathologyId, activePhysiologyId]);

  const handleSelectPhysiology = useCallback((simId: string) => {
    setActivePhysiologyId(simId);
    const sim = PHYSIOLOGY_SIMS.find((s) => s.id === simId);
    if (sim) {
      setActiveOrgan(sim.organId);
      setAnimatePhysiology(true);
      setExplodeAmount(0);
    }
  }, []);

  const handleSelectPathology = useCallback((caseId: string) => {
    setActivePathologyId(caseId);
    const pCase = PATHOLOGY_CASES.find((p) => p.id === caseId);
    if (pCase) {
      setActiveOrgan(pCase.organId);
      setSelectedPartId(pCase.targetPartId);
      setPathologyShowAffected(true);
    }
  }, []);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return Object.values(ANATOMICAL_PARTS)
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.commonName.toLowerCase().includes(q) ||
          p.latinName.toLowerCase().includes(q) ||
          p.system.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [searchQuery]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key.toLowerCase() === 'h') setDockCollapsed((prev) => !prev);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const masteredCount =
    progress.studiedParts.length +
    progress.completedPhysiology.length +
    progress.completedPathology.length;

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#0b101b]">
      {/* Full-Viewport 3D Canvas */}
      <AnatomyViewport
        activeOrgan={activeOrgan}
        selectedPartId={selectedPartId}
        onSelectPart={handleSelectPart}
        visibleSystems={visibleSystems}
        transparentBody={transparentBody}
        isolatedPartId={isolatedPartId}
        explodeAmount={explodeAmount}
        viewMode={viewMode}
        cutaway={cutaway}
        animatePhysiology={animatePhysiology}
        activePhysiologyId={workspaceMode === 'physiology' ? activePhysiologyId : null}
        physiologySpeed={physiologySpeed}
        activePathologyId={workspaceMode === 'pathology' ? activePathologyId : null}
        pathologyShowAffected={pathologyShowAffected}
        autoRotate={autoRotate}
        showLabels={showLabels}
        onZoomChange={setZoomPercent}
        actionsRef={viewportActionsRef}
      />

      {/* Clean Top Navigation Header */}
      <header className="fixed top-3 left-4 right-4 z-30 flex items-center justify-between gap-4 px-4 py-2 rounded-xl bg-[#0f172a]/94 border border-slate-700/70 shadow-xl">
        {/* Zone 1: Brand */}
        <div className="flex items-baseline gap-2.5 shrink-0">
          <h1 className="font-display text-sm sm:text-base font-semibold tracking-tight text-slate-100 whitespace-nowrap">
            Human Anatomy & Physiology Lab
          </h1>
          <span className="hidden xl:inline text-xs text-slate-400 whitespace-nowrap">
            B.Pharm I · {ORGAN_OVERVIEWS[activeOrgan].label}
          </span>
        </div>

        {/* Zone 2: Lab Mode Tabs */}
        <nav className="flex items-center gap-1 p-1 rounded-lg bg-slate-900/90 border border-slate-800 overflow-x-auto">
          {(
            [
              { id: 'explorer', label: 'Explorer' },
              { id: 'physiology', label: 'Physiology' },
              { id: 'pathology', label: 'Pathology' },
              { id: 'learning', label: 'Quiz & Lab' },
            ] as { id: LabWorkspaceMode; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleWorkspaceMode(tab.id)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                workspaceMode === tab.id
                  ? 'bg-sky-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Zone 3: Search + Progress */}
        <div className="hidden md:flex items-center gap-3 shrink-0 relative">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search structures..."
              aria-label="Search anatomical structures"
              className="w-44 lg:w-56 pl-8 pr-7 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 text-slate-400 hover:text-white cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <span className="font-mono-tabular text-xs text-slate-400 whitespace-nowrap">
            Studied: <strong className="text-sky-300">{masteredCount}</strong>
          </span>

          {/* Search Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute top-full right-0 mt-2 w-72 rounded-xl bg-[#0f172a] border border-slate-700 shadow-2xl overflow-hidden z-40">
              {searchResults.map((res) => (
                <button
                  key={res.id}
                  type="button"
                  onClick={() => {
                    setWorkspaceMode('explorer');
                    setActiveOrgan(res.organId);
                    setSelectedPartId(res.id);
                    setRightOpen(true);
                    setSearchQuery('');
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-slate-800/80 border-b border-slate-800/70 last:border-0 cursor-pointer"
                >
                  <div className="text-xs font-medium text-slate-100">{res.name}</div>
                  <div className="text-[11px] text-slate-400">
                    {res.commonName} · {res.system}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Left Sidebar: 10 Systems & Dedicated Organs */}
      <LeftSidebar
        isOpen={leftOpen}
        onToggleOpen={() => setLeftOpen((v) => !v)}
        workspaceMode={workspaceMode}
        activeOrgan={activeOrgan}
        onSelectOrgan={handleSelectOrgan}
        visibleSystems={visibleSystems}
        onToggleSystem={(sysId) =>
          setVisibleSystems((prev) => ({ ...prev, [sysId]: !prev[sysId] }))
        }
        onShowAllSystems={() => setVisibleSystems(DEFAULT_SYSTEMS)}
        activePhysiologyId={activePhysiologyId}
        onSelectPhysiology={handleSelectPhysiology}
        activePathologyId={activePathologyId}
        onSelectPathology={handleSelectPathology}
        learningActivity={learningActivity}
        onSelectLearningActivity={setLearningActivity}
        quizDifficulty={quizDifficulty}
        onSelectDifficulty={setQuizDifficulty}
        completedPhysiology={progress.completedPhysiology}
        completedPathology={progress.completedPathology}
      />

      {/* Right Information & Lab Panel */}
      <InspectorPanel
        workspaceMode={workspaceMode}
        activeOrgan={activeOrgan}
        selectedPartId={selectedPartId}
        onSelectPart={handleSelectPart}
        onFocusOrgan={handleSelectOrgan}
        isolatedPartId={isolatedPartId}
        onToggleIsolate={setIsolatedPartId}
        activePhysiologyId={activePhysiologyId}
        onReplayPhysiology={() => {
          setAnimatePhysiology(false);
          setTimeout(() => setAnimatePhysiology(true), 60);
        }}
        activePathologyId={activePathologyId}
        pathologyShowAffected={pathologyShowAffected}
        onTogglePathologyAffected={setPathologyShowAffected}
        learningActivity={learningActivity}
        quizDifficulty={quizDifficulty}
        progress={progress}
        onToggleBookmark={(partId) =>
          updateProgress((p) => ({
            ...p,
            bookmarks: p.bookmarks.includes(partId)
              ? p.bookmarks.filter((id) => id !== partId)
              : [...p.bookmarks, partId],
          }))
        }
        onMarkPhysiologyComplete={(id) =>
          updateProgress((p) =>
            p.completedPhysiology.includes(id)
              ? p
              : { ...p, completedPhysiology: [...p.completedPhysiology, id] },
          )
        }
        onMarkPathologyComplete={(id) =>
          updateProgress((p) =>
            p.completedPathology.includes(id)
              ? p
              : { ...p, completedPathology: [...p.completedPathology, id] },
          )
        }
        onRecordQuiz={(attempt: QuizAttempt) =>
          updateProgress((p) => ({ ...p, quizHistory: [...p.quizHistory, attempt] }))
        }
        lastClickedPartId={lastClickedPartId}
        isOpen={rightOpen}
        onToggleOpen={() => setRightOpen((v) => !v)}
      />

      {/* Bottom Camera, Explode & Animation Control Dock */}
      <ControlDock
        collapsed={dockCollapsed}
        onToggleCollapse={() => setDockCollapsed((v) => !v)}
        explodeAmount={explodeAmount}
        onExplodeChange={setExplodeAmount}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        cutaway={cutaway}
        onToggleCutaway={() => setCutaway((v) => !v)}
        transparentBody={transparentBody}
        onToggleTransparentBody={() => setTransparentBody((v) => !v)}
        showTransparentToggle={activeOrgan === 'body'}
        animatePhysiology={animatePhysiology}
        onTogglePhysiology={() => setAnimatePhysiology((v) => !v)}
        physiologySpeed={physiologySpeed}
        onCycleSpeed={() =>
          setPhysiologySpeed((s) => (s === 1 ? 1.5 : s === 1.5 ? 2 : s === 2 ? 0.5 : 1))
        }
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

      {/* Keep unused ANATOMICAL_SYSTEMS import referenced cleanly if needed */}
      <span className="sr-only">{ANATOMICAL_SYSTEMS.length} systems loaded</span>
    </main>
  );
}
