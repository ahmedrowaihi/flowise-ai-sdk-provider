import type { LanguageModelV2StreamPart } from "@ai-sdk/provider";

export function buildStreamPart<T extends LanguageModelV2StreamPart>(
	part: T,
): T {
	return part;
}
