import React from 'react';
import {
  Activity,
  AlertTriangle,
  ChevronLeft,
  Eye,
  EyeOff,
  GraduationCap,
  Layers,
  PanelLeftOpen,
} from 'lucide-react';
import {
  ANATOMICAL_SYSTEMS,
  AnatomicalSystemId,
  LabWorkspaceMode,
  ORGAN_OVERVIEWS,
  OrganSystemId,
  PATHOLOGY_CASES,
  PHYSIOLOGY_SIMS,
  QuizDifficulty,
} from '../data/anatomyData';

export type LearningActivityType = 'guided' | 'identification' | 'mcq' | 'practical';

interface LeftSidebarProps {
  isOpen: boolean;
  onToggleOpen: () => void;
  workspaceMode: LabWorkspaceMode;
  activeOrgan: OrganSystemId;
  onSelectOrgan: (id: OrganSystemId) => void;
  visibleSystems: Record<AnatomicalSystemId, boolean>;
  onToggleSystem: (sysId: AnatomicalSystemId) => void;
  onShowAllSystems: () => void;
  activePhysiologyId: string;
  onSelectPhysiology: (id: string) => void;
  activePathologyId: string;
  onSelectPathology: (id: string) => void;
  learningActivity: LearningActivityType;
  onSelectLearningActivity: (act: LearningActivityType) => void;
  quizDifficulty: QuizDifficulty;
  onSelectDifficulty: (diff: QuizDifficulty) => void;
  completedPhysiology: string[];
  completedPathology: string[];
}

const ORGAN_ORDER: OrganSystemId[] = [
  'body',
  'heart',
  'brain',
  'lungs',
  'liver',
  'kidneys',
  'stomach',
  'intestines',
  'eye',
  'ear',
  'skin',
];

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  isOpen,
  onToggleOpen,
  workspaceMode,
  activeOrgan,
  onSelectOrgan,
  visibleSystems,
  onToggleSystem,
  onShowAllSystems,
  activePhysiologyId,
  onSelectPhysiology,
  activePathologyId,
  onSelectPathology,
  learningActivity,
  onSelectLearningActivity,
  quizDifficulty,
  onSelectDifficulty,
  completedPhysiology,
  completedPathology,
}) => {
  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={onToggleOpen}
        className="fixed top-20 left-4 z-20 flex items-center gap-2 px-3 py-2 rounded-xl bg-[#0f172a]/94 border border-slate-700/70 text-xs font-medium text-slate-200 hover:text-white hover:border-slate-500 transition-colors shadow-lg cursor-pointer"
        aria-label="Open anatomical systems sidebar"
      >
        <PanelLeftOpen className="w-3.5 h-3.5 text-sky-400" />
        <span>Systems & Organs</span>
      </button>
    );
  }

  return (
    <aside
      className="fixed top-20 left-4 z-20 w-[min(265px,82vw)] max-h-[calc(100vh-200px)] flex flex-col rounded-xl bg-[#0f172a]/94 border border-slate-700/70 shadow-2xl overflow-hidden"
      aria-label="Laboratory Navigation Sidebar"
    >
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-800">
        <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
          {workspaceMode === 'explorer' && <Layers className="w-3.5 h-3.5 text-sky-400" />}
          {workspaceMode === 'physiology' && <Activity className="w-3.5 h-3.5 text-rose-400" />}
          {workspaceMode === 'pathology' && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
          {workspaceMode === 'learning' && <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />}
          <span>
            {workspaceMode === 'explorer' && 'Anatomy & Systems'}
            {workspaceMode === 'physiology' && 'Physiology Sims'}
            {workspaceMode === 'pathology' && 'Pathology Cases'}
            {workspaceMode === 'learning' && 'Learning & Exam'}
          </span>
        </span>
        <button
          type="button"
          onClick={onToggleOpen}
          className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800/80 cursor-pointer"
          aria-label="Collapse left sidebar"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      <div className="anatomy-scroll overflow-y-auto p-2.5 space-y-4">
        {workspaceMode === 'explorer' && (
          <>
            {/* Dedicated Organ Views */}
            <div className="space-y-1">
              <div className="px-1.5 text-[11px] font-medium text-slate-400">
                Models & Organs
              </div>
              <div className="grid grid-cols-1 gap-0.5">
                {ORGAN_ORDER.map((id) => {
                  const active = activeOrgan === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => onSelectOrgan(id)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer ${
                        active
                          ? 'bg-sky-500 text-slate-950'
                          : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                      }`}
                    >
                      <span className="truncate">{ORGAN_OVERVIEWS[id].label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 10 Anatomical Systems (Active in Full Body view) */}
            <div className="pt-2 border-t border-slate-800/90 space-y-1.5">
              <div className="flex items-center justify-between px-1.5">
                <span className="text-[11px] font-medium text-slate-400">
                  10 Body Systems
                </span>
                {activeOrgan === 'body' && (
                  <button
                    type="button"
                    onClick={onShowAllSystems}
                    className="text-[11px] text-sky-400 hover:text-sky-300 cursor-pointer"
                  >
                    Show All
                  </button>
                )}
              </div>
              {activeOrgan !== 'body' && (
                <p className="px-1.5 text-[11px] text-slate-500">
                  Switch to Full Human Body to toggle individual system layers.
                </p>
              )}
              <div className="space-y-0.5">
                {ANATOMICAL_SYSTEMS.map((sys) => {
                  const isVis = visibleSystems[sys.id];
                  return (
                    <button
                      key={sys.id}
                      type="button"
                      disabled={activeOrgan !== 'body'}
                      onClick={() => onToggleSystem(sys.id)}
                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                        activeOrgan !== 'body'
                          ? 'opacity-45 cursor-not-allowed text-slate-400'
                          : isVis
                            ? 'text-slate-200 hover:bg-slate-800/70 cursor-pointer'
                            : 'text-slate-500 hover:bg-slate-800/40 cursor-pointer'
                      }`}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: sys.color }}
                        />
                        <span className="truncate">{sys.label}</span>
                      </span>
                      {isVis ? (
                        <Eye className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {workspaceMode === 'physiology' && (
          <div className="space-y-1">
            {PHYSIOLOGY_SIMS.map((sim) => {
              const active = activePhysiologyId === sim.id;
              const done = completedPhysiology.includes(sim.id);
              return (
                <button
                  key={sim.id}
                  type="button"
                  onClick={() => onSelectPhysiology(sim.id)}
                  className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer ${
                    active
                      ? 'bg-sky-500 text-slate-950'
                      : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                  }`}
                >
                  <span className="truncate">{sim.title}</span>
                  {done && !active && (
                    <span className="text-[10px] text-emerald-400 shrink-0">Done</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {workspaceMode === 'pathology' && (
          <div className="space-y-1">
            {PATHOLOGY_CASES.map((p) => {
              const active = activePathologyId === p.id;
              const done = completedPathology.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onSelectPathology(p.id)}
                  className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer ${
                    active
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                  }`}
                >
                  <span className="truncate">{p.title}</span>
                  {done && !active && (
                    <span className="text-[10px] text-emerald-400 shrink-0">Done</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {workspaceMode === 'learning' && (
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="px-1.5 text-[11px] font-medium text-slate-400">
                Lab Activity
              </div>
              {(
                [
                  { id: 'guided', label: 'Guided Exploration' },
                  { id: 'identification', label: '3D Structure ID' },
                  { id: 'mcq', label: 'MCQ Quiz' },
                  { id: 'practical', label: 'Practical Exam Mode' },
                ] as { id: LearningActivityType; label: string }[]
              ).map((act) => (
                <button
                  key={act.id}
                  type="button"
                  onClick={() => onSelectLearningActivity(act.id)}
                  className={`w-full px-2.5 py-2 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer ${
                    learningActivity === act.id
                      ? 'bg-emerald-500 text-slate-950'
                      : 'text-slate-300 hover:bg-slate-800/70'
                  }`}
                >
                  {act.label}
                </button>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-800/90 space-y-1">
              <div className="px-1.5 text-[11px] font-medium text-slate-400">
                Difficulty Level
              </div>
              {(
                [
                  { id: 'foundation', label: 'Foundation' },
                  { id: 'intermediate', label: 'Intermediate' },
                  { id: 'practical', label: 'B.Pharm Practical' },
                ] as { id: QuizDifficulty; label: string }[]
              ).map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => onSelectDifficulty(d.id)}
                  className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer ${
                    quizDifficulty === d.id
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40'
                      : 'text-slate-400 hover:bg-slate-800/60'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
