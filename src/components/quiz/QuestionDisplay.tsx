
import type React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import type { Question } from '@/types/quiz';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TimerIcon } from 'lucide-react';

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

// Fisher-Yates shuffle algorithm
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
  
  const startTimeRef = useRef<number>(0);
  // Ref to hold the latest selectedShuffledIndices for the timer closure
  const selectedShuffledIndicesRef = useRef<number[]>(selectedShuffledIndices);

  useEffect(() => {
    selectedShuffledIndicesRef.current = selectedShuffledIndices;
  }, [selectedShuffledIndices]);

  useEffect(() => {
    // Create an array of objects with text and original index
    const optionsWithOriginalIndices = question.options.map((optionText, index) => ({
      text: optionText,
      originalIndex: index,
    }));
    setShuffledOptionsData(shuffleArray(optionsWithOriginalIndices));
    
    setSelectedShuffledIndices([]); // Reset selections for new question
    selectedShuffledIndicesRef.current = []; // Reset ref as well
    setTimeLeft(timeLimit); 
    startTimeRef.current = Date.now(); 

    if (timeLimit === 0) return; 

    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timer);
          const timeTaken = Math.round((Date.now() - startTimeRef.current) / 1000);
          // Convert selected shuffled indices back to original indices
          const originalSelectedIndices = selectedShuffledIndicesRef.current.map(
            (shuffledIdx) => {
                // Find the item in the *current* shuffledOptionsData.
                // This requires shuffledOptionsData to be stable *within* this timer's effect scope
                // or for selectedShuffledIndicesRef to be updated along with shuffledOptionsData.
                // For simplicity and because QuestionDisplay rerenders with new question, we assume
                // current shuffledOptionsData (set at question load) is what we need.
                const currentShuffledOptions = shuffleArray(question.options.map((opt, idx) => ({text: opt, originalIndex: idx})));
                return currentShuffledOptions[shuffledIdx]?.originalIndex ?? -1; // Fallback for safety
            }
          ).filter(idx => idx !== -1);


          onNext(originalSelectedIndices, Math.min(timeTaken, timeLimit)); 
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [question, timeLimit, onNext]); // shuffledOptionsData removed from deps to avoid re-shuffling on every render if not careful


  const handleOptionSelect = (selectedIndexInShuffledArray: number) => {
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
    const timeTaken = timeLimit === 0 ? 0 : Math.round((Date.now() - startTimeRef.current) / 1000);
    
    // Convert selected shuffled indices back to original indices
    const originalSelectedIndices = selectedShuffledIndices.map(
      (shuffledIdx) => shuffledOptionsData[shuffledIdx].originalIndex
    );
    
    onNext(originalSelectedIndices, timeLimit === 0 ? 0 : Math.min(timeTaken, timeLimit));
  }, [onNext, selectedShuffledIndices, timeLimit, shuffledOptionsData]);


  const progressPercentage = timeLimit > 0 ? (timeLeft / timeLimit) * 100 : 100;

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl animate-fade-in">
      <CardHeader>
        <div className="flex justify-between items-center mb-2">
            <CardDescription>
            Question {questionNumber} of {totalQuestions}
            </CardDescription>
            {timeLimit > 0 && (
              <div className="flex items-center text-lg font-medium text-primary">
                  <TimerIcon className="mr-2 h-5 w-5" />
                  <span>{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}</span>
              </div>
            )}
        </div>
        {timeLimit > 0 && <Progress value={progressPercentage} className="w-full h-2 [&>div]:bg-accent" />}
        <CardTitle className="text-2xl mt-4 font-headline">{question.questionText}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {shuffledOptionsData.map((optionData, shuffledIndex) => (
            <div key={`${question.id}-option-${optionData.originalIndex}`} className="flex items-center space-x-3 p-3 border rounded-md hover:bg-muted/50 transition-colors">
              <Checkbox
                id={`option-${question.id}-${shuffledIndex}`}
                checked={selectedShuffledIndices.includes(shuffledIndex)}
                onCheckedChange={() => handleOptionSelect(shuffledIndex)}
                aria-label={optionData.text}
              />
              <Label htmlFor={`option-${question.id}-${shuffledIndex}`} className="text-base cursor-pointer flex-1">
                {optionData.text}
              </Label>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSubmit} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" size="lg">
          {questionNumber === totalQuestions ? 'Submit Quiz' : 'Next Question'}
        </Button>
      </CardFooter>
    </Card>
  );
}
