import type { LanguageModelV2, ProviderV2 } from "@ai-sdk/provider";

import { FlowiseClient } from "flowise-sdk";
import { FlowiseChatModel } from "./flowise-chat";
import type { FlowiseClientOptions } from "./types";

export interface FlowiseProvider extends ProviderV2 {
	(chatflowId: string): LanguageModelV2;

	/**
     Creates a model for text generation.
     */
	chat(chatflowId: string): LanguageModelV2;

	client: FlowiseClient;
}

/**
 Create a Flowise AI provider instance.
 */
export function createFlowiseProvider(
	options: FlowiseClientOptions,
): FlowiseProvider {
	const { logger, ...clientOptions } = options;
	const client = new FlowiseClient(clientOptions);

	const createChatModel = (chatflowId: string) =>
		new FlowiseChatModel({
			client,
			chatflowId,
			logger,
		});

	function providerFn(chatflowId: string) {
		if (new.target) {
			throw new Error(
				"The Flowise model function cannot be called with the new keyword.",
			);
		}
		return createChatModel(chatflowId);
	}

	const provider = Object.assign(providerFn, {
		languageModel: createChatModel,
		textEmbeddingModel: (modelId: string) => {
			throw new Error(
				`Text embedding model '${modelId}' not supported by Flowise`,
			);
		},
		imageModel: (modelId: string) => {
			throw new Error(`Image model '${modelId}' not supported by Flowise`);
		},
		transcriptionModel: (modelId: string) => {
			throw new Error(
				`Transcription model '${modelId}' not supported by Flowise`,
			);
		},
		speechModel: (modelId: string) => {
			throw new Error(`Speech model '${modelId}' not supported by Flowise`);
		},
		chat: createChatModel,
		client,
	}) as FlowiseProvider;

	return provider;
}

/**
 Create a Flowise model instance directly with credentials and chatflow ID.
 This is a convenience function for one-shot usage.
 */
export function createFlowiseModel(
	options: FlowiseClientOptions & { chatflowId: string },
): LanguageModelV2 {
	const { chatflowId, ...providerOptions } = options;
	const provider = createFlowiseProvider(providerOptions);
	return provider(chatflowId);
}
