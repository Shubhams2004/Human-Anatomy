export interface QuizAttempt {
  date: string;
  mode: 'mcq' | 'identification' | 'labeling' | 'practical';
  difficulty: 'foundation' | 'intermediate' | 'practical';
  score: number;
  total: number;
}

export interface LabProgressState {
  bookmarks: string[];
  studiedParts: string[];
  completedPhysiology: string[];
  completedPathology: string[];
  quizHistory: QuizAttempt[];
}

const STORAGE_KEY = 'orbit_anatomy_lab_progress_v1';

const DEFAULT_STATE: LabProgressState = {
  bookmarks: [],
  studiedParts: [],
  completedPhysiology: [],
  completedPathology: [],
  quizHistory: [],
};

export function loadProgress(): LabProgressState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<LabProgressState>;
    return {
      bookmarks: Array.isArray(parsed.bookmarks) ? parsed.bookmarks : [],
      studiedParts: Array.isArray(parsed.studiedParts) ? parsed.studiedParts : [],
      completedPhysiology: Array.isArray(parsed.completedPhysiology)
        ? parsed.completedPhysiology
        : [],
      completedPathology: Array.isArray(parsed.completedPathology)
        ? parsed.completedPathology
        : [],
      quizHistory: Array.isArray(parsed.quizHistory) ? parsed.quizHistory : [],
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveProgress(state: LabProgressState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors in private browsing
  }
}
