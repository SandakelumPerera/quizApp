import type React from 'react';
import { useState } from 'react';
import type { QuizResult, UserAnswer, Question as QuestionType } from '@/types/quiz';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ReviewItem } from './ReviewItem';
import { formatTime } from '@/lib/utils'; // Assume formatTime is created in utils

interface QuizResultsProps {
  result: QuizResult;
  onRestart: () => void;
}

export function QuizResults({ result, onRestart }: QuizResultsProps) {
  const [reviewableAnswers, setReviewableAnswers] = useState<UserAnswer[]>(
    result.answers.filter(answer => !answer.isCorrect || answer.wasSkipped)
  );

  const handleDoneReviewing = (questionId: string) => {
    setReviewableAnswers(prev => prev.filter(answer => answer.questionId !== questionId));
  };

  const totalTimeFormatted = formatTime(result.totalTimeTaken);

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
              <ul className="space-y-2 mt-2 max-h-60 overflow-y-auto p-1">
                {result.answers.map((answer, index) => (
                  <li key={answer.questionId} className="flex justify-between p-2 border rounded-md text-sm">
                    <span>Question {index + 1}:</span>
                    <span className="font-medium">{formatTime(answer.timeTaken)}</span>
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {reviewableAnswers.length > 0 && (
          <div>
            <h3 className="text-2xl font-headline text-center my-4 text-primary">Review Your Answers</h3>
            <div className="space-y-4 max-h-[calc(100vh-400px)] overflow-y-auto p-1">
              {reviewableAnswers.map((answer) => (
                <ReviewItem
                  key={answer.questionId}
                  userAnswer={answer}
                  onDoneReviewing={handleDoneReviewing}
                />
              ))}
            </div>
          </div>
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
