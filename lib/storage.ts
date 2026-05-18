import "server-only";
import { promises as fs } from "fs";
import path from "path";
import type { Exam, Question } from "./types";
import type { QuestionAnnotations } from "./annotator";

// Vercel では /var/task が読み取り専用のため書き込みは /tmp へ
const IS_VERCEL = !!process.env.VERCEL;
const BUNDLED_DATA_DIR = path.join(process.cwd(), "data");
const WRITE_DATA_DIR = IS_VERCEL ? "/tmp/data" : BUNDLED_DATA_DIR;

const EXAMS_FILE = path.join(WRITE_DATA_DIR, "exams.json");
const QUESTIONS_DIR = path.join(WRITE_DATA_DIR, "questions");
const ANNOTATIONS_DIR = path.join(WRITE_DATA_DIR, "annotations");

const BUNDLED_EXAMS_FILE = path.join(BUNDLED_DATA_DIR, "exams.json");
const BUNDLED_QUESTIONS_DIR = path.join(BUNDLED_DATA_DIR, "questions");
const BUNDLED_ANNOTATIONS_DIR = path.join(BUNDLED_DATA_DIR, "annotations");

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function readFileFallback(primary: string, fallback: string): Promise<string> {
  try {
    return await fs.readFile(primary, "utf-8");
  } catch {
    return await fs.readFile(fallback, "utf-8");
  }
}

export async function getExams(): Promise<Exam[]> {
  try {
    const content = await readFileFallback(EXAMS_FILE, BUNDLED_EXAMS_FILE);
    return JSON.parse(content);
  } catch {
    return [];
  }
}

export async function saveExam(exam: Exam): Promise<void> {
  await ensureDir(WRITE_DATA_DIR);
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
    const primary = path.join(QUESTIONS_DIR, `${examId}.json`);
    const fallback = path.join(BUNDLED_QUESTIONS_DIR, `${examId}.json`);
    const content = await readFileFallback(primary, fallback);
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
    const primary = path.join(ANNOTATIONS_DIR, `${examId}.json`);
    const fallback = path.join(BUNDLED_ANNOTATIONS_DIR, `${examId}.json`);
    const content = await readFileFallback(primary, fallback);
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
