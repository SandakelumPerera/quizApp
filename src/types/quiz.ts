export interface Question {
  id: string;
  questionText: string;
  options: string[];
  correctAnswers: number[]; // 0-based indices of correct options
  isMultipleChoice: boolean;
  explanation?: string;
}

export interface QuizData {
  title?: string;
  questions: Question[];
}

export interface UserAnswer {
  questionId: string;
  questionText: string; // For easier display in results
  options: string[]; // For easier display in results
  selectedAnswers: number[];
  correctAnswers: number[];
  timeTaken: number; // in seconds
  isCorrect: boolean;
  isPartiallyCorrect?: boolean;
  wasSkipped?: boolean; // True if time ran out or user skipped
}

export interface QuizResult {
  score: number;
  totalQuestions: number;
  answers: UserAnswer[];
  totalTimeTaken: number;
}

export type QuizState = 'upload' | 'active' | 'results';
