
import type React from 'react';
import { useState, useCallback } from 'react';
import type { QuizResult, UserAnswer } from '@/types/quiz';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ReviewItem } from './ReviewItem';
import { formatTime } from '@/lib/utils';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface QuizResultsProps {
  result: QuizResult;
  onRestart: () => void;
}

export function QuizResults({ result, onRestart }: QuizResultsProps) {
  const [allReviewableAnswers, setAllReviewableAnswers] = useState<UserAnswer[]>(
    result.answers.filter(answer => !answer.isCorrect || answer.wasSkipped)
  );
  const [currentReviewIndex, setCurrentReviewIndex] = useState<number>(0);

  const currentReviewableQuestion = allReviewableAnswers.length > 0 ? allReviewableAnswers[currentReviewIndex] : null;

  const handleDoneReviewingCurrent = useCallback(() => {
    if (!currentReviewableQuestion) return;

    const newReviewableAnswers = allReviewableAnswers.filter(
      (answer) => answer.questionId !== currentReviewableQuestion.questionId
    );
    setAllReviewableAnswers(newReviewableAnswers);

    if (newReviewableAnswers.length === 0) {
      setCurrentReviewIndex(0);
    } else if (currentReviewIndex >= newReviewableAnswers.length) {
      setCurrentReviewIndex(newReviewableAnswers.length - 1);
    }
    // If currentReviewIndex is still valid, the new item at this index will be displayed
  }, [allReviewableAnswers, currentReviewIndex, currentReviewableQuestion]);

  const totalTimeFormatted = formatTime(result.totalTimeTaken);

  const goToPreviousReview = () => {
    setCurrentReviewIndex(prev => Math.max(0, prev - 1));
  };

  const goToNextReview = () => {
    setCurrentReviewIndex(prev => Math.min(allReviewableAnswers.length - 1, prev + 1));
  };

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-xl animate-fade-in">
      <CardHeader className="text-center">
        <CardTitle className="text-4xl font-headline">Quiz Completed!</CardTitle>
        <CardDescription className="text-lg">Here's how you did:</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <Card className="p-4 bg-card shadow-md">
            <p className="text-sm text-muted-foreground">Your Score</p>
            <p className="text-3xl font-bold text-primary">
              {result.score} / {result.totalQuestions}
            </p>
          </Card>
          <Card className="p-4 bg-card shadow-md">
            <p className="text-sm text-muted-foreground">Accuracy</p>
            <p className="text-3xl font-bold text-primary">
              {result.totalQuestions > 0 ? ((result.score / result.totalQuestions) * 100).toFixed(1) : 0}%
            </p>
          </Card>
          <Card className="p-4 bg-card shadow-md">
            <p className="text-sm text-muted-foreground">Total Time</p>
            <p className="text-3xl font-bold text-primary">
              {totalTimeFormatted}
            </p>
          </Card>
        </div>

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="time-details">
            <AccordionTrigger className="text-xl font-headline text-primary hover:text-primary/90">Time Spent Per Question</AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-2 mt-2 max-h-60 overflow-y-auto">
                {result.answers.map((answer, index) => (
                  <TooltipProvider key={answer.questionId} delayDuration={100}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Card className="p-3 text-center cursor-default shadow-sm hover:shadow-md transition-shadow bg-card">
                          <p className="text-xs text-muted-foreground">Q{index + 1}</p>
                          <p className="font-medium text-sm text-card-foreground">{formatTime(answer.timeTaken)}</p>
                        </Card>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-sm p-2 bg-popover text-popover-foreground shadow-md rounded-md border">
                        <p className="font-semibold text-base mb-1">Question {index + 1}:</p>
                        <p className="text-sm">{answer.questionText}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {currentReviewableQuestion && (
          <div className="mt-6">
            <h3 className="text-2xl font-headline text-center my-4 text-primary">Review Your Answers</h3>
            <div className="relative">
              <ReviewItem
                userAnswer={currentReviewableQuestion}
                onDoneReviewing={handleDoneReviewingCurrent}
              />
              {allReviewableAnswers.length > 1 && (
                <div className="flex justify-between items-center mt-4 px-2">
                  <Button
                    onClick={goToPreviousReview}
                    disabled={currentReviewIndex === 0}
                    variant="outline"
                    className="text-primary border-primary hover:bg-primary/10"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {currentReviewIndex + 1} of {allReviewableAnswers.length}
                  </span>
                  <Button
                    onClick={goToNextReview}
                    disabled={currentReviewIndex === allReviewableAnswers.length - 1}
                    variant="outline"
                    className="text-primary border-primary hover:bg-primary/10"
                  >
                    Next <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
        {allReviewableAnswers.length === 0 && result.answers.some(a => !a.isCorrect || a.wasSkipped) && (
           <p className="text-center text-muted-foreground mt-4">You've reviewed all incorrect/skipped questions!</p>
        )}

      </CardContent>
      <CardFooter>
        <Button onClick={onRestart} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" size="lg">
          Take Another Quiz
        </Button>
      </CardFooter>
    </Card>
  );
}
