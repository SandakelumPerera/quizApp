import type React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadCloud, Info } from 'lucide-react';
import type { QuizData } from '@/types/quiz';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface QuizUploadProps {
  onQuizStart: (quizData: QuizData, timePerQuestion: number) => void;
  suggestedFormat: string;
}

const timerOptions = Array.from({ length: 13 }, (_, i) => 60 + i * 5); // 1:00 to 2:00 in 5s intervals

export function QuizUpload({ onQuizStart, suggestedFormat }: QuizUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [timePerQuestion, setTimePerQuestion] = useState<number>(timerOptions[0]);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFile(event.target.files[0]);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      setError('Please upload a JSON file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') {
          throw new Error('Failed to read file content.');
        }
        const jsonData = JSON.parse(text) as QuizData;
        // Basic validation
        if (!jsonData.questions || !Array.isArray(jsonData.questions) || jsonData.questions.length === 0) {
          throw new Error('Invalid quiz format: "questions" array is missing, not an array, or empty.');
        }
        jsonData.questions.forEach((q, index) => {
          if (!q.id || typeof q.id !== 'string' ||
              !q.questionText || typeof q.questionText !== 'string' ||
              !q.options || !Array.isArray(q.options) || q.options.some(opt => typeof opt !== 'string') ||
              !q.correctAnswers || !Array.isArray(q.correctAnswers) || q.correctAnswers.some(ans => typeof ans !== 'number') ||
              typeof q.isMultipleChoice !== 'boolean'
          ) {
            throw new Error(`Invalid format for question at index ${index}.`);
          }
        });
        onQuizStart(jsonData, timePerQuestion);
      } catch (err) {
        console.error("Error parsing JSON or validating quiz data:", err);
        setError(err instanceof Error ? err.message : 'Invalid JSON file or format.');
      }
    };
    reader.onerror = () => {
      setError('Failed to read the file.');
    };
    reader.readAsText(file);
  };

  return (
    <Card className="w-full max-w-lg mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl text-center font-headline">QuizJSON</CardTitle>
        <CardDescription className="text-center">
          Upload your quiz in JSON format to begin.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="quiz-file" className="flex items-center">
            Quiz JSON File
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="ml-2 h-4 w-4 cursor-help text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs text-sm p-2 bg-popover text-popover-foreground shadow-md rounded-md">
                  <p className="font-medium mb-1">Suggested JSON Format:</p>
                  <pre className="text-xs bg-muted p-2 rounded-sm overflow-x-auto whitespace-pre-wrap">{suggestedFormat}</pre>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
          <div className="flex items-center space-x-2">
            <UploadCloud className="h-5 w-5 text-muted-foreground" />
            <Input id="quiz-file" type="file" accept=".json" onChange={handleFileChange} className="file:text-primary file:font-medium"/>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="time-limit">Time per Question</Label>
          <Select value={String(timePerQuestion)} onValueChange={(value) => setTimePerQuestion(Number(value))}>
            <SelectTrigger id="time-limit">
              <SelectValue placeholder="Select time limit" />
            </SelectTrigger>
            <SelectContent>
              {timerOptions.map((time) => (
                <SelectItem key={time} value={String(time)}>
                  {Math.floor(time / 60)}:{String(time % 60).padStart(2, '0')} minutes
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button onClick={handleSubmit} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" size="lg">
          Start Quiz
        </Button>
      </CardContent>
    </Card>
  );
}
