import { gradientClient } from '../../lib/gradient'
import type { StrategistOutput } from './strategist'

export interface AnalystOutput {
    userPersonas: Array<{
        name: string
        role: string
        painPoints: string[]
        goals: string[]
    }>
    coreUserStories: Array<{
        asA: string
        iWantTo: string
        soThat: string
        acceptanceCriteria: string[]
    }>
    dataEntities: Array<{
        name: string
        fields: Array<{ name: string; type: string }>
        relations: string[]
    }>
    integrations: string[]
}

export async function runAnalyst(data: {
    concept: string
    strategyOutput: StrategistOutput
    rejectionFeedback?: string
}): Promise<AnalystOutput> {
    const systemPrompt = `You are the Business Analyst agent for a software agency incubation platform.
You translate approved strategic analysis into concrete technical product requirements.
CRITICAL: Respond ONLY with valid JSON. No markdown. No preamble. JSON only.`

    const userPrompt = `Convert this approved strategy into technical product requirements.

Original Concept: "${data.concept}"

Approved Strategy:
${JSON.stringify(data.strategyOutput, null, 2)}

${data.rejectionFeedback ? `Previous output was rejected: "${data.rejectionFeedback}"\nAddress this in your response.` : ''}

Return JSON with EXACTLY this structure:
{
  "userPersonas": [
    {
      "name": "Persona name",
      "role": "Their job/role",
      "painPoints": ["pain 1", "pain 2"],
      "goals": ["goal 1", "goal 2"]
    }
  ],
  "coreUserStories": [
    {
      "asA": "persona type",
      "iWantTo": "action",
      "soThat": "benefit",
      "acceptanceCriteria": ["criteria 1", "criteria 2"]
    }
  ],
  "dataEntities": [
    {
      "name": "EntityName",
      "fields": [{ "name": "fieldName", "type": "String | Int | Boolean | DateTime | Float" }],
      "relations": ["EntityName has many OtherEntity"]
    }
  ],
  "integrations": ["Stripe", "SendGrid", "etc"]
}

Include 2-3 personas, 5-8 user stories, 4-7 data entities.`

    const raw = await gradientClient.chat({ systemPrompt, userPrompt, maxTokens: 2500 })
    return gradientClient.parseJSON<AnalystOutput>(raw)
}
