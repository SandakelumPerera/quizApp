
'use server';
/**
 * @fileOverview A Genkit flow for generating quiz questions from study material.
 *
 * - generateQuiz - A function that handles quiz generation.
 * - GenerateQuizInput - The input type for the generateQuiz function.
 * - QuizData - The Zod schema for the output (matches QuizData type).
 */

import {ai} from '@/ai/genkit';
import { z } from 'genkit';
import type { QuizData, Question } from '@/types/quiz';

const QuestionSchema = z.object({
  id: z.string().describe('A unique identifier for the question (e.g., "q1", "q2").'),
  questionText: z.string().describe('The text of the question.'),
  options: z.array(z.string()).min(2).describe('An array of possible answer strings.'),
  correctAnswers: z.array(z.number().int()).min(1).describe('An array of 0-based indices corresponding to the correct option(s) in the options array.'),
  isMultipleChoice: z.boolean().describe('True if multiple options can be correct, false otherwise.'),
  explanation: z.string().optional().describe('An optional explanation for the answer.'),
});

const QuizDataSchema = z.object({
  title: z.string().describe('A suitable title for the generated quiz.'),
  questions: z.array(QuestionSchema).min(1).describe('An array of quiz questions.'),
});
// Ensure QuizData type matches the schema for type safety. This is an internal check.
type InferredQuizData = z.infer<typeof QuizDataSchema>;
const assertQuizData: InferredQuizData = {} as QuizData;


const GenerateQuizInputSchema = z.object({
  materialText: z.string().optional().describe('Textual study material.'),
  materialImages: z.array(z.string().url()).optional().describe('Array of image data URIs for study material. Each URI must include a MIME type and use Base64 encoding. Expected format: "data:<mimetype>;base64,<encoded_data>".'),
  numberOfQuestions: z.number().int().positive().min(1).max(20).describe('The desired number of questions to generate.'),
});
export type GenerateQuizInput = z.infer<typeof GenerateQuizInputSchema>;
// Export QuizData type, not the schema directly from a 'use server' file if not an async function.
export type { QuizData };


export async function generateQuiz(input: GenerateQuizInput): Promise<QuizData> {
  return generateQuizFlow(input);
}

const generateQuizFlow = ai.defineFlow(
  {
    name: 'generateQuizFlow',
    inputSchema: GenerateQuizInputSchema,
    outputSchema: QuizDataSchema,
  },
  async (input) => {
    const promptSegments: Array<{ text: string } | { media: { url: string } }> = [];

    promptSegments.push({
      text: `You are an expert quiz generation assistant. Your task is to create a quiz based on the provided study material.
Generate exactly ${input.numberOfQuestions} unique and relevant questions.
The quiz must have an overall "title".
Each question must have a unique "id" (e.g., "q1", "q2", ...), "questionText", an array of at least two "options", an array of "correctAnswers" (0-based indices of the correct options), "isMultipleChoice" (boolean), and an optional "explanation" for the answer.
Ensure the generated output is a single, valid JSON object that strictly adheres to the provided output schema.
Do not include any markdown formatting (e.g., \`\`\`json) around the JSON output.
---
Study Material:
`});

    if (input.materialText && input.materialText.trim().length > 0) {
      promptSegments.push({ text: `Textual Content:\n${input.materialText}\n\n` });
    }

    if (input.materialImages && input.materialImages.length > 0) {
      promptSegments.push({ text: "Image Content:\n" });
      for (const imageUrl of input.materialImages) {
        // Validate if it's a data URI before pushing
        if (imageUrl.startsWith('data:image/')) {
          promptSegments.push({ media: { url: imageUrl } });
          promptSegments.push({ text: "\n" }); // Add a newline after each image for clarity in the prompt
        }
      }
      promptSegments.push({ text: "\n" });
    }
    
    promptSegments.push({ text: "---End of Study Material--- \n Generate the quiz now." });

    if (promptSegments.length <= 2 && !(input.materialText && input.materialText.trim().length > 0) && !(input.materialImages && input.materialImages.length > 0)) {
      throw new Error("No study material provided. Please provide either text or images.");
    }

    const llmResponse = await ai.generate({
      prompt: promptSegments,
      output: { schema: QuizDataSchema },
      config: { temperature: 0.4 }, // Adjust temperature for creativity vs. determinism
    });

    const quizData = llmResponse.output;
    if (!quizData) {
      throw new Error('AI failed to generate quiz data in the expected format.');
    }
    return quizData;
  }
);

