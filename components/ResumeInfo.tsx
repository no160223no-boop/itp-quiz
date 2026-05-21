"use client";

import { useState } from "react";
import { loadProgress } from "@/lib/quizStorage";
import { BookmarkCheck } from "lucide-react";

interface Props {
  examId: string;
  total: number;
}

export function ResumeInfo({ examId, total }: Props) {
  const [savedIndex] = useState<number | null>(() => {
    const p = loadProgress(examId);
    return p && p.currentIndex > 0 ? p.currentIndex : null;
  });

  if (savedIndex === null) return null;

  return (
    <span className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-medium">
      <BookmarkCheck className="h-3 w-3" />
      問{savedIndex + 1}/{total}まで進行中
    </span>
  );
}
