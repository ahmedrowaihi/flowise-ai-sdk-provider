import type {
	LanguageModelV2FilePart,
	LanguageModelV2Prompt,
} from "@ai-sdk/provider";

import type { FileUploadConstraint, UploadConfig } from "./types";
import type { Logger } from "./utils";
import { fetchFileAsBase64, generateUUID } from "./utils";

export interface TransformUploadsFromPromptArgs {
	prompt: LanguageModelV2Prompt;
	userChatId?: string;
	getUploadConfig: (chatflowId: string) => Promise<UploadConfig>;
	chatflowId: string;
	logger: Logger;
}

export async function transformUploadsFromPrompt({
	prompt,
	userChatId,
	getUploadConfig,
	chatflowId,
	logger,
}: TransformUploadsFromPromptArgs): Promise<{
	uploads: Array<{
		type: string;
		name: string;
		data: string;
		mime: string;
	}>;
	warnings: string[];
	chatId: string | undefined;
}> {
	const config: UploadConfig = await getUploadConfig(chatflowId);
	const uploadsConfig = config.uploads ?? {};
	const chatbotConfig = config.chatbotConfig ?? config;
	logger.debug("[transformUploadsFromPrompt] Upload config:", chatbotConfig);
	const uploads: Array<{
		type: string;
		name: string;
		data: string;
		mime: string;
	}> = [];
	const warnings: string[] = [];
	let chatId: string | undefined = userChatId;

	for (const message of prompt) {
		if (message.role === "user") {
			if (Array.isArray(message.content)) {
				for (const part of message.content) {
					if (part.type === "file") {
						const filePart = part as LanguageModelV2FilePart;
						let dataUrl: string | undefined;
						let bufLength: number | undefined = undefined;

						if (filePart.data) {
							if (typeof filePart.data === "string") {
								if (filePart.data.startsWith("data:")) {
									dataUrl = filePart.data;
									bufLength = filePart.data.length;
								} else if (/^[A-Za-z0-9+/=]+$/.test(filePart.data)) {
									dataUrl = `data:${filePart.mediaType || "application/octet-stream"};base64,${filePart.data}`;
									bufLength = filePart.data.length;
								} else if (filePart.data.startsWith("http")) {
									dataUrl = await fetchFileAsBase64(
										filePart.data,
										filePart.mediaType,
									);
									bufLength = dataUrl.length;
								}
							} else if (
								filePart.data instanceof Uint8Array ||
								filePart.data instanceof ArrayBuffer ||
								(typeof Buffer !== "undefined" &&
									filePart.data instanceof Buffer)
							) {
								let buf: Buffer;
								if (filePart.data instanceof Buffer) {
									buf = filePart.data;
								} else if (filePart.data instanceof Uint8Array) {
									buf = Buffer.from(filePart.data);
								} else if (filePart.data instanceof ArrayBuffer) {
									buf = Buffer.from(new Uint8Array(filePart.data));
								} else {
									continue;
								}
								const base64 = buf.toString("base64");
								dataUrl = `data:${filePart.mediaType || "application/octet-stream"};base64,${base64}`;
								bufLength = buf.length;
							}
						}

						let uploadType = "file";
						const hasFullFileUploadStatus = (
							obj: unknown,
						): obj is { status?: boolean } =>
							!!obj && typeof obj === "object" && "status" in obj;
						if (
							(hasFullFileUploadStatus(uploadsConfig.fullFileUpload) &&
								uploadsConfig.fullFileUpload.status) ||
							(hasFullFileUploadStatus(chatbotConfig.fullFileUpload) &&
								chatbotConfig.fullFileUpload.status)
						) {
							uploadType = "file:full";
						} else if (
							uploadsConfig.isRAGFileUploadAllowed ||
							chatbotConfig.isRAGFileUploadAllowed
						) {
							uploadType = "file:rag";
						} else if (
							(uploadsConfig.isImageUploadAllowed ||
								chatbotConfig.isImageUploadAllowed) &&
							filePart.mediaType?.startsWith("image/")
						) {
							uploadType = "file";
						}
						logger.debug(
							`[transformUploadsFromPrompt] Chosen uploadType for file '${filePart.filename ?? "file"}':`,
							uploadType,
						);

						if (
							uploadsConfig.fileUploadSizeAndTypes &&
							bufLength !== undefined
						) {
							const allowed = (
								uploadsConfig.fileUploadSizeAndTypes as FileUploadConstraint[]
							).some((entry) => {
								return (
									(!entry.types || entry.types.includes(filePart.mediaType)) &&
									(!entry.maxSize || bufLength <= entry.maxSize)
								);
							});
							if (!allowed) {
								warnings.push(
									`[transformUploadsFromPrompt] File type or size not allowed by chatflow config: ${filePart.mediaType}, size: ${bufLength}`,
								);
							}
						}

						if (dataUrl) {
							uploads.push({
								type: uploadType,
								name: filePart.filename ?? "file",
								data: dataUrl,
								mime: filePart.mediaType || "application/octet-stream",
							});
						}
					}
				}
			}
		}
	}
	if (uploads.some((u) => u.type === "file:full") && !chatId) {
		chatId = generateUUID();
	}
	return { uploads, warnings, chatId };
}
