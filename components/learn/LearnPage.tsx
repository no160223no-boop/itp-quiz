"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { Exam, Question, AnswerKey, QuizResult } from "@/lib/types";
import type { Annotation, QuestionAnnotations } from "@/lib/annotator";
import { saveProgress, loadProgress, clearProgress } from "@/lib/quizStorage";
import { AnnotatedQuestion } from "@/components/learn/AnnotatedQuestion";
import {
  CheckCircle,
  XCircle,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Home,
  BookmarkCheck,
  Loader2,
  BookOpen,
} from "lucide-react";

type Phase = "loading" | "generating" | "quiz" | "results";

interface Props {
  exam: Exam;
  questions: Question[];
}

const STORAGE_KEY = (id: string) => `itp-learn-progress-${id}`;

export function LearnPage({ exam, questions }: Props) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading");
  const [annotationsMap, setAnnotationsMap] = useState<Record<number, Annotation[]>>({});
  const [genError, setGenError] = useState<string | null>(null);

  // クイズ状態
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<AnswerKey | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState<Record<number, AnswerKey | null>>({});
  const [resumedFrom, setResumedFrom] = useState<number | null>(null);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [showGrid, setShowGrid] = useState(false);

  // 注釈を取得 or 生成
  useEffect(() => {
    async function loadAnnotations() {
      // まずキャッシュ確認
      const res = await fetch(`/api/annotations/${exam.id}`);
      const data = await res.json();

      if (data.cached && data.annotations) {
        applyAnnotations(data.annotations);
      } else {
        // 未生成 → Claude APIで生成
        setPhase("generating");
        const genRes = await fetch(`/api/annotations/${exam.id}`, { method: "POST" });
        if (!genRes.ok) {
          const err = await genRes.json();
          setGenError(err.error ?? "注釈の生成に失敗しました");
          return;
        }
        const genData = await genRes.json();
        applyAnnotations(genData.annotations);
      }

      // 進行状況を復元
      const saved = loadSavedProgress();
      if (saved && saved.currentIndex > 0) {
        setIndex(saved.currentIndex);
        setAnswers(saved.answers);
        setResumedFrom(saved.currentIndex);
      }
      setPhase("quiz");
    }

    loadAnnotations();
  }, [exam.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function applyAnnotations(list: QuestionAnnotations[]) {
    const map: Record<number, Annotation[]> = {};
    list.forEach((qa) => {
      map[qa.questionNumber] = qa.annotations;
    });
    setAnnotationsMap(map);
  }

  function loadSavedProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY(exam.id));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  const autosave = useCallback(
    (nextIndex: number, nextAnswers: Record<number, AnswerKey | null>) => {
      try {
        localStorage.setItem(
          STORAGE_KEY(exam.id),
          JSON.stringify({ currentIndex: nextIndex, answers: nextAnswers, savedAt: new Date().toISOString() })
        );
      } catch {}
    },
    [exam.id]
  );

  const q = questions[index];
  const isLast = index === questions.length - 1;
  const progress = Math.round((index / questions.length) * 100);
  const currentAnnotations = annotationsMap[q?.number] ?? [];

  function select(key: AnswerKey) {
    if (revealed) return;
    setSelected(key);
  }

  function reveal() {
    if (!selected) return;
    const nextAnswers = { ...answers, [q.number]: selected };
    setAnswers(nextAnswers);
    setRevealed(true);
    autosave(index, nextAnswers);
  }

  function next() {
    const finalAnswers = { ...answers, [q.number]: selected };
    if (isLast) {
      localStorage.removeItem(STORAGE_KEY(exam.id));
      setResult(calcResult(questions, finalAnswers));
      setPhase("results");
    } else {
      const ni = index + 1;
      setIndex(ni);
      setSelected(null);
      setRevealed(false);
      autosave(ni, finalAnswers);
    }
  }

  function goTo(i: number) {
    const targetQ = questions[i];
    const prevAnswer = answers[targetQ.number] ?? null;
    setIndex(i);
    setSelected(prevAnswer);
    setRevealed(prevAnswer !== null);
    setShowGrid(false);
    autosave(i, answers);
  }

  function prev() {
    if (index > 0) goTo(index - 1);
  }

  function saveAndGoHome() {
    autosave(index, answers);
    router.push("/");
  }

  function restart() {
    localStorage.removeItem(STORAGE_KEY(exam.id));
    setIndex(0);
    setSelected(null);
    setRevealed(false);
    setAnswers({});
    setResumedFrom(null);
    setResult(null);
    setPhase("quiz");
  }

  // ── ローディング画面 ──
  if (phase === "loading" || phase === "generating") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 min-h-[300px] text-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        {phase === "generating" ? (
          <>
            <p className="text-sm font-medium">用語解説を生成中...</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Claude AIが{questions.length}問の専門用語を解析しています。
              <br />初回のみ約20〜40秒かかります。
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">読み込み中...</p>
        )}
        {genError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 max-w-sm">
            <p className="font-medium mb-1">エラー</p>
            <p>{genError}</p>
            <p className="mt-2 text-xs">
              .env.local に ANTHROPIC_API_KEY を設定してください。
            </p>
          </div>
        )}
      </div>
    );
  }

  // ── 結果画面 ──
  if (phase === "results" && result) {
    return <Results result={result} examTitle={exam.title} onRestart={restart} />;
  }

  const isCorrect = revealed && selected === q.correctAnswer;

  return (
    <div className="flex flex-col gap-5 max-w-2xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 px-2 py-0.5 rounded-full flex items-center gap-1">
            <BookOpen className="h-3 w-3" />
            解説付きモード
          </span>
          {resumedFrom !== null && (
            <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 px-2 py-0.5 rounded-full flex items-center gap-1">
              <BookmarkCheck className="h-3 w-3" />
              問{resumedFrom + 1}から再開
            </span>
          )}
        </div>
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

      {/* プログレスバー */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground tabular-nums min-w-[5rem]">
          {index + 1} / {questions.length}
        </span>
        <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-purple-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">{progress}%</span>
      </div>

      {/* 問題一覧グリッド */}
      <div className="rounded-xl border overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
          onClick={() => setShowGrid(!showGrid)}
        >
          <span>
            問題一覧 — {Object.keys(answers).length} / {questions.length} 問 回答済み
          </span>
          {showGrid ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {showGrid && (
          <div className="p-3 border-t grid grid-cols-10 gap-1">
            {questions.map((q_, i) => {
              const isAnswered = answers[q_.number] !== undefined;
              const isCorrect = isAnswered && answers[q_.number] === q_.correctAnswer;
              const isCurrent = i === index;
              return (
                <button
                  key={q_.number}
                  onClick={() => goTo(i)}
                  className={[
                    "h-8 rounded text-xs font-mono font-medium transition-colors border",
                    isCurrent
                      ? "border-purple-500 ring-1 ring-purple-500 bg-purple-50 dark:bg-purple-950"
                      : "border-transparent",
                    isAnswered
                      ? isCorrect
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                      : "bg-secondary text-secondary-foreground hover:bg-accent",
                  ].filter(Boolean).join(" ")}
                >
                  {q_.number}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 問題カード（注釈付き） */}
      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">問{q.number}</span>
          {q.category && (
            <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded">
              {q.category}
            </span>
          )}
        </div>
        <AnnotatedQuestion text={q.question} annotations={currentAnnotations} imageUrls={q.imageUrls} />
      </div>

      {/* 選択肢 */}
      <div className="flex flex-col gap-2">
        {q.choices.map((choice) => {
          const isThisCorrect = revealed && choice.key === q.correctAnswer;
          const isThisWrong = revealed && selected === choice.key && choice.key !== q.correctAnswer;
          return (
            <button
              key={choice.key}
              onClick={() => select(choice.key)}
              disabled={revealed}
              className={[
                "w-full text-left rounded-lg border p-4 flex items-start gap-3 text-sm transition-colors",
                !revealed && selected !== choice.key && "hover:bg-accent hover:border-foreground/20 cursor-pointer",
                !revealed && selected === choice.key && "border-primary bg-primary/5",
                isThisCorrect && "border-green-500 bg-green-50 dark:bg-green-950",
                isThisWrong && "border-red-500 bg-red-50 dark:bg-red-950",
                revealed && !isThisCorrect && selected !== choice.key && "opacity-40",
                revealed && "cursor-default",
              ].filter(Boolean).join(" ")}
            >
              <span className={["font-mono font-bold shrink-0 w-4", isThisCorrect && "text-green-600", isThisWrong && "text-red-600"].filter(Boolean).join(" ")}>
                {choice.key}
              </span>
              <span className="leading-relaxed flex-1">{choice.text}</span>
              {isThisCorrect && <CheckCircle className="shrink-0 text-green-600 h-4 w-4 mt-0.5" />}
              {isThisWrong && <XCircle className="shrink-0 text-red-600 h-4 w-4 mt-0.5" />}
            </button>
          );
        })}
      </div>

      {/* フィードバック + 解説 */}
      {revealed && (
        <div className={["rounded-lg border p-4 text-sm", isCorrect ? "border-green-200 bg-green-50 dark:bg-green-950" : "border-red-200 bg-red-50 dark:bg-red-950"].join(" ")}>
          <p className={["font-semibold mb-1", isCorrect ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"].join(" ")}>
            {isCorrect ? "正解！" : `不正解（正解：${q.correctAnswer}）`}
          </p>
          {q.explanation && (
            <p className="text-muted-foreground leading-relaxed mt-2 whitespace-pre-wrap">
              {q.explanation}
            </p>
          )}
        </div>
      )}

      {/* ボタン */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={prev}
          disabled={index === 0}
          className="h-10 px-3"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {!revealed ? (
          <Button onClick={reveal} disabled={!selected} className="flex-1 bg-purple-600 hover:bg-purple-700">
            回答する
          </Button>
        ) : (
          <Button onClick={next} className="flex-1 bg-purple-600 hover:bg-purple-700">
            {isLast ? "結果を見る" : "次の問題"}
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ── 結果画面 ─────────────────────────────────────────────────────────────────

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
    const ua = answers[q.number] ?? null;
    const ok = ua === q.correctAnswer;
    if (ok) correctCount++;
    const cat = q.category ?? "未分類";
    if (!categoryResults[cat]) categoryResults[cat] = { total: 0, correct: 0 };
    categoryResults[cat].total++;
    if (ok) categoryResults[cat].correct++;
    resultAnswers[q.number] = { userAnswer: ua, correctAnswer: q.correctAnswer };
  }
  return { examId: questions[0]?.examId ?? "", totalQuestions: questions.length, correctAnswers: correctCount, categoryResults, answers: resultAnswers };
}

function Results({ result, examTitle, onRestart }: { result: QuizResult; examTitle: string; onRestart: () => void }) {
  const router = useRouter();
  const pct = Math.round((result.correctAnswers / result.totalQuestions) * 100);
  const passed = pct >= 60;
  const scoreColor = pct >= 80 ? "text-green-600" : pct >= 60 ? "text-yellow-600" : "text-red-500";
  const categories = Object.entries(result.categoryResults).filter(([, v]) => v.total > 0);

  return (
    <div className="flex flex-col gap-5 max-w-2xl mx-auto">
      <div className="rounded-xl border bg-card p-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <BookOpen className="h-4 w-4 text-purple-500" />
          <p className="text-sm text-muted-foreground">解説付きモード — {examTitle}</p>
        </div>
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
                    <span className="tabular-nums">{correct}/{total}（{p}%）</span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${p >= 60 ? "bg-green-500" : "bg-red-400"}`} style={{ width: `${p}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={() => router.push("/")}>
          <Home className="mr-2 h-4 w-4" />トップへ
        </Button>
        <Button className="flex-1 bg-purple-600 hover:bg-purple-700" onClick={onRestart}>
          <RotateCcw className="mr-2 h-4 w-4" />もう一度
        </Button>
      </div>
    </div>
  );
}
