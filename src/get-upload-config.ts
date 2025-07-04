import type { UploadConfig } from "./types";

export interface GetUploadConfigArgs {
	chatflowId: string;
	fetchWithAuth: (
		input: RequestInfo | URL,
		init?: RequestInit,
	) => Promise<Response>;
	logger: { warn: (...args: any[]) => void };
}

/**
 * Fetches the upload config for a chatflow, trying authenticated, public, and uploads endpoints in order.
 */
export async function getUploadConfig({
	chatflowId,
	fetchWithAuth,
	logger,
}: GetUploadConfigArgs): Promise<UploadConfig> {
	// Try authenticated endpoint first
	try {
		const res = await fetchWithAuth(`/api/v1/chatflows/${chatflowId}`);
		if (res.ok) {
			const data = await res.json();
			if (typeof data.chatbotConfig === "string") {
				return JSON.parse(data.chatbotConfig) as UploadConfig;
			}
		}
	} catch (err) {
		logger.warn("Failed to fetch authenticated chatflow config:", err);
	}
	// Fallback to public endpoint
	try {
		const res = await fetchWithAuth(
			`/api/v1/public-chatbotConfig/${chatflowId}`,
		);
		if (res.ok) {
			const config = await res.json();
			return (config.chatbotConfig || config) as UploadConfig;
		}
	} catch (err) {
		logger.warn("Failed to fetch public chatflow config:", err);
	}
	// Fallback to uploads endpoint
	try {
		const res = await fetchWithAuth(`/api/v1/chatflows-uploads/${chatflowId}`);
		if (res.ok) {
			return (await res.json()) as UploadConfig;
		}
	} catch (err) {
		logger.warn("Failed to fetch uploads config:", err);
	}
	return {};
}
