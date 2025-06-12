'use client';

import { useState, useCallback, useMemo } from 'react';
import type { QuizData, Question, UserAnswer, QuizResult, QuizState } from '@/types/quiz';
import { QuizUpload } from '@/components/quiz/QuizUpload';
import { QuestionDisplay } from '@/components/quiz/QuestionDisplay';
import { QuizResults } from '@/components/quiz/QuizResults';
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';

const SUGGESTED_JSON_FORMAT = `{
  "title": "My Awesome Quiz",
  "questions": [
    {
      "id": "q1",
      "questionText": "What is the capital of France?",
      "options": ["Berlin", "Madrid", "Paris", "Rome"],
      "correctAnswers": [2],
      "isMultipleChoice": false,
      "explanation": "Paris is the capital of France."
    },
    {
      "id": "q2",
      "questionText": "Which are primary colors (RGB)?",
      "options": ["Red", "Green", "Blue", "Yellow"],
      "correctAnswers": [0, 1, 2],
      "isMultipleChoice": true,
      "explanation": "Red, Green, and Blue are primary additive colors."
    }
  ]
}`;


export default function HomePage() {
  const [quizState, setQuizState] = useState<QuizState>('upload');
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [timePerQuestion, setTimePerQuestion] = useState<number>(60);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();

  const handleQuizStart = useCallback((data: QuizData, time: number) => {
    setIsLoading(true);
    setQuizData(data);
    setTimePerQuestion(time);
    setCurrentQuestionIndex(0);
    setUserAnswers([]);
    setQuizResult(null);
    setQuizState('active');
    toast({ title: "Quiz Started!", description: data.title || "Good luck!" });
    setIsLoading(false);
  }, [toast]);

  const calculateScore = useCallback((finalAnswers: UserAnswer[], questions: Question[]): QuizResult => {
    let score = 0;
    let totalTimeTaken = 0;

    finalAnswers.forEach(answer => {
      totalTimeTaken += answer.timeTaken;
      if (answer.isCorrect) {
        score++;
      }
    });
    
    return {
      score,
      totalQuestions: questions.length,
      answers: finalAnswers,
      totalTimeTaken,
    };
  }, []);

  const handleNextQuestion = useCallback((selectedIndices: number[], timeTaken: number) => {
    if (!quizData) return;

    const currentQuestion = quizData.questions[currentQuestionIndex];
    let isCorrect = false;
    let isPartiallyCorrect = false;

    if (currentQuestion.isMultipleChoice) {
      const correctCount = currentQuestion.correctAnswers.length;
      const selectedCorrectCount = selectedIndices.filter(idx => currentQuestion.correctAnswers.includes(idx)).length;
      const selectedIncorrectCount = selectedIndices.filter(idx => !currentQuestion.correctAnswers.includes(idx)).length;
      
      isCorrect = selectedCorrectCount === correctCount && selectedIncorrectCount === 0 && selectedIndices.length === correctCount;
      isPartiallyCorrect = selectedCorrectCount > 0 && selectedCorrectCount < correctCount && selectedIncorrectCount === 0;
    } else {
      isCorrect = selectedIndices.length === 1 && currentQuestion.correctAnswers.includes(selectedIndices[0]);
    }
    
    const newAnswer: UserAnswer = {
      questionId: currentQuestion.id,
      questionText: currentQuestion.questionText,
      options: currentQuestion.options,
      selectedAnswers: selectedIndices,
      correctAnswers: currentQuestion.correctAnswers,
      timeTaken,
      isCorrect,
      isPartiallyCorrect: currentQuestion.isMultipleChoice ? isPartiallyCorrect : undefined,
      wasSkipped: selectedIndices.length === 0,
    };

    const updatedAnswers = [...userAnswers, newAnswer];
    setUserAnswers(updatedAnswers);

    if (currentQuestionIndex < quizData.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // End of quiz
      const finalResult = calculateScore(updatedAnswers, quizData.questions);
      setQuizResult(finalResult);
      setQuizState('results');
      toast({ title: "Quiz Finished!", description: `You scored ${finalResult.score} out of ${finalResult.totalQuestions}.` });
    }
  }, [quizData, currentQuestionIndex, userAnswers, calculateScore, toast]);
  
  const handleRestart = useCallback(() => {
    setQuizState('upload');
    setQuizData(null);
    setCurrentQuestionIndex(0);
    setUserAnswers([]);
    setQuizResult(null);
    setIsLoading(false);
  }, []);

  const currentQuestionData = useMemo(() => {
    if (quizData && quizState === 'active') {
      return quizData.questions[currentQuestionIndex];
    }
    return null;
  }, [quizData, quizState, currentQuestionIndex]);

  if (isLoading) {
    return (
      <main className="flex-grow flex flex-col items-center justify-center p-4 md:p-8 bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-foreground">Loading Quiz...</p>
      </main>
    );
  }
  
  return (
    <main className="flex-grow flex flex-col items-center justify-center p-4 md:p-8 bg-background">
      <div className="container mx-auto">
        {quizState === 'upload' && (
          <QuizUpload onQuizStart={handleQuizStart} suggestedFormat={SUGGESTED_JSON_FORMAT} />
        )}
        {quizState === 'active' && currentQuestionData && quizData && (
          <QuestionDisplay
            key={currentQuestionData.id} // Ensure re-mount for timer reset
            question={currentQuestionData}
            questionNumber={currentQuestionIndex + 1}
            totalQuestions={quizData.questions.length}
            timeLimit={timePerQuestion}
            onNext={handleNextQuestion}
          />
        )}
        {quizState === 'results' && quizResult && (
          <QuizResults result={quizResult} onRestart={handleRestart} />
        )}
      </div>
    </main>
  );
}
