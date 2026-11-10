import React, { useMemo, useState } from 'react';
import {
  Bookmark,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Focus,
  RotateCcw,
  X,
} from 'lucide-react';
import {
  ANATOMICAL_PARTS,
  IDENTIFICATION_TASKS,
  LabWorkspaceMode,
  MCQ_BANK,
  ORGAN_OVERVIEWS,
  OrganSystemId,
  PATHOLOGY_CASES,
  PHYSIOLOGY_SIMS,
  QuizDifficulty,
} from '../data/anatomyData';
import { LabProgressState, QuizAttempt } from '../utils/progressStore';
import { LearningActivityType } from './LeftSidebar';

interface InspectorPanelProps {
  workspaceMode: LabWorkspaceMode;
  activeOrgan: OrganSystemId;
  selectedPartId: string | null;
  onSelectPart: (partId: string | null) => void;
  onFocusOrgan: (organId: OrganSystemId) => void;
  isolatedPartId: string | null;
  onToggleIsolate: (partId: string | null) => void;
  activePhysiologyId: string;
  onReplayPhysiology: () => void;
  activePathologyId: string;
  pathologyShowAffected: boolean;
  onTogglePathologyAffected: (affected: boolean) => void;
  learningActivity: LearningActivityType;
  quizDifficulty: QuizDifficulty;
  progress: LabProgressState;
  onToggleBookmark: (partId: string) => void;
  onMarkPhysiologyComplete: (id: string) => void;
  onMarkPathologyComplete: (id: string) => void;
  onRecordQuiz: (attempt: QuizAttempt) => void;
  lastClickedPartId: string | null;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  workspaceMode,
  activeOrgan,
  selectedPartId,
  onSelectPart,
  onFocusOrgan,
  isolatedPartId,
  onToggleIsolate,
  activePhysiologyId,
  onReplayPhysiology,
  activePathologyId,
  pathologyShowAffected,
  onTogglePathologyAffected,
  learningActivity,
  quizDifficulty,
  progress,
  onToggleBookmark,
  onMarkPhysiologyComplete,
  onMarkPathologyComplete,
  onRecordQuiz,
  lastClickedPartId,
  isOpen,
  onToggleOpen,
}) => {
  // Quiz & Learning local state
  const [mcqIndex, setMcqIndex] = useState(0);
  const [mcqChoice, setMcqChoice] = useState<number | null>(null);
  const [mcqScore, setMcqScore] = useState(0);
  const [mcqFinished, setMcqFinished] = useState(false);

  const [idIndex, setIdIndex] = useState(0);
  const [idShowHint, setIdShowHint] = useState(false);
  const [idFeedback, setIdFeedback] = useState<'correct' | 'wrong' | null>(null);

  const [guidedIndex, setGuidedIndex] = useState(0);

  const filteredMcqs = useMemo(() => {
    const list = MCQ_BANK.filter((q) => q.difficulty === quizDifficulty);
    return list.length > 0 ? list : MCQ_BANK;
  }, [quizDifficulty]);

  const filteredIdTasks = useMemo(() => {
    const list = IDENTIFICATION_TASKS.filter((t) => t.difficulty === quizDifficulty);
    return list.length > 0 ? list : IDENTIFICATION_TASKS;
  }, [quizDifficulty]);

  const guidedList = useMemo(() => Object.values(ANATOMICAL_PARTS).slice(0, 12), []);

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={onToggleOpen}
        className="fixed top-20 right-4 z-20 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#0f172a]/94 border border-slate-700/70 text-xs font-medium text-slate-200 hover:text-white hover:border-slate-500 transition-colors shadow-lg whitespace-nowrap cursor-pointer"
      >
        <BookOpen className="w-3.5 h-3.5 text-sky-400" />
        <span>Inspector & Notes</span>
      </button>
    );
  }

  const overview = ORGAN_OVERVIEWS[activeOrgan];
  const part = selectedPartId ? ANATOMICAL_PARTS[selectedPartId] : null;
  const isBookmarked = part ? progress.bookmarks.includes(part.id) : false;

  const activeSim =
    PHYSIOLOGY_SIMS.find((s) => s.id === activePhysiologyId) ?? PHYSIOLOGY_SIMS[0];
  const activePathology =
    PATHOLOGY_CASES.find((p) => p.id === activePathologyId) ?? PATHOLOGY_CASES[0];

  const currentMcq = filteredMcqs[mcqIndex % filteredMcqs.length];
  const currentIdTask = filteredIdTasks[idIndex % filteredIdTasks.length];

  const handleCheckIdAnswer = () => {
    if (!lastClickedPartId) return;
    if (lastClickedPartId === currentIdTask.targetPartId) {
      setIdFeedback('correct');
    } else {
      setIdFeedback('wrong');
    }
  };

  return (
    <aside
      className="fixed top-20 right-4 z-20 w-[min(365px,92vw)] max-h-[calc(100vh-200px)] flex flex-col rounded-xl bg-[#0f172a]/94 border border-slate-700/70 shadow-2xl overflow-hidden"
      aria-label="Anatomical Information Panel"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 px-4 py-3 border-b border-slate-800">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] text-sky-400 font-medium">
            {workspaceMode === 'explorer' && (
              <>
                <span>{part ? part.system : overview.system}</span>
                <span aria-hidden="true">·</span>
                <span className="italic text-slate-400 truncate">
                  {part ? part.latinName : overview.latinName}
                </span>
              </>
            )}
            {workspaceMode === 'physiology' && <span>Physiology Simulation</span>}
            {workspaceMode === 'pathology' && <span>Pathology Comparison</span>}
            {workspaceMode === 'learning' && <span>B.Pharm Interactive Lab</span>}
          </div>
          <h2 className="font-display text-sm sm:text-base font-semibold text-slate-100 mt-0.5 leading-snug">
            {workspaceMode === 'explorer' && (part ? part.name : overview.label)}
            {workspaceMode === 'physiology' && activeSim.title}
            {workspaceMode === 'pathology' && activePathology.title}
            {workspaceMode === 'learning' &&
              (learningActivity === 'guided'
                ? 'Guided Curriculum Tour'
                : learningActivity === 'identification'
                  ? '3D Structure Identification'
                  : learningActivity === 'practical'
                    ? 'Practical Examination'
                    : 'MCQ Knowledge Check')}
          </h2>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {workspaceMode === 'explorer' && part && (
            <button
              type="button"
              onClick={() => onToggleBookmark(part.id)}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isBookmarked
                  ? 'text-amber-400 bg-amber-500/15'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title={isBookmarked ? 'Remove bookmark' : 'Bookmark structure'}
            >
              <Bookmark className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onToggleOpen}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
            aria-label="Close panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="anatomy-scroll overflow-y-auto px-4 py-3.5 space-y-3.5 text-[13px]">
        {/* 1. EXPLORER MODE */}
        {workspaceMode === 'explorer' && (
          <>
            {part ? (
              <>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span>
                    Common: <strong className="text-slate-200 font-medium">{part.commonName}</strong>
                  </span>
                </div>

                {/* Action buttons: Isolate & Focus Organ */}
                <div className="flex items-center gap-2">
                  {activeOrgan !== 'body' && (
                    <button
                      type="button"
                      onClick={() =>
                        onToggleIsolate(isolatedPartId === part.id ? null : part.id)
                      }
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                        isolatedPartId === part.id
                          ? 'bg-sky-500 text-slate-950 border-sky-400'
                          : 'bg-slate-900/80 border-slate-700 text-slate-300 hover:text-white'
                      }`}
                    >
                      <Focus className="w-3.5 h-3.5" />
                      <span>
                        {isolatedPartId === part.id ? 'Show All Parts' : 'Isolate Structure'}
                      </span>
                    </button>
                  )}
                  {activeOrgan === 'body' && (
                    <button
                      type="button"
                      onClick={() => onFocusOrgan(part.organId)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-sky-500/15 border border-sky-400/40 text-xs font-medium text-sky-300 hover:bg-sky-500/25 cursor-pointer"
                    >
                      <Focus className="w-3.5 h-3.5" />
                      <span>Open {ORGAN_OVERVIEWS[part.organId].label}</span>
                    </button>
                  )}
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-2 py-2.5 border-y border-slate-800/90">
                  {part.metrics.map((m) => (
                    <div key={m.label} className="min-w-0">
                      <div className="text-[11px] text-slate-400 truncate">{m.label}</div>
                      <div className="font-mono-tabular text-xs font-semibold text-slate-100 mt-0.5 truncate">
                        {m.value}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-1">
                  <h3 className="text-xs font-semibold text-slate-200">Location</h3>
                  <p className="text-slate-400 leading-relaxed">{part.location}</p>
                </div>

                <div className="space-y-1">
                  <h3 className="text-xs font-semibold text-slate-200">
                    Structure & Composition
                  </h3>
                  <p className="text-slate-400 leading-relaxed">{part.structureComposition}</p>
                </div>

                <div className="space-y-1">
                  <h3 className="text-xs font-semibold text-slate-200">Functions</h3>
                  <p className="text-slate-400 leading-relaxed">{part.functions}</p>
                </div>

                <div className="space-y-1">
                  <h3 className="text-xs font-semibold text-slate-200">
                    Physiological Significance
                  </h3>
                  <p className="text-slate-400 leading-relaxed">{part.physiologicalSignificance}</p>
                </div>

                <div className="space-y-1">
                  <h3 className="text-xs font-semibold text-slate-200">Clinical Relevance</h3>
                  <p className="text-slate-400 leading-relaxed">{part.clinicalRelevance}</p>
                </div>

                <div className="p-2.5 rounded-lg bg-sky-500/10 border border-sky-400/25 space-y-1">
                  <h3 className="text-xs font-semibold text-sky-300">
                    B.Pharm Learning Notes
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">{part.bpharmNotes}</p>
                </div>

                {part.relatedStructures.length > 0 && (
                  <div className="space-y-1.5">
                    <h3 className="text-xs font-semibold text-slate-200">
                      Related Structures
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {part.relatedStructures.map((relId) => {
                        const rel = ANATOMICAL_PARTS[relId];
                        if (!rel) return null;
                        return (
                          <button
                            key={relId}
                            type="button"
                            onClick={() => {
                              if (rel.organId !== activeOrgan && activeOrgan !== 'body') {
                                onFocusOrgan(rel.organId);
                              }
                              onSelectPart(relId);
                            }}
                            className="px-2 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700 text-[11px] text-sky-300 cursor-pointer"
                          >
                            {rel.commonName}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-slate-300 leading-relaxed">{overview.description}</p>
            )}

            {/* Quick Structure List */}
            <div className="pt-2 border-t border-slate-800/90 space-y-1.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-200">
                  Selectable Structures
                </h3>
                {part && (
                  <button
                    type="button"
                    onClick={() => {
                      onToggleIsolate(null);
                      onSelectPart(null);
                    }}
                    className="text-[11px] text-sky-400 hover:text-sky-300 cursor-pointer"
                  >
                    Clear
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
                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-sky-500/15 text-sky-200 border border-sky-400/40'
                          : 'text-slate-300 hover:bg-slate-800/70 border border-transparent'
                      }`}
                    >
                      <span className="truncate font-medium">{pInfo.name}</span>
                      <ChevronRight className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* 2. PHYSIOLOGY MODE */}
        {workspaceMode === 'physiology' && (
          <div className="space-y-3.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Target: {ORGAN_OVERVIEWS[activeSim.organId].label}</span>
              <span className="font-mono-tabular text-sky-300">{activeSim.durationLabel}</span>
            </div>

            <p className="text-slate-300 leading-relaxed">{activeSim.summary}</p>

            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-200">Biological Process</h3>
              <ul className="space-y-1.5 text-xs text-slate-300 leading-relaxed">
                {activeSim.steps.map((s, i) => (
                  <li key={i} className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                    {s}
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-2.5 rounded-lg bg-sky-500/10 border border-sky-400/25 space-y-1">
              <h3 className="text-xs font-semibold text-sky-300">B.Pharm Correlation</h3>
              <p className="text-xs text-slate-300 leading-relaxed">{activeSim.bpharmNote}</p>
            </div>

            <p className="text-[11px] text-slate-500 italic">{activeSim.disclaimer}</p>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={onReplayPhysiology}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Replay</span>
              </button>
              <button
                type="button"
                onClick={() => onMarkPhysiologyComplete(activeSim.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-emerald-500/15 border border-emerald-400/40 text-xs font-medium text-emerald-300 hover:bg-emerald-500/25 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  {progress.completedPhysiology.includes(activeSim.id)
                    ? 'Experiment Completed'
                    : 'Mark Completed'}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* 3. PATHOLOGY MODE */}
        {workspaceMode === 'pathology' && (
          <div className="space-y-3.5">
            {/* Normal vs Affected Toggle */}
            <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-slate-900 border border-slate-800">
              <button
                type="button"
                onClick={() => onTogglePathologyAffected(false)}
                className={`py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  !pathologyShowAffected
                    ? 'bg-emerald-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Normal Anatomy
              </button>
              <button
                type="button"
                onClick={() => onTogglePathologyAffected(true)}
                className={`py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  pathologyShowAffected
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Affected View
              </button>
            </div>

            <div className="space-y-1">
              <h3 className="text-xs font-semibold text-emerald-300">Normal Baseline</h3>
              <p className="text-slate-300 leading-relaxed">{activePathology.normalSummary}</p>
            </div>

            <div className="space-y-1">
              <h3 className="text-xs font-semibold text-amber-300">
                Pathological Changes
              </h3>
              <p className="text-slate-300 leading-relaxed">{activePathology.affectedChanges}</p>
            </div>

            <div className="space-y-1">
              <h3 className="text-xs font-semibold text-slate-200">
                Physiological Consequences
              </h3>
              <p className="text-slate-400 leading-relaxed">
                {activePathology.physiologicalConsequences}
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-sky-500/10 border border-sky-400/25 space-y-1">
              <h3 className="text-xs font-semibold text-sky-300">
                B.Pharm Pharmacotherapy Relevance
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {activePathology.bpharmRelevance}
              </p>
            </div>

            <p className="text-[11px] text-slate-500 italic">{activePathology.disclaimer}</p>

            <button
              type="button"
              onClick={() => onMarkPathologyComplete(activePathology.id)}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-emerald-500/15 border border-emerald-400/40 text-xs font-medium text-emerald-300 hover:bg-emerald-500/25 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                {progress.completedPathology.includes(activePathology.id)
                  ? 'Case Reviewed'
                  : 'Mark Case Reviewed'}
              </span>
            </button>
          </div>
        )}

        {/* 4. LEARNING & QUIZ MODE */}
        {workspaceMode === 'learning' && (
          <div className="space-y-3.5">
            {learningActivity === 'guided' && (() => {
              const gPart = guidedList[guidedIndex % guidedList.length];
              return (
                <div className="space-y-3">
                  <div className="font-mono-tabular text-xs text-slate-400">
                    Step {(guidedIndex % guidedList.length) + 1} of {guidedList.length}
                  </div>
                  <h3 className="text-sm font-semibold text-sky-300">{gPart.name}</h3>
                  <p className="text-slate-300 leading-relaxed">{gPart.functions}</p>
                  <div className="p-2.5 rounded-lg bg-sky-500/10 border border-sky-400/25 text-xs text-slate-200">
                    {gPart.bpharmNotes}
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const next = (guidedIndex - 1 + guidedList.length) % guidedList.length;
                        setGuidedIndex(next);
                        onFocusOrgan(guidedList[next].organId);
                        onSelectPart(guidedList[next].id);
                      }}
                      className="flex-1 py-2 rounded-lg bg-slate-800 text-xs font-medium text-slate-200 hover:bg-slate-700 cursor-pointer"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const next = (guidedIndex + 1) % guidedList.length;
                        setGuidedIndex(next);
                        onFocusOrgan(guidedList[next].organId);
                        onSelectPart(guidedList[next].id);
                      }}
                      className="flex-1 py-2 rounded-lg bg-sky-500 text-xs font-medium text-slate-950 hover:bg-sky-400 cursor-pointer"
                    >
                      Next Structure
                    </button>
                  </div>
                </div>
              );
            })()}

            {learningActivity === 'identification' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-mono-tabular">
                    Task {(idIndex % filteredIdTasks.length) + 1}/{filteredIdTasks.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => onFocusOrgan(currentIdTask.organId)}
                    className="text-sky-400 hover:text-sky-300 cursor-pointer"
                  >
                    Focus {ORGAN_OVERVIEWS[currentIdTask.organId].label}
                  </button>
                </div>

                <p className="text-slate-200 font-medium leading-relaxed">
                  {currentIdTask.prompt}
                </p>

                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-400">
                  Selected on 3D Model:{' '}
                  <span className="text-slate-200 font-medium">
                    {lastClickedPartId && ANATOMICAL_PARTS[lastClickedPartId]
                      ? ANATOMICAL_PARTS[lastClickedPartId].name
                      : 'Click a structure in 3D'}
                  </span>
                </div>

                {idShowHint && (
                  <p className="text-xs text-amber-300/90">{currentIdTask.hint}</p>
                )}

                {idFeedback === 'correct' && (
                  <div className="p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-400/40 text-xs text-emerald-300">
                    Correct! You identified {ANATOMICAL_PARTS[currentIdTask.targetPartId]?.name}.
                  </div>
                )}
                {idFeedback === 'wrong' && (
                  <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-400/40 text-xs text-rose-300">
                    Not quite. Rotate or explode the model and try clicking again.
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIdShowHint((h) => !h)}
                    className="px-3 py-2 rounded-lg bg-slate-800 text-xs text-slate-300 hover:text-white cursor-pointer"
                  >
                    Hint
                  </button>
                  <button
                    type="button"
                    onClick={handleCheckIdAnswer}
                    disabled={!lastClickedPartId}
                    className="flex-1 py-2 rounded-lg bg-emerald-500 disabled:opacity-40 text-xs font-medium text-slate-950 cursor-pointer"
                  >
                    Check Answer
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next = (idIndex + 1) % filteredIdTasks.length;
                      setIdIndex(next);
                      setIdFeedback(null);
                      setIdShowHint(false);
                      onFocusOrgan(filteredIdTasks[next].organId);
                    }}
                    className="px-3 py-2 rounded-lg bg-sky-500/20 border border-sky-400/40 text-xs text-sky-300 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {(learningActivity === 'mcq' || learningActivity === 'practical') && (
              <div className="space-y-3">
                {mcqFinished ? (
                  <div className="space-y-3 text-center py-4">
                    <div className="font-mono-tabular text-2xl font-bold text-emerald-400">
                      {mcqScore} / {filteredMcqs.length}
                    </div>
                    <p className="text-xs text-slate-300">
                      {learningActivity === 'practical'
                        ? 'B.Pharm Practical Assessment recorded.'
                        : 'Quiz attempt saved to your progress.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setMcqIndex(0);
                        setMcqChoice(null);
                        setMcqScore(0);
                        setMcqFinished(false);
                      }}
                      className="px-4 py-2 rounded-lg bg-sky-500 text-xs font-medium text-slate-950 cursor-pointer"
                    >
                      Retake
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between font-mono-tabular text-xs text-slate-400">
                      <span>
                        Q {mcqIndex + 1}/{filteredMcqs.length}
                      </span>
                      <span>Score: {mcqScore}</span>
                    </div>
                    <p className="text-slate-100 font-medium leading-relaxed">
                      {currentMcq.question}
                    </p>
                    <div className="space-y-1.5">
                      {currentMcq.options.map((opt, idx) => {
                        const answered = mcqChoice !== null;
                        const isCorrect = idx === currentMcq.correctIndex;
                        const isPicked = idx === mcqChoice;
                        return (
                          <button
                            key={idx}
                            type="button"
                            disabled={answered}
                            onClick={() => {
                              setMcqChoice(idx);
                              if (idx === currentMcq.correctIndex) {
                                setMcqScore((s) => s + 1);
                              }
                            }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs border transition-colors cursor-pointer ${
                              answered
                                ? isCorrect
                                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                                  : isPicked
                                    ? 'bg-rose-500/20 border-rose-400 text-rose-200'
                                    : 'bg-slate-900/50 border-slate-800 text-slate-500'
                                : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-600'
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>

                    {mcqChoice !== null && (
                      <div className="space-y-2.5">
                        <p className="text-xs text-slate-300 bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                          {currentMcq.explanation}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            if (mcqIndex + 1 >= filteredMcqs.length) {
                              onRecordQuiz({
                                date: new Date().toISOString(),
                                mode: learningActivity,
                                difficulty: quizDifficulty,
                                score: mcqScore,
                                total: filteredMcqs.length,
                              });
                              setMcqFinished(true);
                            } else {
                              setMcqIndex((i) => i + 1);
                              setMcqChoice(null);
                            }
                          }}
                          className="w-full py-2 rounded-lg bg-sky-500 text-xs font-medium text-slate-950 hover:bg-sky-400 cursor-pointer"
                        >
                          {mcqIndex + 1 >= filteredMcqs.length ? 'Finish & Save' : 'Next Question'}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
