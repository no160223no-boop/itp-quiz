import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { Question } from "./types";

export interface Annotation {
  term: string;
  explanation: string;
}

export interface QuestionAnnotations {
  questionId: string;
  questionNumber: number;
  annotations: Annotation[];
}

const BATCH_SIZE = 10;

// Cached across all calls in the same session (~5min TTL)
const SYSTEM_TEXT = `あなたはITパスポート試験の学習支援AIです。
複数の問題文それぞれについて、受験者が「問題文だけを読んで正解を導けるよう」必要な専門用語・略語・固有名詞を抽出し解説を付けてください。

要件:
- 問題を解くために知るべき用語を3〜5個選ぶ
- 各解説は80字以内で、この問題の文脈で正解を選ぶのに直接役立つ情報に絞る
- 問題文中に登場する正確な文字列をtermに指定する
- 一般的な日本語の単語は含めない

以下のJSON形式のみで返答してください（前後に余分なテキスト不要）:
{"questions":[{"questionNumber":<問番号>,"annotations":[{"term":"問題文中の正確な文字列","explanation":"解説"}]},...]}`.trim();

async function annotateBatch(
  client: Anthropic,
  questions: Question[]
): Promise<QuestionAnnotations[]> {
  const userText = questions.map((q) => `問${q.number}:\n${q.question}`).join("\n\n");

  try {
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: BATCH_SIZE * 600,
      system: [{ type: "text", text: SYSTEM_TEXT, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: userText }],
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("no JSON");

    const parsed = JSON.parse(jsonMatch[0]) as {
      questions: { questionNumber: number; annotations: Annotation[] }[];
    };

    return parsed.questions.map((pq) => {
      const q = questions.find((q) => q.number === pq.questionNumber);
      return {
        questionId: q?.id ?? `${questions[0].examId}-q${pq.questionNumber}`,
        questionNumber: pq.questionNumber,
        annotations: pq.annotations ?? [],
      };
    });
  } catch {
    return questions.map((q) => ({ questionId: q.id, questionNumber: q.number, annotations: [] }));
  }
}

export async function generateExamAnnotations(
  questions: Question[]
): Promise<QuestionAnnotations[]> {
  const client = new Anthropic();
  const batches: Question[][] = [];
  for (let i = 0; i < questions.length; i += BATCH_SIZE) {
    batches.push(questions.slice(i, i + BATCH_SIZE));
  }

  const results: QuestionAnnotations[] = [];
  // 5並列でバッチ処理
  for (let i = 0; i < batches.length; i += 5) {
    const chunk = await Promise.all(batches.slice(i, i + 5).map((b) => annotateBatch(client, b)));
    results.push(...chunk.flat());
  }
  return results;
}
