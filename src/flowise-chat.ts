import type {
	LanguageModelV2,
	LanguageModelV2CallWarning,
} from "@ai-sdk/provider";

import type { FlowiseClient } from "flowise-sdk";
import { flowiseEventToAiSdkStream } from "./convert-flowise-stream-to-ai-sdk";
import { convertToFlowiseMessage } from "./convert-to-flowise-message";
import type { FlowisePredictionRequest } from "./types";
import { estimateTokens, getLogger, type Logger } from "./utils";

export interface FlowiseChatModelOptions {
	chatflowId: string;
	client: FlowiseClient;
	logger?: Logger;
}

export class FlowiseChatModel implements LanguageModelV2 {
	readonly specificationVersion =
		"v2" as LanguageModelV2["specificationVersion"];
	readonly defaultObjectGenerationMode = "json";
	readonly supportsImageUrls = false;
	readonly modelId = "flowise-chatflow";

	// Accepts all http/https URLs for streaming
	readonly supportedUrls: Record<string, RegExp[]> = {
		"http:": [/.*/],
		"https:": [/.*/],
	};

	private client: FlowiseClient;
	private logger: Logger;
	private chatflowId: string;

	constructor(options: FlowiseChatModelOptions) {
		this.client = options.client;
		this.logger = options.logger ?? getLogger();
		this.chatflowId = options.chatflowId;
	}

	get provider(): string {
		return "@ahmedrowaihi/flowise-ai";
	}

	supportsUrl(url: URL): boolean {
		return url.protocol === "https:" || url.protocol === "http:";
	}

	private getArgs({ prompt }: Parameters<LanguageModelV2["doGenerate"]>[0]) {
		const warnings: LanguageModelV2CallWarning[] = [];
		const baseArgs: FlowisePredictionRequest = {
			question: convertToFlowiseMessage(prompt),
			chatId: undefined,
		};
		return {
			args: baseArgs,
			warnings,
		};
	}

	async doGenerate(
		options: Parameters<LanguageModelV2["doGenerate"]>[0],
	): Promise<Awaited<ReturnType<LanguageModelV2["doGenerate"]>>> {
		const { args, warnings } = this.getArgs(options);
		try {
			const response = await this.client.createPrediction({
				...args,
				chatflowId: this.chatflowId,
				streaming: false,
			});
			if (!response.text) {
				response.text = "";
				warnings.push({
					message: "No response from Flowise",
					type: "other",
				});
			}
			return {
				content: [{ type: "text", text: response.text }],
				finishReason: "stop",
				usage: {
					inputTokens: estimateTokens(args.question),
					outputTokens: estimateTokens(response.text),
					totalTokens:
						estimateTokens(args.question) + estimateTokens(response.text),
				},
				warnings,
			};
		} catch (error) {
			throw new Error(
				`Flowise API error: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	async doStream(
		options: Parameters<LanguageModelV2["doStream"]>[0],
	): Promise<Awaited<ReturnType<LanguageModelV2["doStream"]>>> {
		const { args } = this.getArgs(options);
		try {
			const flowiseStream = await this.client.createPrediction({
				...args,
				chatflowId: this.chatflowId,
				streaming: true,
			});
			return {
				stream: flowiseEventToAiSdkStream(flowiseStream, {
					args,
					logger: this.logger,
				}),
			};
		} catch (error) {
			throw new Error(
				`Flowise streaming error: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
}
