import { generateText, streamText } from "ai";
import { createFlowiseModel, createFlowiseProvider } from '../src';
import fs from 'fs';
import path from 'path';

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

async function minimalFileAttachmentExample() {
    const flowise = createFlowiseProvider({
        baseUrl: BASE_URL,
        apiKey: API_KEY
    });
    const chatflowId = CHATFLOW_ID;

    // Create a text file in memory for testing
    const fileBuffer = Buffer.from('This is a test file for Flowise upload.', 'utf-8');

    // Just include the file in the prompt—nothing else needed!
    const response = await generateText({
        model: flowise(chatflowId),
        prompt: [
            {
                role: 'user',
                content: [
                    { type: 'text', text: 'Please analyze the attached text file.' },
                    {
                        type: 'file',
                        filename: 'test.txt',
                        data: fileBuffer, // Buffer, ArrayBuffer, or base64 string
                        mediaType: 'text/plain'
                    }
                ]
            }
        ]
    });

    console.log('AI response:', response.text);
}

async function pdfFileAttachmentExample() {
    const flowise = createFlowiseProvider({
        baseUrl: BASE_URL,
        apiKey: API_KEY,
        logger: console,
    });
    const chatflowId = CHATFLOW_ID;

    // Load a PDF file from disk (ensure test.pdf exists in the same directory)
    const pdfPath = path.join(__dirname, 'sample.pdf');
    if (!fs.existsSync(pdfPath)) {
        console.error('Missing sample.pdf in the example directory. Please add a PDF file named sample.pdf.');
        process.exit(1);
    }
    const pdfBuffer = fs.readFileSync(pdfPath);

    const response = await generateText({
        model: flowise(chatflowId),
        providerOptions: {
            
        },
        prompt: [
            {
                role: 'user',
                content: [
                    { type: 'text', text: 'tell me the content of the pdf file.' },
                    {
                        type: 'file',
                        filename: 'sample.pdf',
                        data: pdfBuffer,
                        mediaType: 'application/pdf'
                    }
                ]
            }
        ]
    });

    console.log(response.text);
}

if (require.main === module) {
    console.log('🚀 Running Flowise AI SDK Provider Examples...\n')
    const arg = process.argv.find((a) => a === 'stream' || a === 'oneshot' || a === 'basic' || a === 'upload' || a === 'pdf')
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
        case 'upload':
            minimalFileAttachmentExample().catch(console.error)
            break
        case 'pdf':
            pdfFileAttachmentExample().catch(console.error)
            break
        default:
            console.log('Usage: node simple-usage.js [basic|stream|oneshot|upload|pdf]')
            process.exit(1)
    }
}
