import { Buffer } from "node:buffer";

export interface TransformAttachmentArgs {
	file: { name: string; data: string; mime: string };
	chatflowId: string;
	chatId: string;
	fetchWithAuth: (
		input: RequestInfo | URL,
		init?: RequestInit,
	) => Promise<Response>;
	logger: { debug: (...args: any[]) => void; warn: (...args: any[]) => void };
}

/**
 * Calls the Flowise attachment API to extract file content for a file:full upload.
 * Handles both array and object responses, and returns the extracted content string if available.
 */
export async function transformAttachmentToFlowise({
	file,
	chatflowId,
	chatId,
	fetchWithAuth,
	logger,
}: TransformAttachmentArgs): Promise<string | undefined> {
	// Convert dataUrl to Buffer
	let base64 = file.data;
	if (base64.startsWith("data:")) {
		base64 = base64.substring(base64.indexOf(",") + 1);
	}
	const buffer = Buffer.from(base64, "base64");
	let formData: FormData;
	try {
		formData = new FormData();
		// @ts-ignore
		formData.append(
			"files",
			new Blob([buffer], { type: file.mime }),
			file.name,
		);
	} catch (e) {
		// Fallback for Node.js: use Buffer directly
		// @ts-ignore
		formData = new FormData();
		// @ts-ignore
		formData.append("files", buffer, {
			filename: file.name,
			contentType: file.mime,
		});
	}
	logger.debug(
		`[transformAttachmentToFlowise] Sending file to attachment API: name=${file.name}, mime=${file.mime}, size=${buffer.length}`,
	);
	try {
		const res = await fetchWithAuth(
			`/api/v1/attachments/${chatflowId}/${chatId}`,
			{
				method: "POST",
				body: formData,
			},
		);
		logger.debug(
			`[transformAttachmentToFlowise] Attachment API response status: ${res.status} ${res.statusText}`,
		);
		if (!res.ok) {
			logger.warn(
				`[transformAttachmentToFlowise] Attachment API failed for file ${file.name}: ${res.statusText}`,
			);
			return undefined;
		}
		const json = await res.json();
		logger.debug(
			`[transformAttachmentToFlowise] Attachment API response for file ${file.name}: ${JSON.stringify(json).slice(0, 500)}`,
		);
		// The response may be an array of attachment objects
		let extractedContent: string | undefined;
		if (Array.isArray(json)) {
			const match = json.find(
				(a) => a.name === file.name && a.mimeType === file.mime,
			);
			if (match && typeof match.content === "string") {
				extractedContent = match.content;
			}
		} else if (json && typeof json.content === "string") {
			extractedContent = json.content;
		}
		if (extractedContent) {
			return extractedContent;
		}
		logger.warn(
			`[transformAttachmentToFlowise] Attachment API response missing 'content' for file ${file.name}`,
		);
		return undefined;
	} catch (err) {
		logger.warn(
			`[transformAttachmentToFlowise] Attachment API error for file ${file.name}:`,
			err,
		);
		return undefined;
	}
}
