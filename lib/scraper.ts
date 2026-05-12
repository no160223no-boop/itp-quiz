import "server-only";
import * as cheerio from "cheerio";
import type { Question, Exam, AnswerKey } from "./types";
import { withConcurrency } from "./utils";

const SITE_BASE = "https://www.itpassportsiken.com";
const ANSWER_KEYS: AnswerKey[] = ["ア", "イ", "ウ", "エ"];

interface ExamConfig {
  id: string;
  year: number;
  fiscalYear: number;
  title: string;
  path: string;
}

const EXAM_CONFIGS: ExamConfig[] = [
  { id: "r07", year: 2025, fiscalYear: 7, title: "令和7年度 公開問題", path: "07_haru" },
  { id: "r06", year: 2024, fiscalYear: 6, title: "令和6年度 公開問題", path: "06_haru" },
  { id: "r05", year: 2023, fiscalYear: 5, title: "令和5年度 公開問題", path: "05_haru" },
  { id: "r04", year: 2022, fiscalYear: 4, title: "令和4年度 公開問題", path: "04_haru" },
  { id: "r03", year: 2021, fiscalYear: 3, title: "令和3年度 公開問題", path: "03_haru" },
];

function extractFormattedText($: cheerio.CheerioAPI, selector: string): string {
  const $el = $(selector).clone();

  $el.find("img").remove();
  $el.find("br").replaceWith("\n");

  // ol: a. / b. / 1. / 2. など
  $el.find("ol").each((_, ol) => {
    const type = $(ol).attr("type") ?? "1";
    $(ol).find("> li").each((i, li) => {
      const label =
        type === "a" ? String.fromCharCode(97 + i)
        : type === "A" ? String.fromCharCode(65 + i)
        : String(i + 1);
      $(li).prepend(`${label}. `);
      $(li).after("\n");
    });
  });

  // ul: ・
  $el.find("ul > li").each((_, li) => {
    $(li).prepend("・");
    $(li).after("\n");
  });

  return $el.text().replace(/ {2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Accept: "text/html",
      "Accept-Language": "ja-JP,ja;q=0.9",
    },
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.text();
}

function parseQuestionHtml(html: string, examId: string, num: number, basePath: string): Question | null {
  const $ = cheerio.load(html);

  const questionText = extractFormattedText($, "#mondai");
  if (!questionText) return null;

  const choices = [
    { key: "ア" as AnswerKey, text: $("#select_a").text().trim() },
    { key: "イ" as AnswerKey, text: $("#select_i").text().trim() },
    { key: "ウ" as AnswerKey, text: $("#select_u").text().trim() },
    { key: "エ" as AnswerKey, text: $("#select_e").text().trim() },
  ];

  if (choices.some((c) => !c.text)) return null;

  const correctAnswer = $("#answerChar").text().trim() as AnswerKey;
  if (!ANSWER_KEYS.includes(correctAnswer)) return null;

  const explanation = extractFormattedText($, "#kaisetsu");

  const imageUrls: string[] = [];
  $("#mondai img").each((_, el) => {
    const src = $(el).attr("src");
    if (src) {
      const abs = src.startsWith("http") ? src : `${SITE_BASE}/kakomon/${basePath}/${src}`;
      imageUrls.push(abs);
    }
  });

  return {
    id: `${examId}-q${num}`,
    examId,
    number: num,
    question: questionText,
    ...(imageUrls.length > 0 ? { imageUrls } : {}),
    choices,
    correctAnswer,
    ...(explanation ? { explanation } : {}),
  };
}


export async function scrapeExam(config: ExamConfig): Promise<{ exam: Exam; questions: Question[] }> {
  const tasks = Array.from({ length: 100 }, (_, i) => {
    const num = i + 1;
    return () =>
      fetchHtml(`${SITE_BASE}/kakomon/${config.path}/q${num}.html`).then((html) =>
        parseQuestionHtml(html, config.id, num, config.path)
      );
  });

  const rawResults = await withConcurrency(tasks, 5, 400);
  const questions = rawResults.filter((q): q is Question => q !== null);

  const exam: Exam = {
    id: config.id,
    year: config.year,
    fiscalYear: config.fiscalYear,
    title: config.title,
    questionCount: questions.length,
    sourceUrl: `${SITE_BASE}/kakomon/${config.path}/`,
    fetchedAt: new Date().toISOString(),
  };

  return { exam, questions };
}

export { EXAM_CONFIGS };
