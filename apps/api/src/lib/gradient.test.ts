/**
 * Isolated test for the DO Gradient API client.
 * Run with: tsx apps/api/src/lib/gradient.test.ts
 * Requires DO_GRADIENT_API_KEY env var.
 */
import 'dotenv/config'
import { gradientClient } from './gradient'

async function testChat() {
    console.log('--- Testing chat() ---')
    const result = await gradientClient.chat({
        systemPrompt: 'Respond ONLY with valid JSON. No markdown. No preamble.',
        userPrompt: 'Return a JSON object with a single key "test" set to true.',
        maxTokens: 100,
        temperature: 0.1,
    })

    console.log('Raw result:', result)
    const parsed = gradientClient.parseJSON<{ test: boolean }>(result)
    console.log('Parsed:', parsed)

    if (parsed.test !== true) {
        throw new Error(`Expected { test: true }, got ${JSON.stringify(parsed)}`)
    }
    console.log('✅ chat() test passed\n')
}

async function testEmbed() {
    console.log('--- Testing embed() ---')
    const texts = ['Hello world', 'Machine learning is awesome']
    const embeddings = await gradientClient.embed({ texts })

    console.log(`Got ${embeddings.length} embeddings`)
    console.log(`Embedding dimensions: ${embeddings[0].length}`)

    if (embeddings.length !== 2) {
        throw new Error(`Expected 2 embeddings, got ${embeddings.length}`)
    }
    if (embeddings[0].length !== 768) {
        throw new Error(`Expected 768 dimensions, got ${embeddings[0].length}`)
    }

    // Verify L2 normalization (magnitude should be ~1)
    const magnitude = Math.sqrt(embeddings[0].reduce((sum, v) => sum + v * v, 0))
    console.log(`First vector magnitude: ${magnitude.toFixed(4)} (should be ~1.0)`)

    if (Math.abs(magnitude - 1.0) > 0.01) {
        throw new Error(`Vector not properly normalized: magnitude = ${magnitude}`)
    }
    console.log('✅ embed() test passed\n')
}

async function main() {
    if (!process.env.DO_GRADIENT_API_KEY) {
        console.log('⚠️  DO_GRADIENT_API_KEY not set — skipping Gradient API tests')
        return
    }

    try {
        await testChat()
        await testEmbed()
        console.log('🎉 All Gradient API tests passed!')
    } catch (err) {
        console.error('❌ Test failed:', err)
        process.exit(1)
    }
}

main()
