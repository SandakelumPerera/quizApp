
import type React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react'; // Added useRef
import type { Question } from '@/types/quiz';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TimerIcon } from 'lucide-react';

interface QuestionDisplayProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  timeLimit: number; // in seconds
  onNext: (selectedAnswers: number[], timeTaken: number) => void;
}

export function QuestionDisplay({
  question,
  questionNumber,
  totalQuestions,
  timeLimit,
  onNext,
}: QuestionDisplayProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState<number>(timeLimit);
  
  const startTimeRef = useRef<number>(0);
  const selectedAnswersRef = useRef<number[]>(selectedAnswers);

  useEffect(() => {
    selectedAnswersRef.current = selectedAnswers;
  }, [selectedAnswers]);

  useEffect(() => {
    setTimeLeft(timeLimit);
    setSelectedAnswers([]); 
    selectedAnswersRef.current = []; 
    startTimeRef.current = Date.now(); 

    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timer);
          const timeTaken = Math.round((Date.now() - startTimeRef.current) / 1000);
          onNext(selectedAnswersRef.current, Math.min(timeTaken, timeLimit)); 
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [question, timeLimit, onNext]);


  const handleSingleSelect = (value: string) => {
    setSelectedAnswers([parseInt(value, 10)]);
  };

  const handleMultiSelect = (index: number) => {
    setSelectedAnswers((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const handleSubmit = useCallback(() => {
    const timeTaken = Math.round((Date.now() - startTimeRef.current) / 1000);
    onNext(selectedAnswers, Math.min(timeTaken, timeLimit));
  }, [onNext, selectedAnswers, timeLimit]);


  const progressPercentage = (timeLeft / timeLimit) * 100;

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl animate-fade-in">
      <CardHeader>
        <div className="flex justify-between items-center mb-2">
            <CardDescription>
            Question {questionNumber} of {totalQuestions}
            </CardDescription>
            <div className="flex items-center text-lg font-medium text-primary">
                <TimerIcon className="mr-2 h-5 w-5" />
                <span>{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}</span>
            </div>
        </div>
        <Progress value={progressPercentage} className="w-full h-2 [&>div]:bg-accent" />
        <CardTitle className="text-2xl mt-4 font-headline">{question.questionText}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {question.isMultipleChoice ? (
          <div className="space-y-3">
            {question.options.map((option, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 border rounded-md hover:bg-muted/50 transition-colors">
                <Checkbox
                  id={`option-${index}`}
                  checked={selectedAnswers.includes(index)}
                  onCheckedChange={() => handleMultiSelect(index)}
                  aria-label={option}
                />
                <Label htmlFor={`option-${index}`} className="text-base cursor-pointer flex-1">
                  {option}
                </Label>
              </div>
            ))}
          </div>
        ) : (
          <RadioGroup
            onValueChange={handleSingleSelect}
            value={selectedAnswers.length > 0 ? String(selectedAnswers[0]) : ''}
            className="space-y-3"
          >
            {question.options.map((option, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 border rounded-md hover:bg-muted/50 transition-colors">
                <RadioGroupItem value={String(index)} id={`option-${index}`} aria-label={option}/>
                <Label htmlFor={`option-${index}`} className="text-base cursor-pointer flex-1">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={handleSubmit} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" size="lg">
          {questionNumber === totalQuestions ? 'Submit Quiz' : 'Next Question'}
        </Button>
      </CardFooter>
    </Card>
  );
}
