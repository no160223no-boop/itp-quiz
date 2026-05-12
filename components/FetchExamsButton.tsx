"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";

interface Props {
  examCount: number;
}

export function FetchExamsButton({ examCount }: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  async function handleFetch() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/exams", { method: "POST" });
      const data = await res.json();

      const results: { id: string; questionCount?: number; error?: string }[] = data.results ?? [];
      const succeeded = results.filter((r) => r.questionCount && r.questionCount > 0);

      if (succeeded.length > 0) {
        const total = succeeded.reduce((s, r) => s + (r.questionCount ?? 0), 0);
        setMessage(`${succeeded.length}年分・計${total}問を取得しました`);
        router.refresh();
      } else if (data.error) {
        setMessage(`エラー: ${data.error}`);
      } else {
        setMessage("取得に失敗しました。ネットワーク環境を確認してください。");
      }
    } catch {
      setMessage("ネットワークエラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={handleFetch} disabled={loading} variant={examCount > 0 ? "outline" : "default"}>
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Download className="mr-2 h-4 w-4" />
        )}
        {loading
          ? "取得中（1〜2分かかります）..."
          : examCount > 0
          ? "過去問を更新"
          : "過去問を取得（直近5年分）"}
      </Button>
      {message && (
        <p className="text-sm text-muted-foreground">{message}</p>
      )}
    </div>
  );
}
