import type { LanguageModelV2, LanguageModelV2CallWarning } from '@ai-sdk/provider';

import { FlowiseClient } from 'flowise-sdk';
import { convertToFlowiseMessage } from './convert-to-flowise-message';
import { buildStreamPart } from './stream-part-builder';
import type { FlowisePredictionRequest } from './types';

function estimateTokens(text: string): number {
    return Math.ceil((text.trim().split(/\s+/).length) * 1.3);
}

function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

export class FlowiseChatModel implements LanguageModelV2 {
    readonly specificationVersion = 'v2' as LanguageModelV2['specificationVersion']
    readonly defaultObjectGenerationMode = 'json'
    readonly supportsImageUrls = false
    readonly modelId = 'flowise-chatflow'

    // Accepts all http/https URLs for streaming
    readonly supportedUrls: Record<string, RegExp[]> = {
        'http:': [/.*/],
        'https:': [/.*/]
    }

    readonly chatflowId: string
    readonly client: FlowiseClient

    constructor(chatflowId: string, client: FlowiseClient) {
        this.chatflowId = chatflowId
        this.client = client
    }

    get provider(): string {
        return '@ahmedrowaihi/flowise-ai'
    }

    supportsUrl(url: URL): boolean {
        return url.protocol === 'https:' || url.protocol === 'http:'
    }

    private getArgs({ prompt }: Parameters<LanguageModelV2['doGenerate']>[0]) {
        const warnings: LanguageModelV2CallWarning[] = []
        const baseArgs: FlowisePredictionRequest = {
            question: convertToFlowiseMessage(prompt),
            chatId: undefined
        }
        return {
            args: baseArgs,
            warnings
        }
    }

    async doGenerate(options: Parameters<LanguageModelV2['doGenerate']>[0]): Promise<Awaited<ReturnType<LanguageModelV2['doGenerate']>>> {
        const { args, warnings } = this.getArgs(options)
        try {
            const response = await this.client.createPrediction({
                ...args,
                chatflowId: this.chatflowId,
                streaming: false,
            });
            return {
                content: [{ type: 'text', text: response.text }],
                finishReason: 'stop',
                usage: {
                    inputTokens: 0,
                    outputTokens: 0,
                    totalTokens: 0
                },
                warnings
            }
        } catch (error) {
            throw new Error(`Flowise API error: ${error instanceof Error ? error.message : String(error)}`)
        }
    }

    async doStream(options: Parameters<LanguageModelV2['doStream']>[0]): Promise<Awaited<ReturnType<LanguageModelV2['doStream']>>> {
        const { args } = this.getArgs(options)
        try {
            const flowiseStream = await this.client.createPrediction({
                ...args,
                chatflowId: this.chatflowId,
                streaming: true,
            });
            const inputTokens = estimateTokens(args.question);
            let outputTokens = 0;
            const id = generateUUID();
            const stream = new ReadableStream({
                async start(controller) {
                    let closed = false;
                    controller.enqueue(buildStreamPart({
                        type: 'stream-start',
                        warnings: [],
                    }));
                    // Required by AI SDK v2: emit text-start with id before any deltas
                    controller.enqueue(buildStreamPart({
                        type: 'text-start',
                        id,
                    }));
                    try {
                        for await (const chunk of flowiseStream) {
                            // Defensive: log all unexpected chunk types for debugging
                            if (!chunk) continue;
                            if (
                                chunk.event === 'token' &&
                                typeof chunk.data === 'string' &&
                                chunk.data.length > 0
                            ) {
                                outputTokens += estimateTokens(chunk.data);
                                controller.enqueue(buildStreamPart({
                                    type: 'text-delta',
                                    id,
                                    delta: chunk.data,
                                }));
                            } else if (chunk.event === 'end') {
                                controller.enqueue(buildStreamPart({
                                    type: 'text-end',
                                    id,
                                }));
                                controller.enqueue(buildStreamPart({
                                    type: 'finish',
                                    usage: {
                                        inputTokens,
                                        outputTokens,
                                        totalTokens: inputTokens + outputTokens,
                                    },
                                    finishReason: 'stop',
                                }));
                                closed = true;
                                controller.close();
                                break;
                            } else {
                                // Only log unexpected chunk types
                                console.warn('Flowise provider: Skipping non-text-delta chunk:', chunk);
                            }
                        }
                        if (!closed) {
                            controller.close();
                        }
                    } catch (error) {
                        controller.error(error);
                    }
                }
            })
            return {
                stream,
            }
        } catch (error) {
            throw new Error(`Flowise streaming error: ${error instanceof Error ? error.message : String(error)}`)
        }
    }
}
