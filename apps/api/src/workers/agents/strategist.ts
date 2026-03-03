import { gradientClient } from '../../lib/gradient'
import { getRAGContext } from '../rag'

export interface StrategistOutput {
    targetAudience: string
    audienceSegments: string[]
    mvpFeatures: Array<{
        name: string
        priority: 'MUST' | 'SHOULD' | 'COULD'
        rationale: string
    }>
    monetizationStrategy: string
    marketDifferentiators: string[]
    riskFactors: string[]
}

export async function runStrategist(data: {
    agencyId: string
    concept: string
    rejectionFeedback?: string
}): Promise<StrategistOutput> {
    const ragContext = await getRAGContext(data.agencyId, data.concept)

    const systemPrompt = `You are the Strategist agent for a software agency incubation platform.
Your role is to analyze a raw SaaS concept and produce a focused strategic analysis.
You have access to context from this agency's past successful projects.

CRITICAL: Respond ONLY with valid JSON matching the exact schema provided. No markdown, no explanation, no preamble. Just the JSON object.`

    const userPrompt = `Analyze this SaaS concept and return strategic analysis JSON.

Concept: "${data.concept}"

Agency's past similar projects for context:
${ragContext}

${data.rejectionFeedback ? `IMPORTANT - Previous output was rejected with this feedback: "${data.rejectionFeedback}"\nAddress this feedback directly in your new response.` : ''}

Return JSON with EXACTLY this structure:
{
  "targetAudience": "string describing primary target customer",
  "audienceSegments": ["segment 1", "segment 2", "segment 3"],
  "mvpFeatures": [
    { "name": "Feature name", "priority": "MUST", "rationale": "Why this is critical for MVP" }
  ],
  "monetizationStrategy": "string describing pricing/revenue model",
  "marketDifferentiators": ["differentiator 1", "differentiator 2"],
  "riskFactors": ["risk 1", "risk 2", "risk 3"]
}

Include 4-6 MVP features, 2-4 differentiators, 3-5 risks.`

    const raw = await gradientClient.chat({ systemPrompt, userPrompt, maxTokens: 2000 })
    return gradientClient.parseJSON<StrategistOutput>(raw)
}
