
import type React from 'react';
import type { Question } from '@/types/quiz';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Circle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface FlashcardItemProps {
  question: Question;
}

export function FlashcardItem({ question }: FlashcardItemProps) {
  return (
    <Card className="border-none shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl font-semibold">{question.questionText}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Options:</p>
          {question.options.map((option, index) => (
            <div
              key={index}
              className={`flex items-center space-x-2 p-2 rounded-md border ${
                question.correctAnswers.includes(index)
                  ? 'border-green-500 bg-green-500/10'
                  : 'border-border'
              }`}
            >
              {question.correctAnswers.includes(index) ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground" />
              )}
              <span className={`${question.correctAnswers.includes(index) ? 'font-medium text-green-700' : ''}`}>{option}</span>
            </div>
          ))}
        </div>

        {question.explanation && (
          <>
            <Separator />
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Explanation:</p>
              <p className="text-sm p-2 bg-muted/50 rounded-md">{question.explanation}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
