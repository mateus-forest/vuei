import OpenAI from "openai"

let openaiClient: OpenAI | null = null

export function getOpenAIServerClient() {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new Error("OpenAI env var is missing. Configure OPENAI_API_KEY.")
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey })
  }

  return openaiClient
}
