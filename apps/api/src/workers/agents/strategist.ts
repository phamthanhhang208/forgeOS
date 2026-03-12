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
    pricingTiers: Array<{
        name: string
        price: string
        description: string
    }>
    marketDifferentiators: string[]
    competitorLandscape: string
    riskFactors: string[]
    successMetrics: string[]
    confidence: number
}

export async function runStrategist(data: {
    agencyId: string
    concept: string
    rejectionFeedback?: string
}): Promise<StrategistOutput> {
    const ragContext = await getRAGContext(data.agencyId, data.concept)

    const systemPrompt = `You are a world-class SaaS product strategist with 15 years of experience launching B2B and B2C software products. You have helped founders define product-market fit for companies like Notion, Linear, and Loom.

Your job is to analyze a raw SaaS concept and produce a focused, actionable strategic brief. Write in plain business language — specific and concrete, never generic.

CRITICAL: Respond ONLY with valid JSON matching the exact schema. No markdown, no explanation. Pure JSON only.

At the end of your JSON response, always include a "confidence" field (integer 0–100) representing how confident you are in the quality and completeness of your output. Base it on: clarity of the input concept, completeness of your analysis, and assumptions you had to make. 100 = very clear brief, strong output. Below 50 = vague input or significant assumptions made.`

    const userPrompt = `Analyze this SaaS concept and return a strategic analysis as JSON.

Concept: "${data.concept}"

${ragContext ? `Context from similar past projects:\n${ragContext}\n` : ''}
${data.rejectionFeedback ? `⚠️ Previous output was rejected — feedback: "${data.rejectionFeedback}"\nDirectly address this in your new response.` : ''}

Think carefully about:
- Who will actually pay for this today (not hypothetically)
- The one core problem being solved — be ruthlessly specific
- What makes someone switch from their current solution
- Realistic SaaS pricing tiers that match the value delivered
- Honest, specific risks (not generic market risks)

Return JSON with EXACTLY this structure (no extra fields):
{
  "targetAudience": "One sentence naming the primary paying customer with specifics (e.g. 'Independent freelance designers managing 3-10 clients simultaneously')",
  "audienceSegments": ["Specific segment with detail (e.g. 'Solo freelancers earning $50-150K/year')", "Segment 2", "Segment 3"],
  "mvpFeatures": [
    { "name": "Feature name in plain English", "priority": "MUST", "rationale": "Why this is the absolute minimum for launch" },
    { "name": "Feature name", "priority": "SHOULD", "rationale": "Why add in first 3 months post-launch" },
    { "name": "Feature name", "priority": "COULD", "rationale": "Nice to have, adds polish" }
  ],
  "monetizationStrategy": "2-3 sentences: the pricing model, why it fits this audience, and the key conversion lever",
  "pricingTiers": [
    { "name": "Starter", "price": "$29/month", "description": "Who it's for and what's included" },
    { "name": "Pro", "price": "$79/month", "description": "Who it's for and what's included" }
  ],
  "marketDifferentiators": ["Specific advantage vs a named competitor (e.g. 'Unlike Trello, built specifically for...')", "Advantage 2", "Advantage 3"],
  "competitorLandscape": "2-3 sentences naming real competing tools and the gap this product fills that they miss",
  "riskFactors": ["Specific risk with a suggested mitigation (e.g. 'Low switching costs — mitigate by...')", "Risk 2", "Risk 3"],
  "successMetrics": ["Concrete measurable goal (e.g. '100 paying customers within 6 months')", "Metric 2", "Metric 3"]
}

Rules:
- mvpFeatures: 4-6 items (mix of MUST/SHOULD/COULD)
- pricingTiers: 2-3 tiers with realistic SaaS price points
- marketDifferentiators: 3-4 specific advantages, not vague claims
- riskFactors: 3-5 honest risks
- successMetrics: 3-4 concrete, measurable goals with timeframes`

    const raw = await gradientClient.chat({ systemPrompt, userPrompt, maxTokens: 2500, temperature: 0.5 })
    return gradientClient.parseJSON<StrategistOutput>(raw)
}
