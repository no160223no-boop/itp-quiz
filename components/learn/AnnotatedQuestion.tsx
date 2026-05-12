import type { Annotation } from "@/lib/annotator";

interface Props {
  text: string;
  annotations: Annotation[];
  imageUrls?: string[];
}

function QuestionImages({ imageUrls }: { imageUrls?: string[] }) {
  if (!imageUrls || imageUrls.length === 0) return null;
  return (
    <div className="mt-3 flex flex-col gap-2">
      {imageUrls.map((url, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={i} src={url} alt={`問題図${i + 1}`} className="max-w-full rounded border" />
      ))}
    </div>
  );
}

export function AnnotatedQuestion({ text, annotations, imageUrls }: Props) {
  if (annotations.length === 0) {
    return (
      <div>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
        <QuestionImages imageUrls={imageUrls} />
      </div>
    );
  }

  // 各用語の最初の出現位置を取得してソート
  type Marker = { start: number; end: number; idx: number };
  const markers: Marker[] = [];

  annotations.forEach((ann, i) => {
    const pos = text.indexOf(ann.term);
    if (pos !== -1) markers.push({ start: pos, end: pos + ann.term.length, idx: i });
  });

  markers.sort((a, b) => a.start - b.start);

  // テキストをパーツに分割してレンダリング
  const parts: React.ReactNode[] = [];
  let cursor = 0;

  markers.forEach(({ start, end, idx }) => {
    if (start < cursor) return; // 重複スキップ
    if (start > cursor) parts.push(text.slice(cursor, start));

    parts.push(
      <span key={idx} className="border-b border-dashed border-blue-500 dark:border-blue-400">
        {text.slice(start, end)}
        <sup className="text-blue-600 dark:text-blue-400 font-bold text-[0.65em] ml-0.5 select-none">
          ※{idx + 1}
        </sup>
      </span>
    );
    cursor = end;
  });

  if (cursor < text.length) parts.push(text.slice(cursor));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{parts}</p>
        <QuestionImages imageUrls={imageUrls} />
      </div>

      {/* 注釈リスト */}
      <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/50 p-4">
        <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 mb-2 tracking-wider uppercase">
          用語解説
        </p>
        <dl className="flex flex-col gap-2">
          {annotations.map((ann, i) => (
            <div key={i} className="text-xs leading-relaxed">
              <dt className="inline font-semibold text-foreground">
                <span className="text-blue-600 dark:text-blue-400 mr-1 tabular-nums">※{i + 1}</span>
                {ann.term}
              </dt>
              <dd className="inline text-muted-foreground before:content-['：']">{ann.explanation}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
