import type { PredictionData } from "flowise-sdk/dist/flowise-sdk";
import type { Logger } from "./utils";

export interface FileUploadConstraint {
	types?: string[];
	maxSize?: number;
}

export interface UploadsConfig {
	fullFileUpload?: { status?: boolean };
	isRAGFileUploadAllowed?: boolean;
	isImageUploadAllowed?: boolean;
	fileUploadSizeAndTypes?: FileUploadConstraint[];
}

export interface ChatbotConfig {
	fullFileUpload?: { status?: boolean };
	isRAGFileUploadAllowed?: boolean;
	isImageUploadAllowed?: boolean;
	fileUploadSizeAndTypes?: FileUploadConstraint[];
}

export interface UploadConfig {
	uploads?: UploadsConfig;
	chatbotConfig?: ChatbotConfig;
	[key: string]: unknown;
}

export interface FlowisePredictionRequest
	extends Omit<PredictionData, "chatflowId"> {}

export interface FlowiseClientOptions {
	baseUrl: string;
	apiKey?: string;
	timeout?: number;
	logger?: Logger;
}
