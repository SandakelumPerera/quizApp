
'use client';

import { useState, useCallback, useMemo } from 'react';
import type { QuizData, Question, UserAnswer, QuizResult, QuizState } from '@/types/quiz';
import { QuizUpload } from '@/components/quiz/QuizUpload';
import { QuestionDisplay } from '@/components/quiz/QuestionDisplay';
import { QuizResults } from '@/components/quiz/QuizResults';
import { StudyModeDisplay } from '@/components/quiz/StudyModeDisplay';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";
import { Loader2, BrainCircuit, Download } from 'lucide-react';
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
    // For AI generation, ensure at least 5 options.
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

  const handleQuizLoad = useCallback((loadedQuizData: QuizData, mode: QuizMode, timeLimitPerQuestion?: number) => {
    setQuizData(loadedQuizData);
    setQuizMode(mode);
    if (mode === 'exam') {
      // For file uploads, use the passed timeLimitPerQuestion (which comes from QuizUpload's select)
      // For AI generated quizzes, timeLimitPerQuestion will be undefined, so QuestionDisplay defaults to 0 (no timer)
      setTimePerQuestion(typeof timeLimitPerQuestion === 'number' ? timeLimitPerQuestion : 0);
      setCurrentQuestionIndex(0);
      setUserAnswers([]);
    }
    setQuizResult(null);
    setQuizState('active');
    toast({ title: mode === 'exam' ? "Quiz Ready!" : "Study Mode Activated!", description: loadedQuizData.title || (mode === 'exam' ? "Good luck!" : "Happy studying!") });
  }, [toast]);


  const handleGenerateQuizAndStart = useCallback(async (generationInput: GenerateQuizInput, mode: QuizMode) => {
    setQuizState('generating');
    try {
      const generatedData = await generateQuiz(generationInput);
      if (!generatedData || !generatedData.questions || generatedData.questions.length === 0) {
        toast({ variant: "destructive", title: "Generation Failed", description: "The AI could not generate a quiz from the provided material. Please try refining your input or try again." });
        setQuizState('upload');
        return;
      }
      // For AI generated quizzes, we pass undefined for timeLimitPerQuestion to handleQuizLoad.
      // handleQuizLoad will then set timePerQuestion to 0 for exam mode.
      handleQuizLoad(generatedData, mode, undefined); 
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
    setQuizMode('exam'); // Default to exam mode on restart
    setQuizData(null);
    setCurrentQuestionIndex(0);
    setUserAnswers([]);
    setQuizResult(null);
  }, []);

  const handleExportQuiz = useCallback(() => {
    if (!quizData) {
      toast({ variant: "destructive", title: "No Quiz Data", description: "Cannot export an empty quiz." });
      return;
    }
    try {
      const jsonString = JSON.stringify(quizData, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const fileName = `${quizData.title.replace(/\s+/g, '_') || 'quiz'}_export.json`;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: "Quiz Exported!", description: `${fileName} downloaded successfully.` });
    } catch (error) {
      console.error("Error exporting quiz:", error);
      toast({ variant: "destructive", title: "Export Failed", description: "Could not export the quiz." });
    }
  }, [quizData, toast]);

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
        <p className="mt-4 text-xl text-foreground">Generating your challenging quiz...</p>
        <p className="text-sm text-muted-foreground">This may take a moment.</p>
      </main>
    );
  }
  
  return (
    <main className="flex-grow flex flex-col items-center justify-center p-4 md:p-8 bg-background">
       {quizData && (quizState === 'active' || quizState === 'results') && (
        <div className="fixed top-4 right-4 z-50">
          <Button onClick={handleExportQuiz} variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export Quiz
          </Button>
        </div>
      )}
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
            timeLimit={timePerQuestion} 
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

    