const BASE_URL = 'https://inference.do-ai.run/v1'
const CHAT_MODEL = 'meta-llama/Meta-Llama-3.1-8B-Instruct'
const EMBED_MODEL = 'BAAI/bge-small-en-v1.5'
const MAX_RETRIES = 3

interface GradientChatOptions {
    systemPrompt: string
    userPrompt: string
    maxTokens?: number
    temperature?: number
}

interface GradientEmbedOptions {
    texts: string[]
}

function getApiKey(): string {
    const key = process.env.DO_GRADIENT_API_KEY
    if (!key) throw new Error('DO_GRADIENT_API_KEY is not set')
    return key
}

function stripMarkdownFences(content: string): string {
    return content
        .replace(/^```json\n?/, '')
        .replace(/\n?```$/, '')
        .trim()
}

async function fetchWithRetry(
    url: string,
    options: RequestInit,
    retries = MAX_RETRIES
): Promise<Response> {
    for (let attempt = 1; attempt <= retries; attempt++) {
        const res = await fetch(url, options)

        if (res.ok) return res

        if ((res.status === 429 || res.status >= 500) && attempt < retries) {
            const delay = Math.pow(2, attempt) * 500
            console.warn(`[Gradient] ${res.status} on attempt ${attempt}, retrying in ${delay}ms...`)
            await new Promise((r) => setTimeout(r, delay))
            continue
        }

        const body = await res.text()
        throw new Error(`Gradient API error ${res.status}: ${body}`)
    }

    throw new Error('Gradient API: max retries exceeded')
}

async function chat(options: GradientChatOptions): Promise<string> {
    const { systemPrompt, userPrompt, maxTokens = 2000, temperature = 0.7 } = options

    const res = await fetchWithRetry(`${BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getApiKey()}`,
        },
        body: JSON.stringify({
            model: CHAT_MODEL,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            max_tokens: maxTokens,
            temperature,
            stream: false,
        }),
    })

    const data = await res.json()
    const content: string = data.choices?.[0]?.message?.content ?? ''
    return stripMarkdownFences(content)
}

async function embed(options: GradientEmbedOptions): Promise<number[][]> {
    const { texts } = options

    const res = await fetchWithRetry(`${BASE_URL}/embeddings`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getApiKey()}`,
        },
        body: JSON.stringify({
            model: EMBED_MODEL,
            input: texts,
        }),
    })

    const data = await res.json()
    const embeddings: number[][] = data.data.map(
        (item: { embedding: number[] }) => item.embedding
    )

    // L2 normalize each vector
    return embeddings.map((vec) => {
        const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0))
        if (norm === 0) return vec
        return vec.map((v) => v / norm)
    })
}

function parseJSON<T>(rawContent: string): T {
    const cleaned = stripMarkdownFences(rawContent)
    try {
        return JSON.parse(cleaned) as T
    } catch (err) {
        console.error('[Gradient] Failed to parse JSON. Raw content:', rawContent)
        throw new Error(`Failed to parse AI response as JSON: ${(err as Error).message}`)
    }
}

export const gradientClient = { chat, embed, parseJSON }
