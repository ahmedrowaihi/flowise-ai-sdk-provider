import { streamText } from 'ai'
import { createFlowiseProvider } from '../../src/flowise-provider'

const flowise = createFlowiseProvider({
    baseUrl: process.env.FLOWISE_BASE_URL || 'http://localhost:3000',
    apiKey: process.env.FLOWISE_API_KEY
})

// Allow streaming responses up to 30 seconds
export const maxDuration = 30

export async function POST(req: Request) {
    const { messages } = await req.json()

    if (!process.env.FLOWISE_CHATFLOW_ID) {
        throw new Error('Missing FLOWISE_CHATFLOW_ID environment variable')
    }

    const result = streamText({
        model: flowise(process.env.FLOWISE_CHATFLOW_ID!),
        messages
    })

    return result.toDataStreamResponse()
}
