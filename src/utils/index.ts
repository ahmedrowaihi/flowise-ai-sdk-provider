export function estimateTokens(text: string): number {
	return Math.ceil(text.trim().split(/\s+/).length * 1.3);
}

export function generateUUID(): string {
	return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0;
		const v = c === "x" ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}

export async function fetchFileAsBase64(
	url: string,
	mimeType?: string,
): Promise<string> {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`Failed to fetch file: ${url}`);
	const arrayBuffer = await res.arrayBuffer();
	const base64 = Buffer.from(arrayBuffer).toString("base64");
	return `data:${mimeType || res.headers.get("content-type") || "application/octet-stream"};base64,${base64}`;
}

export interface Logger {
	debug: (...args: Parameters<typeof console.debug>) => void;
	warn: (...args: Parameters<typeof console.warn>) => void;
	error: (...args: Parameters<typeof console.error>) => void;
}

export const silentLogger: Logger = {
	debug: () => {},
	warn: () => {},
	error: () => {},
};

export const consoleLogger: Logger = console;

let globalLogger: Logger = silentLogger;

export function setLogger(logger: Logger) {
	globalLogger = logger;
}

export function getLogger(): Logger {
	return globalLogger;
}
