import type { TextUIPart, ToolUIPart, UIMessage } from "ai";

export interface FlowiseChatMessage {
	id: string;
	role: "userMessage" | "apiMessage";
	content: string;
	chatId: string;
	chatflowid: string;
	createdDate: Date;
	sourceDocuments?: string;
	usedTools?: string;
	fileAnnotations?: string;
	agentReasoning?: string;
	artifacts?: string;
	action?: string;
	followUpPrompts?: string;
}

interface ConvertToAiSdkMessageOptions {
	allowMessageTypes?: FlowiseChatMessage["role"][];
}

const baseOptions: ConvertToAiSdkMessageOptions = {
	allowMessageTypes: ["userMessage", "apiMessage"],
};

export function convertToAiSdkMessage(
	messages: FlowiseChatMessage[],
	options: ConvertToAiSdkMessageOptions = baseOptions,
): UIMessage[] {
	const allowMessageTypeSet = new Set(options.allowMessageTypes || []);

	return messages
		.filter((message) => allowMessageTypeSet.has(message.role))
		.map((message) => {
			const parts: Array<TextUIPart | ToolUIPart> = [];

			// Add text content
			if (message.content && typeof message.content === "string") {
				const textPart: TextUIPart = {
					type: "text",
					text: message.content,
				};
				parts.push(textPart);
			}

			// Add reasoning as text if available
			if (message.agentReasoning) {
				try {
					const reasoning = JSON.parse(message.agentReasoning);
					if (Array.isArray(reasoning)) {
						reasoning.forEach((reason) => {
							if (
								reason &&
								reason.type === "text" &&
								typeof reason.text === "string"
							) {
								parts.push({
									type: "text",
									text: `[Reasoning: ${reason.text}]`,
								});
							}
						});
					}
				} catch (e) {
					// If parsing fails, treat as plain text
					parts.push({
						type: "text",
						text: `[Reasoning: ${String(message.agentReasoning)}]`,
					});
				}
			}

			// Add tool calls if available (as generic ToolUIPart)
			if (message.usedTools) {
				try {
					const tools = JSON.parse(message.usedTools);
					if (Array.isArray(tools)) {
						tools.forEach((tool) => {
							if (tool && tool.toolCallId && tool.toolName) {
								parts.push({
									// This is a generic tool part; you may need to adapt for your tool types
									type: `tool-${tool.toolName}`,
									toolCallId: tool.toolCallId,
									state: "input-available",
									input: tool.args || {},
									providerExecuted: false,
								} as ToolUIPart);
							}
						});
					}
				} catch (e) {
					// Skip if parsing fails
				}
			}

			// Only set id, role, parts (metadata optional)
			const aiSdkMessage: UIMessage = {
				role: message.role === "userMessage" ? "user" : "assistant",
				id: message.id,
				parts: parts.length > 0 ? parts : [],
			};

			return aiSdkMessage;
		})
		.sort((a, b) => {
			// Sort by createdDate if available on original messages
			const msgA = messages.find((m) => m.id === a.id);
			const msgB = messages.find((m) => m.id === b.id);
			if (msgA && msgB && msgA.createdDate && msgB.createdDate) {
				return (
					new Date(msgA.createdDate).getTime() -
					new Date(msgB.createdDate).getTime()
				);
			}
			return 0;
		});
}

/**
 * Convert AI SDK message to Flowise message format
 */
export function convertFromAiSdkMessage(message: UIMessage): {
	role: "apiMessage" | "userMessage";
	content: string;
} {
	// Map AI SDK roles to Flowise roles
	switch (message.role) {
		case "assistant":
			return {
				role: "apiMessage",
				content: message.parts.map((p) => (p as TextUIPart).text).join(" "),
			};
		case "user":
			return {
				role: "userMessage",
				content: message.parts.map((p) => (p as TextUIPart).text).join(" "),
			};
		case "system":
			// System messages are typically converted to apiMessage in Flowise
			return {
				role: "apiMessage",
				content: message.parts.map((p) => (p as TextUIPart).text).join(" "),
			};
		default:
			// Default to user message for unknown roles
			return {
				role: "userMessage",
				content: message.parts.map((p) => (p as TextUIPart).text).join(" "),
			};
	}
}

/**
 * Convert tool results to Flowise format if needed
 */
export function convertToolResults(results: any[]): any[] {
	return results.map((result) => ({
		toolName: result.toolName,
		toolCallId: result.toolCallId,
		content: result.content,
		isError: result.isError,
	}));
}
