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

    // Use the provider as a function to get the model for the chatflowId
    const model = flowise(process.env.FLOWISE_CHATFLOW_ID!)

    const result = streamText({
        model,
        messages
    })

    return result.toTextStreamResponse()
}
