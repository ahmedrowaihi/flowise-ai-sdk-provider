import { createFlowiseProvider, createFlowiseModel } from '../src'

// Helper to get required env vars
function getEnv(name: 'FLOWISE_BASE_URL' | 'FLOWISE_API_KEY' | 'FLOWISE_CHATFLOW_ID'): string {
    const value = process.env[name]
    if (!value) {
        console.error(`Missing required environment variable: ${name}`)
        process.exit(1)
    }
    return value
}

const BASE_URL = getEnv('FLOWISE_BASE_URL')
const API_KEY = getEnv('FLOWISE_API_KEY')
const CHATFLOW_ID = getEnv('FLOWISE_CHATFLOW_ID')

// Example usage of the Flowise AI SDK Provider
async function basicExample() {
    const flowise = createFlowiseProvider({
        baseUrl: BASE_URL,
        apiKey: API_KEY
    })
    try {
        const response = await flowise.client.createPrediction({
            chatflowId: CHATFLOW_ID,
            question: 'Write a short story about a robot learning to cook.',
            chatId: 'session-123',
            streaming: false
        })
        console.log('Generated text:', response.text)
        console.log('Chat ID:', response.chatId)
        console.log('Message ID:', response.chatMessageId)
    } catch (error) {
        console.error('Error generating text:', error)
    }
}

async function customConfigExample() {
    const flowise = createFlowiseProvider({
        baseUrl: BASE_URL,
        apiKey: API_KEY
    })
    try {
        const response = await flowise.client.createPrediction({
            chatflowId: CHATFLOW_ID,
            question: 'What is the weather like?',
            chatId: 'weather-session',
            overrideConfig: {
                sessionId: 'weather-session',
                temperature: 0.7,
                maxTokens: 500
            },
            streaming: false
        })
        console.log('Response with custom config:', response.text)
        if (response.sourceDocuments) {
            console.log('Source Documents:', response.sourceDocuments.length)
        }
        if (response.usedTools) {
            console.log('Used Tools:', response.usedTools.length)
        }
    } catch (error) {
        console.error('Error:', error)
    }
}

async function streamingExample() {
    const flowise = createFlowiseProvider({
        baseUrl: BASE_URL,
        apiKey: API_KEY
    })
    try {
        console.log('Attempting streaming request...')
        console.log('Base URL:', BASE_URL)
        console.log('Chatflow ID:', CHATFLOW_ID)
        const stream = await flowise.client.createPrediction({
            chatflowId: CHATFLOW_ID,
            question: 'Tell me a joke',
            chatId: 'stream-session',
            streaming: true
        })
        console.log('Stream created successfully, reading...')
        let result = ''
        let chunkCount = 0
        for await (const value of stream) {
            chunkCount++
            // Print the chunk for debugging
            console.log(`Chunk ${chunkCount}:`, JSON.stringify(value, null, 2))
            if (value && typeof value === 'object') {
                if (value.event === 'token' && value.data) {
                    result += value.data
                    process.stdout.write(value.data)
                } else if (value.event === 'end') {
                    console.log('Stream ended, total chunks received:', chunkCount)
                } else if (value.event === 'metadata') {
                    console.log('Metadata received:', value.data)
                } else if (value.event === 'sourceDocuments') {
                    console.log('Source documents:', value.data)
                } else if (value.event === 'usedTools') {
                    console.log('Used tools:', value.data)
                } else if (value.event === 'agentReasoning') {
                    console.log('Agent reasoning:', value.data)
                } else {
                    // Fallback for unknown chunk types
                    console.log('Unknown chunk:', value)
                }
            } else if (value && typeof value === 'string') {
                result += value
                process.stdout.write(value)
            }
        }
        console.log('\n\nComplete response:', result)
        console.log('Total response length:', result.length)
    } catch (error) {
        console.error('Streaming error:', error)
        console.log('Note: Streaming requires a running Flowise instance with streaming enabled')
    }
}

async function oneShotModelExample() {
    try {
        const model = createFlowiseModel({
            baseUrl: BASE_URL,
            apiKey: API_KEY,
            chatflowId: CHATFLOW_ID
        })
        console.log('One-shot model created successfully')
        console.log('Model type:', typeof model)
        console.log('Model properties:', Object.keys(model))
    } catch (error) {
        console.error('One-shot model error:', error)
    }
}

if (require.main === module) {
    console.log('🚀 Running Flowise AI SDK Provider Examples...\n')
    const arg = process.argv.find((a) => a === 'stream' || a === 'oneshot' || a === 'basic')
    switch (arg) {
        case 'stream':
            streamingExample().catch(console.error)
            break
        case 'oneshot':
            oneShotModelExample().catch(console.error)
            break
        case 'basic':
        case undefined:
            basicExample().catch(console.error)
            break
        default:
            console.log('Usage: node simple-usage.js [basic|stream|oneshot]')
            process.exit(1)
    }
}
