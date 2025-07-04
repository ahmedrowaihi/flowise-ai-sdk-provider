import { createFlowiseProvider, createFlowiseModel } from '../src'
import { streamText, generateText } from "ai";

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
        const response = await generateText({
            model: flowise(CHATFLOW_ID),
            prompt: 'Write a short story about a robot learning to cook.'
        });
        console.log('Generated text:', response.text)
    } catch (error) {
        console.error('Error generating text:', error)
    }
}

async function streamingExample() {
    const flowise = createFlowiseProvider({
        baseUrl: BASE_URL,
        apiKey: API_KEY
    })
    try {
        console.log('\n--------------------------------')
        console.log('Base URL:', BASE_URL)
        console.log('Chatflow ID:', CHATFLOW_ID)
        console.log('Question:', 'Tell me a joke')
        console.log('--------------------------------')
        const result = streamText({
            model: flowise(CHATFLOW_ID),
            prompt: 'Tell me a joke',
        });
        for await (const part of result.textStream) {
            process.stdout.write(part);
        }
    } catch (error) {
        console.error('Streaming error:', error);
        console.log('Note: Streaming requires a running Flowise instance with streaming enabled');
    }
}

async function oneShotModelExample() {
    try {
        const model = createFlowiseModel({
            baseUrl: BASE_URL,
            apiKey: API_KEY,
            chatflowId: CHATFLOW_ID
        })
        const response = await generateText({
            model,
            prompt: 'Say hello from one-shot model!'
        });
        console.log('One-shot model response:', response.text)
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
            basicExample().catch(console.error)
            break
        default:
            console.log('Usage: node simple-usage.js [basic|stream|oneshot]')
            process.exit(1)
    }
}
