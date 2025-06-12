
'use client';

import { useState, useCallback, useMemo } from 'react';
import type { QuizData, Question, UserAnswer, QuizResult, QuizState } from '@/types/quiz';
import { QuizUpload } from '@/components/quiz/QuizUpload';
import { QuestionDisplay } from '@/components/quiz/QuestionDisplay';
import { QuizResults } from '@/components/quiz/QuizResults';
import { StudyModeDisplay } from '@/components/quiz/StudyModeDisplay';
import { useToast } from "@/hooks/use-toast";
import { Loader2, BrainCircuit } from 'lucide-react'; // Added BrainCircuit
import { generateQuiz, type GenerateQuizInput } from '@/ai/flows/generate-quiz-flow';

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

type QuizMode = 'exam' | 'study';

export default function HomePage() {
  const [quizState, setQuizState] = useState<QuizState>('upload');
  const [quizMode, setQuizMode] = useState<QuizMode>('exam');
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [timePerQuestion, setTimePerQuestion] = useState<number>(60); // Default for manually uploaded quizzes
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const { toast } = useToast();

  const handleQuizLoad = useCallback((data: QuizData, mode: QuizMode, timeLimitPerQuestion?: number) => {
    setQuizData(data);
    setQuizMode(mode);
    if (mode === 'exam') {
      setTimePerQuestion(timeLimitPerQuestion || 0); // 0 for generated quizzes means no timer per q, or use configured time
      setCurrentQuestionIndex(0);
      setUserAnswers([]);
    }
    setQuizResult(null);
    setQuizState('active');
    toast({ title: mode === 'exam' ? "Quiz Ready!" : "Study Mode Activated!", description: data.title || (mode === 'exam' ? "Good luck!" : "Happy studying!") });
  }, [toast]);


  const handleGenerateQuizAndStart = useCallback(async (generationInput: GenerateQuizInput, mode: QuizMode) => {
    setQuizState('generating');
    try {
      const generatedData = await generateQuiz(generationInput);
      if (!generatedData || !generatedData.questions || generatedData.questions.length === 0) {
        toast({ variant: "destructive", title: "Generation Failed", description: "The AI could not generate a quiz from the provided material." });
        setQuizState('upload');
        return;
      }
      // For generated quizzes, we might not want a strict time limit per question initially, or make it configurable.
      // Setting to 0 implies no individual question timer for now in QuestionDisplay logic (if adapted) or rely on total time.
      // Or, we can assign a default time like 60s.
      handleQuizLoad(generatedData, mode, mode === 'exam' ? 60 : undefined); 
    } catch (error) {
      console.error("Quiz generation error:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during quiz generation.";
      toast({ variant: "destructive", title: "Generation Error", description: errorMessage });
      setQuizState('upload');
    }
  }, [handleQuizLoad, toast]);


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
    if (!quizData || quizMode !== 'exam') return;

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
      const finalResult = calculateScore(updatedAnswers, quizData.questions);
      setQuizResult(finalResult);
      setQuizState('results');
      toast({ title: "Quiz Finished!", description: `You scored ${finalResult.score} out of ${finalResult.totalQuestions}.` });
    }
  }, [quizData, quizMode, currentQuestionIndex, userAnswers, calculateScore, toast]);
  
  const handleRestart = useCallback(() => {
    setQuizState('upload');
    setQuizMode('exam');
    setQuizData(null);
    setCurrentQuestionIndex(0);
    setUserAnswers([]);
    setQuizResult(null);
  }, []);

  const currentQuestionData = useMemo(() => {
    if (quizData && quizState === 'active' && quizMode === 'exam') {
      return quizData.questions[currentQuestionIndex];
    }
    return null;
  }, [quizData, quizState, quizMode, currentQuestionIndex]);

  if (quizState === 'generating') {
    return (
      <main className="flex-grow flex flex-col items-center justify-center p-4 md:p-8 bg-background">
        <BrainCircuit className="h-16 w-16 animate-pulse text-primary mb-4" />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-xl text-foreground">Generating your quiz...</p>
        <p className="text-sm text-muted-foreground">This may take a moment.</p>
      </main>
    );
  }
  
  return (
    <main className="flex-grow flex flex-col items-center justify-center p-4 md:p-8 bg-background">
      <div className="container mx-auto">
        {quizState === 'upload' && (
          <QuizUpload 
            onQuizLoad={handleQuizLoad} 
            onGenerateQuiz={handleGenerateQuizAndStart}
            suggestedFormat={SUGGESTED_JSON_FORMAT} 
          />
        )}
        {quizState === 'active' && quizMode === 'exam' && currentQuestionData && quizData && (
          <QuestionDisplay
            key={currentQuestionData.id} 
            question={currentQuestionData}
            questionNumber={currentQuestionIndex + 1}
            totalQuestions={quizData.questions.length}
            timeLimit={timePerQuestion} // This will be 0 for generated quizzes if not set otherwise
            onNext={handleNextQuestion}
          />
        )}
        {quizState === 'active' && quizMode === 'study' && quizData && (
          <StudyModeDisplay 
            quizData={quizData} 
            onExitStudyMode={handleRestart} 
          />
        )}
        {quizState === 'results' && quizResult && (
          <QuizResults result={quizResult} onRestart={handleRestart} />
        )}
      </div>
    </main>
  );
}
