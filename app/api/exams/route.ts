import { NextResponse } from "next/server";
import { getExams, saveExam, saveQuestions } from "@/lib/storage";
import { scrapeExam, EXAM_CONFIGS } from "@/lib/scraper";

export async function GET() {
  const exams = await getExams();
  return NextResponse.json(exams);
}

export async function POST() {
  const results: { id: string; questionCount?: number; error?: string }[] = [];

  for (const config of EXAM_CONFIGS) {
    try {
      const { exam, questions } = await scrapeExam(config);
      await saveExam(exam);
      await saveQuestions(exam.id, questions);
      results.push({ id: exam.id, questionCount: questions.length });
      console.log(`[${exam.id}] ${questions.length}問 取得完了`);
    } catch (err) {
      console.error(`[${config.id}] 取得失敗:`, err);
      results.push({ id: config.id, error: String(err) });
    }
  }

  const succeeded = results.filter((r) => r.questionCount && r.questionCount > 0);
  return NextResponse.json({ ok: succeeded.length > 0, results });
}
