import type { PredictionData } from "flowise-sdk/dist/flowise-sdk";
import type { Logger } from "./utils";

export interface FlowisePredictionRequest
	extends Omit<PredictionData, "chatflowId"> {}

export interface FlowiseClientOptions {
	baseUrl: string;
	apiKey?: string;
	timeout?: number;
	logger?: Logger;
}
