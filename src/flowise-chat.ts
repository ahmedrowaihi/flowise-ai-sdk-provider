import type {
	LanguageModelV2,
	LanguageModelV2CallOptions,
	LanguageModelV2CallWarning,
} from "@ai-sdk/provider";
import type { FlowiseClient } from "flowise-sdk";
import { flowiseEventToAiSdkStream } from "./convert-flowise-stream-to-ai-sdk";
import { convertToFlowiseMessage } from "./convert-to-flowise-message";
import { getUploadConfig } from "./get-upload-config";
import { transformAttachmentToFlowise } from "./transform-attachment-to-flowise";
import { transformUploadsFromPrompt } from "./transform-uploads-from-prompt";
import type { FlowisePredictionRequest } from "./types";
import { estimateTokens, getLogger, type Logger } from "./utils";

export interface FlowiseChatModelOptions {
	chatflowId: string;
	client: FlowiseClient;
	baseUrl: string;
	apiKey?: string;
	logger?: Logger;
}

/**
 * FlowiseChatModel: AI SDK provider for Flowise chatflows.
 * - Handles file uploads, including full file extraction via the attachment API.
 * - To control chat session continuity, pass a chatId in providerOptions: { chatId: ... }.
 *   If not provided, a UUID will be generated as needed for file uploads.
 */
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
	private uploadConfigCache: Record<string, any> = {};
	private baseUrl: string;
	private apiKey?: string;

	constructor(options: FlowiseChatModelOptions) {
		this.client = options.client;
		this.logger = options.logger ?? getLogger();
		this.chatflowId = options.chatflowId;
		this.baseUrl = options.baseUrl;
		this.apiKey = options.apiKey;
	}

	get provider(): string {
		return "@ahmedrowaihi/flowise-ai";
	}

	supportsUrl(url: URL): boolean {
		return url.protocol === "https:" || url.protocol === "http:";
	}

	private async fetchWithAuth(
		input: RequestInfo | URL,
		init?: RequestInit,
	): Promise<Response> {
		let url: string | RequestInfo | URL = input;
		if (typeof input === "string") {
			if (input.startsWith("/")) {
				url = this.baseUrl.replace(/\/$/, "") + input;
			} else if (!input.startsWith("http")) {
				url = `${this.baseUrl.replace(/\/$/, "")}/${input}`;
			}
		}
		const headers: Record<string, string> = {
			...((init?.headers as Record<string, string>) || {}),
		};
		if (this.apiKey) {
			headers.Authorization = `Bearer ${this.apiKey}`;
		}
		return fetch(url, { ...init, headers });
	}

	private async getArgs(options: LanguageModelV2CallOptions) {
		const userChatId = options.providerOptions?.chatId as string | undefined;
		const { prompt } = options;
		const warnings: LanguageModelV2CallWarning[] = [];
		const config = await getUploadConfig({
			chatflowId: this.chatflowId,
			fetchWithAuth: this.fetchWithAuth.bind(this),
			logger: this.logger,
		});
		const {
			uploads: promptUploads,
			warnings: uploadWarnings,
			chatId,
		} = await transformUploadsFromPrompt({
			prompt,
			userChatId,
			getUploadConfig: async () => config,
			chatflowId: this.chatflowId,
			logger: this.logger,
		});
		let uploads = promptUploads;
		let usedChatId = chatId;

		this.logger.debug(
			`[FlowiseChatModel] Uploads before attachment API: ${JSON.stringify(uploads.map((u) => ({ name: u.name, type: u.type, mime: u.mime, dataLength: u.data.length })))} `,
		);

		if (uploads.some((u) => u.type === "file:full") && usedChatId) {
			for (let i = 0; i < uploads.length; ++i) {
				const upload = uploads[i];
				if (!upload) continue;
				if (upload.type === "file:full") {
					const extracted = await transformAttachmentToFlowise({
						file: { name: upload.name, data: upload.data, mime: upload.mime },
						chatflowId: this.chatflowId,
						chatId: usedChatId,
						fetchWithAuth: this.fetchWithAuth.bind(this),
						logger: this.logger,
					});
					if (extracted) {
						uploads[i] = {
							type: upload.type,
							name: upload.name,
							data: extracted, // Replace data with extracted content
							mime: upload.mime,
						};
					} else {
						warnings.push({
							type: "other",
							message: `[FlowiseChatModel] Failed to extract content for file: ${upload.name}`,
						});
					}
				}
			}
		}

		this.logger.debug(
			`[FlowiseChatModel] Uploads after attachment API: ${JSON.stringify(uploads.map((u) => ({ name: u.name, type: u.type, mime: u.mime, dataLength: u.data.length })))} `,
		);

		if (uploads.length > 0) {
			this.logger.debug(
				"[FlowiseChatModel] Extracted uploads:",
				uploads.map((upload) => ({
					name: upload.name,
					type: upload.type,
					mime: upload.mime,
					dataLength: upload.data.length,
				})),
			);
		}

		const baseArgs: FlowisePredictionRequest = {
			question: convertToFlowiseMessage(prompt),
			chatId: usedChatId,
			uploads: uploads.length > 0 ? uploads : undefined,
		};
		return {
			args: baseArgs,
			warnings: [
				...warnings,
				...uploadWarnings.map(
					(msg) =>
						({ type: "other", message: msg }) as LanguageModelV2CallWarning,
				),
			],
		};
	}

	async doGenerate(
		options: Parameters<LanguageModelV2["doGenerate"]>[0],
	): Promise<Awaited<ReturnType<LanguageModelV2["doGenerate"]>>> {
		const { args, warnings } = await this.getArgs(options);
		try {
			const response = await this.client.createPrediction({
				...args,
				chatflowId: this.chatflowId,
				streaming: false,
			});
			// If response is an async generator, that's a bug for non-streaming
			if (typeof response === "object" && "text" in response) {
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
			}
			throw new Error("Unexpected streaming response for non-streaming call");
		} catch (error) {
			throw new Error(
				`Flowise API error: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	async doStream(
		options: Parameters<LanguageModelV2["doStream"]>[0],
	): Promise<Awaited<ReturnType<LanguageModelV2["doStream"]>>> {
		const { args } = await this.getArgs(options);
		try {
			const flowiseStream = await this.client.createPrediction({
				...args,
				chatflowId: this.chatflowId,
				streaming: true,
			});
			// Only pass if it's an async generator
			if (
				typeof flowiseStream === "object" &&
				Symbol.asyncIterator in flowiseStream
			) {
				return {
					stream: flowiseEventToAiSdkStream(flowiseStream, {
						args,
						logger: this.logger,
					}),
				};
			}
			throw new Error("Expected streaming response for doStream");
		} catch (error) {
			throw new Error(
				`Flowise streaming error: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
}
