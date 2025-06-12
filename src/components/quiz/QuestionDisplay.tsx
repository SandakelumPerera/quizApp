
import type React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import type { Question } from '@/types/quiz';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TimerIcon, PauseCircle, PlayCircle } from 'lucide-react';

interface QuestionDisplayProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  timeLimit: number; // in seconds, 0 means no timer
  onNext: (selectedAnswers: number[], timeTaken: number) => void;
}

interface ShuffledOption {
  text: string;
  originalIndex: number;
}

function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export function QuestionDisplay({
  question,
  questionNumber,
  totalQuestions,
  timeLimit,
  onNext,
}: QuestionDisplayProps) {
  const [shuffledOptionsData, setShuffledOptionsData] = useState<ShuffledOption[]>([]);
  const [selectedShuffledIndices, setSelectedShuffledIndices] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState<number>(timeLimit);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const startTimeRef = useRef<number>(0);
  const pauseStartTimeRef = useRef<number>(0);
  const totalPausedDurationRef = useRef<number>(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const selectedShuffledIndicesRef = useRef<number[]>(selectedShuffledIndices);

  useEffect(() => {
    selectedShuffledIndicesRef.current = selectedShuffledIndices;
  }, [selectedShuffledIndices]);

  // Effect to initialize question, shuffle options, reset states
  useEffect(() => {
    const optionsWithOriginalIndices = question.options.map((optionText, index) => ({
      text: optionText,
      originalIndex: index,
    }));
    setShuffledOptionsData(shuffleArray(optionsWithOriginalIndices));
    setSelectedShuffledIndices([]);
    selectedShuffledIndicesRef.current = [];
    
    setTimeLeft(timeLimit);
    startTimeRef.current = Date.now();
    totalPausedDurationRef.current = 0;
    pauseStartTimeRef.current = 0;
    setIsPaused(false); // Auto unpause if new question loads

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [question, timeLimit]);

  // Effect for managing the timer interval
  useEffect(() => {
    if (timeLimit === 0 || isPaused || timeLeft <= 0) {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      return;
    }

    timerIntervalRef.current = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          
          const endTime = Date.now();
          let rawElapsed = (endTime - startTimeRef.current) / 1000;
          let currentPauseSegmentDuration = 0; // Timer expires while running, so no current pause segment
          let activeTime = rawElapsed - totalPausedDurationRef.current;
          activeTime = Math.max(0, activeTime);
          if (timeLimit > 0) activeTime = Math.min(activeTime, timeLimit);

          const originalSelectedIndices = selectedShuffledIndicesRef.current.map(
            (shuffledIdx) => {
                const option = shuffledOptionsData[shuffledIdx];
                return option ? option.originalIndex : -1;
            }
          ).filter(idx => idx !== -1);
          onNext(originalSelectedIndices, Math.round(activeTime));
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isPaused, timeLeft, timeLimit, onNext, question.id, shuffledOptionsData]);


  const handleOptionSelect = (selectedIndexInShuffledArray: number) => {
    if (isPaused) return;
    if (question.isMultipleChoice) {
      setSelectedShuffledIndices((prevSelected) => {
        const newSelected = prevSelected.includes(selectedIndexInShuffledArray)
          ? prevSelected.filter((i) => i !== selectedIndexInShuffledArray)
          : [...prevSelected, selectedIndexInShuffledArray];
        return newSelected;
      });
    } else {
      setSelectedShuffledIndices((prevSelected) => {
        if (prevSelected.includes(selectedIndexInShuffledArray)) {
          return []; 
        } else {
          return [selectedIndexInShuffledArray]; 
        }
      });
    }
  };

  const handleSubmit = useCallback(() => {
    if (isPaused) return;
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    const endTime = Date.now();
    let rawElapsed = (endTime - startTimeRef.current) / 1000;
    // If it was paused when submitted, the current pause segment is not added to totalPausedDuration yet
    // but it doesn't matter as we are calculating active time directly.
    let activeTime = rawElapsed - totalPausedDurationRef.current;
    activeTime = Math.max(0, activeTime);
     if (timeLimit > 0) activeTime = Math.min(activeTime, timeLimit);
     else if (timeLimit === 0) activeTime = 0; // No timer means time taken is conceptually 0 for this metric

    const originalSelectedIndices = selectedShuffledIndices.map(
      (shuffledIdx) => shuffledOptionsData[shuffledIdx].originalIndex
    );
    
    onNext(originalSelectedIndices, Math.round(activeTime));
  }, [isPaused, selectedShuffledIndices, shuffledOptionsData, onNext, timeLimit, question.isMultipleChoice]);

  const handlePauseToggle = () => {
    setIsPaused((prevPaused) => {
      if (!prevPaused) { // Pausing
        pauseStartTimeRef.current = Date.now();
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
        }
      } else { // Resuming
        if (pauseStartTimeRef.current > 0) {
          totalPausedDurationRef.current += (Date.now() - pauseStartTimeRef.current);
        }
        pauseStartTimeRef.current = 0;
        // Timer will be restarted by the useEffect watching `isPaused` and `timeLeft`
      }
      return !prevPaused;
    });
  };

  const progressPercentage = timeLimit > 0 ? (timeLeft / timeLimit) * 100 : 100;

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl animate-fade-in">
      <CardHeader>
        <div className="flex justify-between items-center mb-2">
            <CardDescription>
            Question {questionNumber} of {totalQuestions}
            </CardDescription>
            <div className="flex items-center space-x-2">
                {timeLimit > 0 && (
                <div className="flex items-center text-lg font-medium text-primary">
                    <TimerIcon className="mr-2 h-5 w-5" />
                    <span>{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}</span>
                </div>
                )}
                {timeLimit > 0 && (
                    <Button onClick={handlePauseToggle} variant="outline" size="icon" className="h-8 w-8">
                        {isPaused ? <PlayCircle className="h-4 w-4" /> : <PauseCircle className="h-4 w-4" />}
                        <span className="sr-only">{isPaused ? 'Resume' : 'Pause'}</span>
                    </Button>
                )}
            </div>
        </div>
        {timeLimit > 0 && <Progress value={progressPercentage} className="w-full h-2 [&>div]:bg-accent" />}
        <CardTitle className="text-2xl mt-4 font-headline">{question.questionText}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isPaused ? (
            <div className="text-center py-10">
                <PauseCircle className="mx-auto h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-semibold text-foreground">Quiz Paused</h3>
                <Button onClick={handlePauseToggle} className="mt-6 bg-primary hover:bg-primary/90">
                    <PlayCircle className="mr-2 h-5 w-5" /> Resume Quiz
                </Button>
            </div>
        ) : (
            <div className="space-y-3">
            {shuffledOptionsData.map((optionData, shuffledIndex) => (
                <div key={`${question.id}-option-${optionData.originalIndex}`} className="flex items-center space-x-3 p-3 border rounded-md hover:bg-muted/50 transition-colors">
                <Checkbox
                    id={`option-${question.id}-${shuffledIndex}`}
                    checked={selectedShuffledIndices.includes(shuffledIndex)}
                    onCheckedChange={() => handleOptionSelect(shuffledIndex)}
                    aria-label={optionData.text}
                    disabled={isPaused}
                />
                <Label htmlFor={`option-${question.id}-${shuffledIndex}`} className="text-base cursor-pointer flex-1">
                    {optionData.text}
                </Label>
                </div>
            ))}
            </div>
        )}
      </CardContent>
      {!isPaused && (
        <CardFooter>
            <Button onClick={handleSubmit} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" size="lg" disabled={isPaused}>
            {questionNumber === totalQuestions ? 'Submit Quiz' : 'Next Question'}
            </Button>
        </CardFooter>
      )}
    </Card>
  );
}

    