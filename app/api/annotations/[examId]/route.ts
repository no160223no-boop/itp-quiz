import { NextResponse } from "next/server";
import { getQuestions, getAnnotations, saveAnnotations } from "@/lib/storage";
import { generateExamAnnotations } from "@/lib/annotator";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ examId: string }> }
) {
  const { examId } = await params;
  const cached = await getAnnotations(examId);
  if (cached) return NextResponse.json({ cached: true, annotations: cached });
  return NextResponse.json({ cached: false, annotations: null });
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ examId: string }> }
) {
  const { examId } = await params;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY が設定されていません" },
      { status: 500 }
    );
  }

  const questions = await getQuestions(examId);
  if (questions.length === 0) {
    return NextResponse.json({ error: "問題データが見つかりません" }, { status: 404 });
  }

  const annotations = await generateExamAnnotations(questions);
  await saveAnnotations(examId, annotations);

  return NextResponse.json({ ok: true, annotations });
}
