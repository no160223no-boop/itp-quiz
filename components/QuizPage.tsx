"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { Exam, Question, AnswerKey, QuizResult } from "@/lib/types";
import { saveProgress, loadProgress, clearProgress } from "@/lib/quizStorage";
import {
  CheckCircle,
  XCircle,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Home,
  Flag,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

type Phase = "loading" | "quiz" | "results";

interface Props {
  exam: Exam;
  questions: Question[];
}

export function QuizPage({ exam, questions }: Props) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, AnswerKey | null>>({});
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [showGrid, setShowGrid] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);

  useEffect(() => {
    const saved = loadProgress(exam.id);
    if (saved) {
      if (saved.currentIndex > 0) setIndex(saved.currentIndex);
      setAnswers(saved.answers ?? {});
      setRevealed(new Set(saved.revealed ?? []));
      setFlagged(new Set(saved.flagged ?? []));
    }
    setPhase("quiz");
  }, [exam.id]);

  const q = questions[index];
  const isRevealed = q ? revealed.has(q.number) : false;
  const isFlagged = q ? flagged.has(q.number) : false;
  const currentAnswer = q ? (answers[q.number] ?? null) : null;
  const answeredCount = revealed.size;
  const allAnswered = answeredCount === questions.length;

  const autosave = useCallback(
    (idx: number, ans: Record<number, AnswerKey | null>, rev: Set<number>, flag: Set<number>) => {
      saveProgress({
        examId: exam.id,
        currentIndex: idx,
        answers: ans,
        revealed: Array.from(rev),
        flagged: Array.from(flag),
        savedAt: new Date().toISOString(),
      });
    },
    [exam.id]
  );

  function select(key: AnswerKey) {
    if (isRevealed) return;
    setAnswers((prev) => ({ ...prev, [q.number]: key }));
  }

  function revealCurrent() {
    if (!currentAnswer) return;
    const next = new Set(revealed);
    next.add(q.number);
    setRevealed(next);
    autosave(index, answers, next, flagged);
  }

  function toggleFlag() {
    const next = new Set(flagged);
    if (next.has(q.number)) next.delete(q.number);
    else next.add(q.number);
    setFlagged(next);
    autosave(index, answers, revealed, next);
  }

  function goTo(i: number) {
    setIndex(i);
    setShowGrid(false);
    autosave(i, answers, revealed, flagged);
  }

  function prev() {
    if (index > 0) goTo(index - 1);
  }
  function next() {
    if (index < questions.length - 1) goTo(index + 1);
  }

  function finish() {
    clearProgress(exam.id);
    setResult(calcResult(questions, answers));
    setPhase("results");
  }

  function restart() {
    clearProgress(exam.id);
    setIndex(0);
    setAnswers({});
    setRevealed(new Set());
    setFlagged(new Set());
    setResult(null);
    setPhase("quiz");
  }

  function saveAndGoHome() {
    autosave(index, answers, revealed, flagged);
    router.push("/");
  }

  if (phase === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[200px] text-muted-foreground text-sm">
        読み込み中...
      </div>
    );
  }

  if (phase === "results" && result) {
    return <Results result={result} examTitle={exam.title} onRestart={restart} />;
  }

  const isCorrect = isRevealed && currentAnswer === q.correctAnswer;

  return (
    <div className="flex flex-col gap-4 max-w-2xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium truncate">{exam.title}</span>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="sm" onClick={saveAndGoHome} className="text-xs h-7 px-2">
            <Home className="h-3 w-3 mr-1" />
            保存して戻る
          </Button>
          <Button variant="ghost" size="sm" onClick={restart} className="text-xs h-7 px-2">
            <RotateCcw className="h-3 w-3 mr-1" />
            最初から
          </Button>
        </div>
      </div>

      {/* 問題一覧グリッド */}
      <div className="rounded-xl border overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
          onClick={() => setShowGrid(!showGrid)}
        >
          <span>
            問題一覧 — {answeredCount} / {questions.length} 問 回答済み
          </span>
          {showGrid ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {showGrid && (
          <div className="p-3 border-t grid grid-cols-10 gap-1">
            {questions.map((q_, i) => {
              const qn = q_.number;
              const isAns = revealed.has(qn);
              const correct = isAns && answers[qn] === q_.correctAnswer;
              const flag = flagged.has(qn);
              const isCurrent = i === index;
              return (
                <button
                  key={qn}
                  onClick={() => goTo(i)}
                  className={[
                    "relative h-8 rounded text-xs font-mono font-medium transition-colors border",
                    isCurrent
                      ? "border-primary ring-1 ring-primary bg-primary/5"
                      : "border-transparent",
                    isAns
                      ? correct
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                      : "bg-secondary text-secondary-foreground hover:bg-accent",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {qn}
                  {flag && (
                    <span className="absolute -top-1 -right-1 leading-none text-orange-500">
                      <Flag className="h-2.5 w-2.5 fill-current" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ナビゲーション */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={prev}
          disabled={index === 0}
          className="h-8 px-3"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 flex items-center gap-2">
          <span className="text-xs text-muted-foreground tabular-nums min-w-[4.5rem]">
            {index + 1} / {questions.length}
          </span>
          <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${Math.round((answeredCount / questions.length) * 100)}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            {Math.round((answeredCount / questions.length) * 100)}%
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={next}
          disabled={index === questions.length - 1}
          className="h-8 px-3"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* 問題カード */}
      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">問{q.number}</span>
            {q.category && (
              <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded">
                {q.category}
              </span>
            )}
          </div>
          <button
            onClick={toggleFlag}
            className={[
              "flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-colors",
              isFlagged
                ? "bg-orange-100 border-orange-300 text-orange-700 dark:bg-orange-950 dark:border-orange-700 dark:text-orange-300"
                : "border-border text-muted-foreground hover:bg-accent",
            ].join(" ")}
          >
            <Flag className={["h-3 w-3", isFlagged && "fill-current"].filter(Boolean).join(" ")} />
            {isFlagged ? "フラグ中" : "フラグ"}
          </button>
        </div>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{q.question}</p>
        {q.imageUrls && q.imageUrls.length > 0 && (
          <div className="mt-3 flex flex-col gap-2">
            {q.imageUrls.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={url} alt={`問題図${i + 1}`} className="max-w-full rounded border" />
            ))}
          </div>
        )}
      </div>

      {/* 選択肢 */}
      <div className="flex flex-col gap-2">
        {q.choices.map((choice) => {
          const isThisCorrect = isRevealed && choice.key === q.correctAnswer;
          const isThisWrong =
            isRevealed && currentAnswer === choice.key && choice.key !== q.correctAnswer;
          const isSelected = currentAnswer === choice.key;
          return (
            <button
              key={choice.key}
              onClick={() => select(choice.key)}
              disabled={isRevealed}
              className={[
                "w-full text-left rounded-lg border p-4 flex items-start gap-3 text-sm transition-colors",
                !isRevealed &&
                  !isSelected &&
                  "hover:bg-accent hover:border-foreground/20 cursor-pointer",
                !isRevealed && isSelected && "border-primary bg-primary/5",
                isThisCorrect && "border-green-500 bg-green-50 dark:bg-green-950",
                isThisWrong && "border-red-500 bg-red-50 dark:bg-red-950",
                isRevealed && !isThisCorrect && currentAnswer !== choice.key && "opacity-40",
                isRevealed && "cursor-default",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span
                className={[
                  "font-mono font-bold shrink-0 w-4",
                  isThisCorrect && "text-green-600 dark:text-green-400",
                  isThisWrong && "text-red-600 dark:text-red-400",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {choice.key}
              </span>
              <span className="leading-relaxed flex-1">{choice.text}</span>
              {isThisCorrect && <CheckCircle className="shrink-0 text-green-600 h-4 w-4 mt-0.5" />}
              {isThisWrong && <XCircle className="shrink-0 text-red-600 h-4 w-4 mt-0.5" />}
            </button>
          );
        })}
      </div>

      {/* フィードバック */}
      {isRevealed && (
        <div
          className={[
            "rounded-lg border p-4 text-sm",
            isCorrect
              ? "border-green-200 bg-green-50 dark:bg-green-950"
              : "border-red-200 bg-red-50 dark:bg-red-950",
          ].join(" ")}
        >
          <p
            className={[
              "font-semibold mb-1",
              isCorrect ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300",
            ].join(" ")}
          >
            {isCorrect ? "正解！" : `不正解（正解：${q.correctAnswer}）`}
          </p>
          {q.explanation && (
            <p className="text-muted-foreground leading-relaxed mt-2 whitespace-pre-wrap">
              {q.explanation}
            </p>
          )}
        </div>
      )}

      {/* アクション */}
      <div className="flex gap-3">
        {!isRevealed ? (
          <Button onClick={revealCurrent} disabled={!currentAnswer} className="flex-1">
            回答する
          </Button>
        ) : allAnswered ? (
          <Button onClick={finish} className="flex-1">
            結果を見る
          </Button>
        ) : (
          <Button
            onClick={next}
            disabled={index === questions.length - 1}
            variant="outline"
            className="flex-1"
          >
            次の問題
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ── 結果画面 ────────────────────────────────────────────────────────────────

function calcResult(questions: Question[], answers: Record<number, AnswerKey | null>): QuizResult {
  const categoryResults: QuizResult["categoryResults"] = {
    ストラテジ系: { total: 0, correct: 0 },
    マネジメント系: { total: 0, correct: 0 },
    テクノロジ系: { total: 0, correct: 0 },
    未分類: { total: 0, correct: 0 },
  };
  let correctCount = 0;
  const resultAnswers: QuizResult["answers"] = {};

  for (const q of questions) {
    const userAnswer = answers[q.number] ?? null;
    const isCorrect = userAnswer === q.correctAnswer;
    if (isCorrect) correctCount++;
    const cat = q.category ?? "未分類";
    if (!categoryResults[cat]) categoryResults[cat] = { total: 0, correct: 0 };
    categoryResults[cat].total++;
    if (isCorrect) categoryResults[cat].correct++;
    resultAnswers[q.number] = { userAnswer, correctAnswer: q.correctAnswer };
  }

  return {
    examId: questions[0]?.examId ?? "",
    totalQuestions: questions.length,
    correctAnswers: correctCount,
    categoryResults,
    answers: resultAnswers,
  };
}

function Results({
  result,
  examTitle,
  onRestart,
}: {
  result: QuizResult;
  examTitle: string;
  onRestart: () => void;
}) {
  const router = useRouter();
  const pct = Math.round((result.correctAnswers / result.totalQuestions) * 100);
  const passed = pct >= 60;
  const scoreColor = pct >= 80 ? "text-green-600" : pct >= 60 ? "text-yellow-600" : "text-red-500";
  const categories = Object.entries(result.categoryResults).filter(([, v]) => v.total > 0);

  return (
    <div className="flex flex-col gap-5 max-w-2xl mx-auto">
      <div className="rounded-xl border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground mb-1">{examTitle}</p>
        <div className={`text-7xl font-bold mb-2 ${scoreColor}`}>{pct}%</div>
        <p className="text-muted-foreground text-sm">
          {result.totalQuestions}問中 <strong>{result.correctAnswers}問</strong> 正解
        </p>
        <p className={`mt-2 text-sm font-medium ${passed ? "text-green-600" : "text-red-500"}`}>
          {passed ? "合格ライン達成 🎉" : "合格ラインまであと少し！"}
        </p>
      </div>

      {categories.length > 0 && (
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4">分野別正答率</h3>
          <div className="flex flex-col gap-3">
            {categories.map(([cat, { total, correct }]) => {
              const p = Math.round((correct / total) * 100);
              return (
                <div key={cat}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{cat}</span>
                    <span className="tabular-nums">
                      {correct}/{total}（{p}%）
                    </span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${p >= 60 ? "bg-green-500" : "bg-red-400"}`}
                      style={{ width: `${p}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={() => router.push("/")}>
          <Home className="mr-2 h-4 w-4" />
          トップへ
        </Button>
        <Button className="flex-1" onClick={onRestart}>
          <RotateCcw className="mr-2 h-4 w-4" />
          もう一度
        </Button>
      </div>
    </div>
  );
}
