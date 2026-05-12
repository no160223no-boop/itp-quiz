"use client";

import { useEffect, useState } from "react";
import { loadProgress } from "@/lib/quizStorage";
import { BookmarkCheck } from "lucide-react";

interface Props {
  examId: string;
  total: number;
}

export function ResumeInfo({ examId, total }: Props) {
  const [savedIndex, setSavedIndex] = useState<number | null>(null);

  useEffect(() => {
    const p = loadProgress(examId);
    // index 0 は「まだ1問目」なので表示しない
    if (p && p.currentIndex > 0) {
      setSavedIndex(p.currentIndex);
    }
  }, [examId]);

  if (savedIndex === null) return null;

  return (
    <span className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-medium">
      <BookmarkCheck className="h-3 w-3" />
      問{savedIndex + 1}/{total}まで進行中
    </span>
  );
}
