import type { LanguageModelV1, ProviderV1 } from '@ai-sdk/provider'

import { FlowiseChatModel } from './flowise-chat'
import { FlowiseClient } from './flowise-client'
import type { FlowiseClientOptions } from './types'

export interface FlowiseProvider extends ProviderV1 {
    (chatflowId: string): LanguageModelV1

    /**
     Creates a model for text generation.
     */
    chat(chatflowId: string): LanguageModelV1

    client: FlowiseClient
}

/**
 Create a Flowise AI provider instance.
 */
export function createFlowiseProvider(options: FlowiseClientOptions): FlowiseProvider {
    const client = new FlowiseClient(options)

    const createChatModel = (chatflowId: string) => new FlowiseChatModel(chatflowId, client)

    const provider = function (chatflowId: string) {
        if (new.target) {
            throw new Error('The Flowise model function cannot be called with the new keyword.')
        }

        return createChatModel(chatflowId)
    }

    // Required ProviderV1 methods
    provider.languageModel = createChatModel
    provider.textEmbeddingModel = (modelId: string) => {
        throw new Error(`Text embedding model '${modelId}' not supported by Flowise`)
    }

    // Additional methods
    provider.chat = createChatModel

    provider.client = client

    return provider
}

/**
 Create a Flowise model instance directly with credentials and chatflow ID.
 This is a convenience function for one-shot usage.
 */
export function createFlowiseModel(options: FlowiseClientOptions & { chatflowId: string }): LanguageModelV1 {
    const { chatflowId, ...providerOptions } = options
    const provider = createFlowiseProvider(providerOptions)
    return provider(chatflowId)
}

/**
 Default Flowise provider instance.
 */
