
import type React from 'react';
import { useState, useCallback } from 'react';
import type { QuizData } from '@/types/quiz';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, XSquare } from 'lucide-react';
import { FlashcardItem } from './FlashcardItem';

interface StudyModeDisplayProps {
  quizData: QuizData;
  onExitStudyMode: () => void;
}

export function StudyModeDisplay({ quizData, onExitStudyMode }: StudyModeDisplayProps) {
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);

  const totalCards = quizData.questions.length;
  const currentQuestion = quizData.questions[currentCardIndex];

  const goToPreviousCard = useCallback(() => {
    setCurrentCardIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const goToNextCard = useCallback(() => {
    setCurrentCardIndex((prev) => Math.min(totalCards - 1, prev + 1));
  }, [totalCards]);

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center space-y-6 animate-fade-in">
      <Card className="w-full shadow-xl">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl font-headline">Study Mode: {quizData.title || "Quiz"}</CardTitle>
            <Button variant="ghost" size="icon" onClick={onExitStudyMode} aria-label="Exit Study Mode">
              <XSquare className="h-6 w-6 text-muted-foreground hover:text-destructive" />
            </Button>
          </div>
          <CardDescription>
            Question {currentCardIndex + 1} of {totalCards}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentQuestion && <FlashcardItem question={currentQuestion} />}
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="flex justify-between items-center w-full">
            <Button
              onClick={goToPreviousCard}
              disabled={currentCardIndex === 0}
              variant="outline"
              className="text-primary border-primary hover:bg-primary/10"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              {currentCardIndex + 1} / {totalCards}
            </span>
            <Button
              onClick={goToNextCard}
              disabled={currentCardIndex === totalCards - 1}
              variant="outline"
              className="text-primary border-primary hover:bg-primary/10"
            >
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
