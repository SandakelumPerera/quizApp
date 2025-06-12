
import type React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadCloud, Info, BookOpen, Edit3 } from 'lucide-react';
import type { QuizData } from '@/types/quiz';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";

type QuizMode = 'exam' | 'study';

interface QuizUploadProps {
  onQuizStart: (quizData: QuizData, timePerQuestion: number, mode: QuizMode) => void;
  suggestedFormat: string;
}

const timerOptions = Array.from({ length: 13 }, (_, i) => 60 + i * 5); // 1:00 to 2:00 in 5s intervals

export function QuizUpload({ onQuizStart, suggestedFormat }: QuizUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [timePerQuestion, setTimePerQuestion] = useState<number>(timerOptions[0]);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<QuizMode>('exam');

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
        onQuizStart(jsonData, timePerQuestion, mode);
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
          Upload your quiz in JSON format and choose your mode.
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

        <div className="space-y-3">
          <Label>Mode Selection</Label>
          <div className="flex items-center justify-between p-3 border rounded-md">
            <div className='flex items-center'>
              <Edit3 className={`mr-2 h-5 w-5 ${mode === 'exam' ? 'text-primary' : 'text-muted-foreground'}`} />
              <Label htmlFor="mode-switch" className={`${mode === 'exam' ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                Exam Mode
              </Label>
            </div>
            <Switch
              id="mode-switch"
              checked={mode === 'study'}
              onCheckedChange={(checked) => setMode(checked ? 'study' : 'exam')}
              aria-label="Toggle between Exam and Study mode"
            />
            <div className='flex items-center'>
              <Label htmlFor="mode-switch" className={`mr-2 ${mode === 'study' ? 'text-accent font-semibold' : 'text-muted-foreground'}`}>
                Study Mode
              </Label>
              <BookOpen className={`h-5 w-5 ${mode === 'study' ? 'text-accent' : 'text-muted-foreground'}`} />
            </div>
          </div>
        </div>

        {mode === 'exam' && (
          <div className="space-y-2 animate-fade-in">
            <Label htmlFor="time-limit">Time per Question (Exam Mode)</Label>
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
        )}

        {error && <p className="text-sm text-destructive text-center">{error}</p>}

        <Button onClick={handleSubmit} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" size="lg">
          {mode === 'exam' ? 'Start Exam' : 'Start Studying'}
        </Button>
      </CardContent>
    </Card>
  );
}
