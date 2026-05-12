import type { AnswerKey } from "./types";

export interface SavedProgress {
  examId: string;
  currentIndex: number;
  answers: Record<number, AnswerKey | null>;
  revealed: number[];
  flagged: number[];
  savedAt: string;
}

const key = (id: string) => `itp-progress-${id}`;

export function saveProgress(p: SavedProgress): void {
  try {
    localStorage.setItem(key(p.examId), JSON.stringify(p));
  } catch {}
}

export function loadProgress(examId: string): SavedProgress | null {
  try {
    const raw = localStorage.getItem(key(examId));
    return raw ? (JSON.parse(raw) as SavedProgress) : null;
  } catch {
    return null;
  }
}

export function clearProgress(examId: string): void {
  try {
    localStorage.removeItem(key(examId));
  } catch {}
}
