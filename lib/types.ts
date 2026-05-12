export type AnswerKey = "ア" | "イ" | "ウ" | "エ";

export type Category = "ストラテジ系" | "マネジメント系" | "テクノロジ系";

export interface Choice {
  key: AnswerKey;
  text: string;
}

export interface Question {
  id: string;
  examId: string;
  number: number;
  category?: Category;
  question: string;
  imageUrls?: string[];
  choices: Choice[];
  correctAnswer: AnswerKey;
  explanation?: string;
}

export interface Exam {
  id: string;
  year: number;
  fiscalYear: number;
  title: string;
  questionCount: number;
  sourceUrl?: string;
  fetchedAt?: string;
}

export interface QuizResult {
  examId: string;
  totalQuestions: number;
  correctAnswers: number;
  categoryResults: Record<string, { total: number; correct: number }>;
  answers: Record<number, { userAnswer: AnswerKey | null; correctAnswer: AnswerKey }>;
}
