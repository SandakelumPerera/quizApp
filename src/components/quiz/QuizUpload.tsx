
import type React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UploadCloud, Info, BookOpen, Edit3, Sparkles, FileText, Image as ImageIcon, ListPlus } from 'lucide-react';
import type { QuizData } from '@/types/quiz';
import type { GenerateQuizInput } from '@/ai/flows/generate-quiz-flow';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

type QuizMode = 'exam' | 'study';
type UploadMode = 'file' | 'generate';

interface QuizUploadProps {
  onQuizLoad: (quizData: QuizData, mode: QuizMode, timePerQuestion?: number) => void;
  onGenerateQuiz: (generationInput: GenerateQuizInput, mode: QuizMode) => Promise<void>;
  suggestedFormat: string;
}

const timerOptions = Array.from({ length: 12 }, (_, i) => 60 + i * 5); // 1:00 to 1:55 in 5s intervals
timerOptions.unshift(30); // Add 30 seconds option
timerOptions.unshift(0); // Add 'No time limit' option
timerOptions.sort((a, b) => a - b);

const numQuestionsOptions = [1, 2, 3, 4, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50];

export function QuizUpload({ onQuizLoad, onGenerateQuiz, suggestedFormat }: QuizUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [timePerQuestionFile, setTimePerQuestionFile] = useState<number>(timerOptions[2]);
  const [error, setError] = useState<string | null>(null);
  const [quizMode, setQuizMode] = useState<QuizMode>('exam');
  const [uploadMode, setUploadMode] = useState<UploadMode>('file');

  const [materialText, setMaterialText] = useState<string>("");
  const [materialImages, setMaterialImages] = useState<File[]>([]);
  const [numGeneratedQuestions, setNumGeneratedQuestions] = useState<number>(5);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFile(event.target.files[0]);
      setError(null);
    }
  };

  const handleImageFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const filesArray = Array.from(event.target.files);
      if (filesArray.length > 5) { 
        toast({variant: 'destructive', title: 'Too many images', description: 'Please select up to 5 images.'});
        setMaterialImages(filesArray.slice(0,5));
        event.target.value = ''; 
      } else {
        setMaterialImages(filesArray);
      }
    }
  };

  const handleSubmitFile = async () => {
    if (!file) {
      setError('Please upload a JSON file.');
      return;
    }
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') {
          throw new Error('Failed to read file content.');
        }
        const jsonData = JSON.parse(text) as QuizData;
        if (!jsonData.title || typeof jsonData.title !== 'string') {
          throw new Error('Invalid quiz format: "title" is missing or not a string.');
        }
        if (!jsonData.questions || !Array.isArray(jsonData.questions) || jsonData.questions.length === 0) {
          throw new Error('Invalid quiz format: "questions" array is missing, not an array, or empty.');
        }
        jsonData.questions.forEach((q, index) => {
          if (!q.id || typeof q.id !== 'string' ||
              !q.questionText || typeof q.questionText !== 'string' ||
              !q.options || !Array.isArray(q.options) || q.options.length < 2 || q.options.some(opt => typeof opt !== 'string') ||
              !q.correctAnswers || !Array.isArray(q.correctAnswers) || q.correctAnswers.length === 0 || q.correctAnswers.some(ans => typeof ans !== 'number' || ans < 0 || ans >= q.options.length) ||
              typeof q.isMultipleChoice !== 'boolean'
          ) {
            throw new Error(`Invalid format for question at index ${index}. Check ID, text, options (min 2), correctAnswers (valid indices), and isMultipleChoice.`);
          }
          if (q.isMultipleChoice === false && q.correctAnswers.length > 1) {
            throw new Error(`Question at index ${index} is single choice but has multiple correct answers.`);
          }
        });
        onQuizLoad(jsonData, quizMode, quizMode === 'exam' ? timePerQuestionFile : undefined);
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

  const handleGenerateAndStart = async () => {
    setError(null);
    if (!materialText && materialImages.length === 0) {
      setError("Please provide some study material (text or images).");
      return;
    }
    if (numGeneratedQuestions <= 0) {
      setError("Number of questions must be positive.");
      return;
    }

    const imagePromises = materialImages.map(imgFile => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
          } else {
            reject(new Error('Failed to read image as data URL.'));
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(imgFile);
      });
    });

    try {
      const imageDataUris = await Promise.all(imagePromises);
      const generationInput: GenerateQuizInput = {
        materialText: materialText || undefined,
        materialImages: imageDataUris.length > 0 ? imageDataUris : undefined,
        numberOfQuestions: numGeneratedQuestions,
      };
      await onGenerateQuiz(generationInput, quizMode); 
    } catch (readError) {
       console.error("Error reading images:", readError);
       setError(readError instanceof Error ? readError.message : "Error processing images.");
    }
  };
  
  const selectedTimerOptionFile = timerOptions.find(t => t === timePerQuestionFile) ?? timerOptions[2];

  return (
    <Card className="w-full max-w-lg mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl text-center font-headline">QuizMaster AI</CardTitle>
        <CardDescription className="text-center">
          Choose your method: Upload a JSON quiz or generate one with AI.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs value={uploadMode} onValueChange={(value) => setUploadMode(value as UploadMode)} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="file">
              <UploadCloud className="mr-2 h-4 w-4" /> Upload JSON
            </TabsTrigger>
            <TabsTrigger value="generate">
              <Sparkles className="mr-2 h-4 w-4" /> Generate with AI
            </TabsTrigger>
          </TabsList>
          <TabsContent value="file" className="pt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quiz-file" className="flex items-center">
                Quiz JSON File
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="ml-2 h-4 w-4 cursor-help text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs text-sm p-2 bg-popover text-popover-foreground shadow-md rounded-md border">
                      <p className="font-medium mb-1">Suggested JSON Format:</p>
                      <pre className="text-xs bg-muted p-2 rounded-sm overflow-x-auto whitespace-pre-wrap">{suggestedFormat}</pre>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <Input id="quiz-file" type="file" accept=".json" onChange={handleFileChange} className="file:text-primary file:font-medium"/>
              </div>
            </div>
             <div className="space-y-2">
                <Label htmlFor="time-limit-file">Time per Question (Exam Mode)</Label>
                <Select value={String(selectedTimerOptionFile)} onValueChange={(value) => setTimePerQuestionFile(Number(value))} disabled={quizMode === 'study'}>
                  <SelectTrigger id="time-limit-file" disabled={quizMode === 'study'}>
                    <SelectValue placeholder="Select time limit" />
                  </SelectTrigger>
                  <SelectContent>
                    {timerOptions.map((time) => (
                      <SelectItem key={time} value={String(time)}>
                        {time === 0 ? 'No timer per question' : `${Math.floor(time / 60)}:${String(time % 60).padStart(2, '0')} min`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
          </TabsContent>
          <TabsContent value="generate" className="pt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="material-text">Study Text (Optional)</Label>
               <Textarea 
                id="material-text" 
                placeholder="Paste your study text here. For PDFs, please copy and paste the content. More text helps generate better questions."
                value={materialText}
                onChange={(e) => setMaterialText(e.target.value)}
                rows={6}
                className="bg-background border-input focus:ring-ring"
              />
            </div>
            <div className="space-y-2">
                <Label htmlFor="material-images">Study Images (Optional, max 5)</Label>
                <div className="flex items-center space-x-2">
                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    <Input 
                        id="material-images" 
                        type="file" 
                        accept="image/*" 
                        multiple 
                        onChange={handleImageFilesChange} 
                        className="file:text-primary file:font-medium"
                    />
                </div>
                {materialImages.length > 0 && (
                    <div className="text-xs text-muted-foreground pt-1">Selected {materialImages.length} image(s).</div>
                )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="num-questions">Number of Questions to Generate (max 50)</Label>
               <Select value={String(numGeneratedQuestions)} onValueChange={(value) => setNumGeneratedQuestions(Number(value))}>
                <SelectTrigger id="num-questions">
                  <SelectValue placeholder="Select number of questions" />
                </SelectTrigger>
                <SelectContent>
                  {numQuestionsOptions.map((num) => (
                    <SelectItem key={num} value={String(num)}>
                      {num} Questions
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
             <p className="text-xs text-muted-foreground">
                Note: For AI generated quizzes in Exam Mode, there is no timer per question by default.
             </p>
          </TabsContent>
        </Tabs>

        <div className="space-y-3">
          <Label>Mode Selection</Label>
          <div className="flex items-center justify-between p-3 border rounded-md">
            <div className='flex items-center'>
              <Edit3 className={`mr-2 h-5 w-5 ${quizMode === 'exam' ? 'text-primary' : 'text-muted-foreground'}`} />
              <Label htmlFor="mode-switch" className={`${quizMode === 'exam' ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                Exam Mode
              </Label>
            </div>
            <Switch
              id="mode-switch"
              checked={quizMode === 'study'}
              onCheckedChange={(checked) => setQuizMode(checked ? 'study' : 'exam')}
              aria-label="Toggle between Exam and Study mode"
            />
            <div className='flex items-center'>
              <Label htmlFor="mode-switch" className={`mr-2 ${quizMode === 'study' ? 'text-accent font-semibold' : 'text-muted-foreground'}`}>
                Study Mode
              </Label>
              <BookOpen className={`h-5 w-5 ${quizMode === 'study' ? 'text-accent' : 'text-muted-foreground'}`} />
            </div>
          </div>
        </div>
        
        {error && <p className="text-sm text-destructive text-center py-2">{error}</p>}

      </CardContent>
      <CardFooter>
        {uploadMode === 'file' ? (
            <Button onClick={handleSubmitFile} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" size="lg" disabled={!file}>
            {quizMode === 'exam' ? 'Start Exam from File' : 'Start Studying from File'}
            </Button>
        ) : (
            <Button onClick={handleGenerateAndStart} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" size="lg" disabled={!materialText && materialImages.length === 0}>
                <ListPlus className="mr-2 h-5 w-5" />
                {quizMode === 'exam' ? 'Generate & Start Exam' : 'Generate & Study'}
            </Button>
        )}
      </CardFooter>
    </Card>
  );
}

    