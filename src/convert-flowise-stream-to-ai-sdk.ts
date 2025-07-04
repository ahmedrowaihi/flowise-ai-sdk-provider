import type { StreamResponse as FlowiseStreamResponse } from "flowise-sdk/dist/flowise-sdk";
import { buildStreamPart } from "./stream-part-builder";
import type { FlowisePredictionRequest } from "./types";
import { estimateTokens, generateUUID, type Logger } from "./utils";

type AiSdkStreamPart = ReturnType<typeof buildStreamPart>;

export interface FlowiseToAiSdkStreamContext {
	args: FlowisePredictionRequest;
	logger: Logger;
}

export function flowiseEventToAiSdkStream(
	flowiseStream: AsyncGenerator<FlowiseStreamResponse, void, unknown>,
	context: FlowiseToAiSdkStreamContext,
): ReadableStream<AiSdkStreamPart> {
	const { args, logger } = context;
	const inputTokens = estimateTokens(args.question);
	const id = generateUUID();

	let outputTokens = 0;
	return new ReadableStream<AiSdkStreamPart>({
		async start(controller) {
			let closed = false;
			let streamStarted = false;
			let textStarted = false;
			try {
				for await (const chunk of flowiseStream) {
					if (!chunk) continue;
					switch (chunk.event) {
						case "start":
							if (!streamStarted) {
								controller.enqueue(
									buildStreamPart({
										type: "stream-start",
										warnings: [],
									}),
								);
								streamStarted = true;
							}
							break;
						case "token":
							if (!textStarted) {
								controller.enqueue(
									buildStreamPart({
										type: "text-start",
										id,
									}),
								);
								textStarted = true;
							}
							if (typeof chunk.data === "string" && chunk.data.length > 0) {
								outputTokens += estimateTokens(chunk.data);
								controller.enqueue(
									buildStreamPart({
										type: "text-delta",
										id,
										delta: chunk.data,
									}),
								);
							}
							break;
						case "end":
							if (textStarted) {
								controller.enqueue(
									buildStreamPart({
										type: "text-end",
										id,
									}),
								);
								textStarted = false;
							}
							controller.enqueue(
								buildStreamPart({
									type: "finish",
									usage: {
										inputTokens,
										outputTokens,
										totalTokens: inputTokens + outputTokens,
									},
									finishReason: "stop",
								}),
							);
							closed = true;
							controller.close();
							break;
						case "sourceDocuments":
							logger.debug(
								"Flowise provider: sourceDocuments event received",
								chunk,
							);
							break;
						case "artifacts":
							logger.debug("Flowise provider: artifacts event received", chunk);
							break;
						case "usedTools":
							logger.debug("Flowise provider: usedTools event received", chunk);
							break;
						case "fileAnnotations":
							logger.debug(
								"Flowise provider: fileAnnotations event received",
								chunk,
							);
							break;
						case "tool":
							logger.debug("Flowise provider: tool event received", chunk);
							break;
						case "agentReasoning":
							logger.debug(
								"Flowise provider: agentReasoning event received",
								chunk,
							);
							break;
						case "nextAgent":
							logger.debug("Flowise provider: nextAgent event received", chunk);
							break;
						case "agentFlowEvent":
							logger.debug(
								"Flowise provider: agentFlowEvent event received",
								chunk,
							);
							break;
						case "agentFlowExecutedData":
							logger.debug(
								"Flowise provider: agentFlowExecutedData event received",
								chunk,
							);
							break;
						case "nextAgentFlow":
							logger.debug(
								"Flowise provider: nextAgentFlow event received",
								chunk,
							);
							break;
						case "action":
							logger.debug("Flowise provider: action event received", chunk);
							break;
						case "abort":
							logger.debug("Flowise provider: abort event received", chunk);
							break;
						case "error":
							logger.error("Flowise provider: error event received", chunk);
							break;
						case "metadata":
							logger.debug("Flowise provider: metadata event received", chunk);
							break;
						default:
							logger.warn(
								"Flowise provider: Skipping unknown event type:",
								chunk,
							);
					}
				}
				if (!closed) {
					// If the stream ends without an 'end' event, close out any open text block
					if (textStarted) {
						controller.enqueue(
							buildStreamPart({
								type: "text-end",
								id,
							}),
						);
					}
					controller.close();
				}
			} catch (error) {
				logger.error("Flowise provider: stream error", error);
				controller.error(error);
			}
		},
	});
}
