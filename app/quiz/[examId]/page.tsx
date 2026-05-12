import { notFound } from "next/navigation";
import { getExams, getQuestions } from "@/lib/storage";
import { QuizPage } from "@/components/QuizPage";

interface Props {
  params: Promise<{ examId: string }>;
}

export default async function QuizExamPage({ params }: Props) {
  const { examId } = await params;
  const [exams, questions] = await Promise.all([getExams(), getQuestions(examId)]);
  const exam = exams.find((e) => e.id === examId);

  if (!exam || questions.length === 0) notFound();

  return (
    <div className="min-h-svh p-6">
      <QuizPage exam={exam} questions={questions} />
    </div>
  );
}
