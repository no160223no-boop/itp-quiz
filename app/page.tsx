import Link from "next/link";
import { getExams } from "@/lib/storage";
import { FetchExamsButton } from "@/components/FetchExamsButton";
import { ResumeInfo } from "@/components/ResumeInfo";
import { Button } from "@/components/ui/button";
import { BookOpen, CheckCircle, Clock, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function HomePage() {
  const exams = await getExams();

  return (
    <div className="min-h-svh p-6 max-w-2xl mx-auto">
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ITパスポート 過去問練習</h1>
          <p className="text-muted-foreground text-sm mt-1">
            IPA公式の公開問題（直近5年分）を使って本番対策
          </p>
        </div>

        {/* Fetch button */}
        <FetchExamsButton examCount={exams.length} />

        {/* Exam list */}
        {exams.length === 0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
            <BookOpen className="mx-auto h-8 w-8 mb-3 opacity-40" />
            <p className="text-sm">まだ過去問がありません</p>
            <p className="text-xs mt-1">上のボタンから過去問を取得してください</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-muted-foreground">取得済みの過去問</h2>
            {exams.map((exam) => (
              <div
                key={exam.id}
                className="rounded-xl border bg-card p-5 flex items-center justify-between gap-4"
              >
                <div className="flex flex-col gap-1 min-w-0">
                  <p className="font-medium text-sm truncate">{exam.title}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      {exam.questionCount}問
                    </span>
                    {exam.fetchedAt && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(exam.fetchedAt)}
                      </span>
                    )}
                  </div>
                  <ResumeInfo examId={exam.id} total={exam.questionCount} />
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <Link href={`/quiz/${exam.id}`}>
                    <Button size="sm" className="w-full">練習開始</Button>
                  </Link>
                  <Link href={`/learn/${exam.id}`}>
                    <Button size="sm" variant="outline" className="w-full text-purple-600 border-purple-300 hover:bg-purple-50 dark:text-purple-400 dark:border-purple-700 dark:hover:bg-purple-950">
                      <Sparkles className="h-3 w-3 mr-1" />
                      解説付き
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info */}
        <p className="text-xs text-muted-foreground">
          問題は IPA（情報処理推進機構）の公開問題を使用しています。
        </p>
      </div>
    </div>
  );
}
