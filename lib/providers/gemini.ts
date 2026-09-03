// Gemini prompt-gen per the gemini-api-dev skill: @google/genai interactions
// API, gemini-3.8-flash, structured JSON output parsed through output_text.
import { GoogleGenAI } from "@google/genai";

export const GEMINI_MODEL = "gemini-3.8-flash";

const SCHEMA = {
  type: "object",
  properties: { prompts: { type: "array", items: { type: "string" } } },
  required: ["prompts"],
} as const;

export interface PromptGen {
  promptPhrases(domain: string): Promise<unknown>;
}

export function livePromptGen(apiKey: string): PromptGen {
  const client = new GoogleGenAI({ apiKey });
  return {
    async promptPhrases(domain: string): Promise<unknown> {
      const interaction = await client.interactions.create({
        model: GEMINI_MODEL,
        input: `List exactly 10 buyer search prompts a customer would google when shopping for the SaaS at ${domain}. Short queries a buyer types, not questions. Reply JSON only.`,
        response_format: { type: "text", mime_type: "application/json", schema: SCHEMA },
      });
      const parsed = JSON.parse(interaction.output_text ?? "null") as { prompts?: unknown };
      return parsed?.prompts;
    },
  };
}
