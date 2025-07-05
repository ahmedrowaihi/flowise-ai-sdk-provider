import type { ChatTransport, FileUIPart, UIMessage } from "ai";
import { DefaultChatTransport } from "ai";

/**
 * A chat transport that behaves exactly like DefaultChatTransport,
 * but sends FormData if files are present in the last message.
 * Otherwise, it falls back to JSON. This enables file uploads with useChat.
 */
export class FormDataChatTransport extends DefaultChatTransport<UIMessage> {
	override async sendMessages({
		abortSignal,
		...options
	}: Parameters<ChatTransport<UIMessage>["sendMessages"]>[0]) {
		// Use the same prepareSendMessagesRequest logic as HttpChatTransport
		const preparedRequest = this.prepareSendMessagesRequest
			? await this.prepareSendMessagesRequest({
					api: this.api,
					id: options.chatId,
					messages: options.messages,
					body: { ...this.body, ...options.body },
					headers: { ...this.headers, ...options.headers },
					credentials: this.credentials,
					requestMetadata: options.metadata,
					trigger: options.trigger,
					messageId: options.messageId,
				})
			: undefined;

		const api = preparedRequest?.api ?? this.api;
		const headers =
			preparedRequest?.headers !== undefined
				? preparedRequest.headers
				: { ...this.headers, ...options.headers };
		const credentials = preparedRequest?.credentials ?? this.credentials;
		const messages = options.messages;
		const lastMessage = messages[messages.length - 1];
		const files =
			lastMessage?.parts?.filter((part) => part.type === "file") || [];

		let body: any;
		let finalHeaders: any = headers;

		if (files && files.length > 0) {
			body = new FormData();
			// Always include id and messages (all)
			body.append("id", options.chatId);
			body.append("messages", JSON.stringify(messages));

			// Include trigger if present
			if (options.trigger !== undefined) {
				body.append("trigger", String(options.trigger));
			}
			// Include messageId if present
			if (options.messageId !== undefined) {
				body.append("messageId", String(options.messageId));
			}
			// Include any additional fields from this.body and options.body
			const mergedBody = { ...this.body, ...options.body };
			for (const [key, value] of Object.entries(mergedBody)) {
				// Avoid duplicating fields already added
				if (["id", "messages", "trigger", "messageId", "files"].includes(key))
					continue;
				// Stringify objects/arrays, otherwise append as string
				if (typeof value === "object" && value !== null) {
					body.append(key, JSON.stringify(value));
				} else if (value !== undefined) {
					body.append(key, String(value));
				}
			}
			// Attach files
			files.forEach((file: FileUIPart) => {
				body.append("files", file);
			});

			// Do not set Content-Type for FormData; browser will set it
			if (finalHeaders && typeof finalHeaders === "object") {
				if (finalHeaders["Content-Type"]) {
					delete finalHeaders["Content-Type"];
				}
			}
		} else {
			// Fallback to JSON (identical to default)
			body = JSON.stringify(
				preparedRequest?.body !== undefined
					? preparedRequest.body
					: {
							...this.body,
							...options.body,
							id: options.chatId,
							messages: options.messages,
							trigger: options.trigger,
							messageId: options.messageId,
						},
			);
			if (!finalHeaders || typeof finalHeaders !== "object") finalHeaders = {};
			finalHeaders["Content-Type"] = "application/json";
		}

		const fetchImpl = this.fetch || fetch;
		const response = await fetchImpl(api, {
			method: "POST",
			body,
			headers: finalHeaders,
			signal: abortSignal,
			credentials,
		});

		if (!response.ok) {
			throw new Error(
				(await response.text()) ?? "Failed to fetch the chat response.",
			);
		}

		if (!response.body) {
			throw new Error("The response body is empty.");
		}

		return this.processResponseStream(response.body as any);
	}
}
