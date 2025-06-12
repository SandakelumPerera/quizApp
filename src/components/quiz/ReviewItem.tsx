
import type React from 'react';
import type { UserAnswer } from '@/types/quiz';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, AlertTriangle, Trash2 } from 'lucide-react';

interface ReviewItemProps {
  userAnswer: UserAnswer;
  onDoneReviewing: () => void; // Changed from (questionId: string) => void
}

export function ReviewItem({ userAnswer, onDoneReviewing }: ReviewItemProps) {
  const getOptionText = (index: number) => userAnswer.options[index] || `Option ${index + 1}`;

  return (
    <Card className="border-2 border-muted animate-fade-in">
      <CardHeader>
        <CardTitle className="text-lg font-headline">{userAnswer.questionText}</CardTitle>
        {userAnswer.wasSkipped && (
            <CardDescription className="flex items-center text-destructive">
                <AlertTriangle className="h-4 w-4 mr-1" /> Skipped (Time ran out or no answer submitted)
            </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <p className="font-semibold mb-1">Your Answer(s):</p>
          {userAnswer.selectedAnswers.length > 0 ? (
            <ul className="list-disc list-inside pl-4">
              {userAnswer.selectedAnswers.map((ansIndex) => (
                <li key={ansIndex} className={`flex items-center ${userAnswer.correctAnswers.includes(ansIndex) ? 'text-green-600' : 'text-destructive'}`}>
                  {userAnswer.correctAnswers.includes(ansIndex) ? <CheckCircle className="h-4 w-4 mr-2"/> : <XCircle className="h-4 w-4 mr-2"/>}
                  {getOptionText(ansIndex)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground italic">{userAnswer.wasSkipped ? 'Not answered' : 'No answer selected'}</p>
          )}
        </div>
        <div>
          <p className="font-semibold mb-1">Correct Answer(s):</p>
          <ul className="list-disc list-inside pl-4 text-green-700">
            {userAnswer.correctAnswers.map((ansIndex) => (
              <li key={ansIndex} className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-2"/>
                {getOptionText(ansIndex)}
              </li>
            ))}
          </ul>
        </div>
        {userAnswer.isPartiallyCorrect && !userAnswer.isCorrect && (
            <p className="text-orange-600 font-medium">Your answer was partially correct.</p>
        )}
      </CardContent>
      <CardFooter>
        <Button
          variant="outline"
          size="sm"
          onClick={onDoneReviewing} // Changed from onClick={() => onDoneReviewing(userAnswer.questionId)}
          className="ml-auto border-primary text-primary hover:bg-primary/10"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Done Reviewing this Question
        </Button>
      </CardFooter>
    </Card>
  );
}
