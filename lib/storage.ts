import "server-only";
import { promises as fs } from "fs";
import path from "path";
import type { Exam, Question } from "./types";
import type { QuestionAnnotations } from "./annotator";

const DATA_DIR = path.join(process.cwd(), "data");
const EXAMS_FILE = path.join(DATA_DIR, "exams.json");
const QUESTIONS_DIR = path.join(DATA_DIR, "questions");
const ANNOTATIONS_DIR = path.join(DATA_DIR, "annotations");

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

export async function getExams(): Promise<Exam[]> {
  try {
    const content = await fs.readFile(EXAMS_FILE, "utf-8");
    return JSON.parse(content);
  } catch {
    return [];
  }
}

export async function saveExam(exam: Exam): Promise<void> {
  await ensureDir(DATA_DIR);
  const exams = await getExams();
  const idx = exams.findIndex((e) => e.id === exam.id);
  if (idx >= 0) {
    exams[idx] = exam;
  } else {
    exams.unshift(exam);
  }
  exams.sort((a, b) => b.year - a.year);
  await fs.writeFile(EXAMS_FILE, JSON.stringify(exams, null, 2), "utf-8");
}

export async function getQuestions(examId: string): Promise<Question[]> {
  try {
    const file = path.join(QUESTIONS_DIR, `${examId}.json`);
    const content = await fs.readFile(file, "utf-8");
    return JSON.parse(content);
  } catch {
    return [];
  }
}

export async function saveQuestions(examId: string, questions: Question[]): Promise<void> {
  await ensureDir(QUESTIONS_DIR);
  const file = path.join(QUESTIONS_DIR, `${examId}.json`);
  await fs.writeFile(file, JSON.stringify(questions, null, 2), "utf-8");
}

export async function getAnnotations(examId: string): Promise<QuestionAnnotations[] | null> {
  try {
    const file = path.join(ANNOTATIONS_DIR, `${examId}.json`);
    const content = await fs.readFile(file, "utf-8");
    return JSON.parse(content) as QuestionAnnotations[];
  } catch {
    return null;
  }
}

export async function saveAnnotations(
  examId: string,
  data: QuestionAnnotations[]
): Promise<void> {
  await ensureDir(ANNOTATIONS_DIR);
  const file = path.join(ANNOTATIONS_DIR, `${examId}.json`);
  await fs.writeFile(file, JSON.stringify(data, null, 2), "utf-8");
}
