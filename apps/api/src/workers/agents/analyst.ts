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
    confidence: number
}

export async function runAnalyst(data: {
    concept: string
    strategyOutput: StrategistOutput
    rejectionFeedback?: string
}): Promise<AnalystOutput> {
    const systemPrompt = `You are a senior Business Analyst and product designer specializing in SaaS products. You've shipped products used by millions of people and know how to translate a business strategy into clear, actionable requirements.

Your output will be reviewed by both technical developers AND non-technical founders, so describe user needs in plain human language. Avoid technical jargon in persona descriptions and user stories.

CRITICAL: Respond ONLY with valid JSON. No markdown. No preamble. JSON only.

At the end of your JSON response, always include a "confidence" field (integer 0–100) representing how confident you are in the quality and completeness of your output. Base it on: clarity of the input concept, completeness of your analysis, and assumptions you had to make. 100 = very clear brief, strong output. Below 50 = vague input or significant assumptions made.`

    const userPrompt = `Transform this approved strategy into detailed product requirements.

Original Concept: "${data.concept}"

Approved Strategy:
- Target audience: ${data.strategyOutput.targetAudience}
- Must-have features: ${data.strategyOutput.mvpFeatures.filter(f => f.priority === 'MUST').map(f => f.name).join(', ')}
- Monetization: ${data.strategyOutput.monetizationStrategy}
- Key differentiators: ${data.strategyOutput.marketDifferentiators.slice(0, 3).join('; ')}

${data.rejectionFeedback ? `⚠️ Previous output was rejected — feedback: "${data.rejectionFeedback}"\nAddress this directly in your response.` : ''}

Create vivid, realistic personas based on the target audience. Write user stories as a product manager would — focus on the WHY, not just the what.

Return JSON with EXACTLY this structure:
{
  "userPersonas": [
    {
      "name": "A real-sounding full name (e.g. 'Sarah Chen')",
      "role": "Their specific job title and context (e.g. 'Freelance UX Designer, 8 years experience, 6 active clients')",
      "painPoints": ["Specific frustration with current tools or workflows", "Another real pain point"],
      "goals": ["What they want to achieve (outcome, not feature)", "Another goal"]
    }
  ],
  "coreUserStories": [
    {
      "asA": "specific persona type (e.g. 'freelance designer')",
      "iWantTo": "do a specific action (be concrete)",
      "soThat": "achieve a meaningful outcome",
      "acceptanceCriteria": ["Observable thing that must be true when done", "Another criterion"]
    }
  ],
  "dataEntities": [
    {
      "name": "EntityName (PascalCase)",
      "fields": [{ "name": "fieldName", "type": "String | Int | Boolean | DateTime | Float | Json" }],
      "relations": ["EntityName has many OtherEntity", "EntityName belongs to AnotherEntity"]
    }
  ],
  "integrations": ["Stripe (payments)", "SendGrid (email)", "Add others relevant to this product"]
}

Rules:
- userPersonas: 2-3 distinct, realistic personas with specific details
- coreUserStories: 6-10 stories covering the most important workflows
- dataEntities: 4-7 entities covering core domain objects (include id, createdAt on each)
- integrations: Only include integrations this product genuinely needs`

    const raw = await gradientClient.chat({ systemPrompt, userPrompt, maxTokens: 3000, temperature: 0.5 })
    return gradientClient.parseJSON<AnalystOutput>(raw)
}
