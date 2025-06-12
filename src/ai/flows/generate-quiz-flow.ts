
'use server';
/**
 * @fileOverview A Genkit flow for generating quiz questions from study material.
 *
 * - generateQuiz - A function that handles quiz generation.
 * - GenerateQuizInput - The input type for the generateQuiz function.
 * - QuizData - The type for the output (matches QuizData type).
 */

import {ai} from '@/ai/genkit';
import { z } from 'genkit';
import type { QuizData } from '@/types/quiz'; // Keep QuizData type for return type

const QuestionSchema = z.object({
  id: z.string().describe('A unique identifier for the question (e.g., "q1", "q2").'),
  questionText: z.string().describe('The text of the question.'),
  options: z.array(z.string()).min(5).describe('An array of at least 5 possible answer strings. The order of these options should be randomized.'),
  correctAnswers: z.array(z.number().int()).min(1).max(5).describe('An array of 0-based indices corresponding to the correct option(s) in the options array. If isMultipleChoice is false, this array must contain exactly one index. If isMultipleChoice is true, this array can contain up to 5 indices.'),
  isMultipleChoice: z.boolean().describe('True if multiple options can be correct, false otherwise.'),
  explanation: z.string().optional().describe('An optional explanation for the answer.'),
});

const QuizDataSchemaInternal = z.object({
  title: z.string().describe('A suitable title for the generated quiz.'),
  questions: z.array(QuestionSchema).min(1).describe('An array of quiz questions.'),
});


const GenerateQuizInputSchema = z.object({
  materialText: z.string().optional().describe('Textual study material.'),
  materialImages: z.array(z.string().url()).optional().describe('Array of image data URIs for study material. Each URI must include a MIME type and use Base64 encoding. Expected format: "data:<mimetype>;base64,<encoded_data>".'),
  numberOfQuestions: z.number().int().positive().min(1).max(50).describe('The desired number of questions to generate (up to 50).'),
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
    outputSchema: QuizDataSchemaInternal, // Use internal schema for flow definition
  },
  async (input) => {
    const promptSegments: Array<{ text: string } | { media: { url: string } }> = [];

    promptSegments.push({
      text: `You are an expert quiz generation assistant. Your primary goal is to generate challenging and engaging quiz questions based on the provided study material.
Generate exactly ${input.numberOfQuestions} unique and relevant questions.
The quiz must have an overall "title".
Each question must have a unique "id" (e.g., "q1", "q2", ...), and "questionText".
Each question must feature at least five distinct answer "options". The "options" array should have its items presented in a randomized order for each question to prevent users from guessing based on patterns.
The "correctAnswers" array must contain 0-based indices of the correct option(s). If "isMultipleChoice" is false, this array must contain exactly one index. If "isMultipleChoice" is true, this array can contain one to five indices.
"isMultipleChoice" must be a boolean indicating if multiple options can be correct.
Include an optional "explanation" for the answer where appropriate.
Ensure the difficulty level of the questions is high to challenge the user.
The generated output must be a single, valid JSON object that strictly adheres to the provided output schema.
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
        if (imageUrl.startsWith('data:image/')) {
          promptSegments.push({ media: { url: imageUrl } });
          promptSegments.push({ text: "\n" });
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
      output: { schema: QuizDataSchemaInternal }, // Use internal schema for generation
      config: { 
        temperature: 0.6, // Slightly higher temperature for more varied/challenging questions
        safetySettings: [ // Adjust safety settings if needed for broader content generation
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        ]
      }, 
    });

    const quizData = llmResponse.output;
    if (!quizData) {
      throw new Error('AI failed to generate quiz data in the expected format.');
    }
    // Add validation for correctAnswers length based on isMultipleChoice
    quizData.questions.forEach(q => {
        if (!q.isMultipleChoice && q.correctAnswers.length !== 1) {
            throw new Error(`Question "${q.questionText}" is single-choice but does not have exactly one correct answer.`);
        }
        if (q.isMultipleChoice && (q.correctAnswers.length === 0 || q.correctAnswers.length > 5)) {
            throw new Error(`Multiple-choice question "${q.questionText}" must have between 1 and 5 correct answers.`);
        }
        if (q.options.length < 5) {
            throw new Error(`Question "${q.questionText}" must have at least 5 options.`);
        }
    });
    return quizData;
  }
);

    