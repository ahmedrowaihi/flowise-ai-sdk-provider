export interface FlowisePredictionRequest {
    question: string
    chatId?: string
    overrideConfig?: {
        sessionId?: string
        [key: string]: any
    }
    streaming?: boolean
    uploads?: any[]
    leadEmail?: string
    action?: any
    humanInput?: any
    form?: any
}

export interface FlowiseClientOptions {
    baseUrl: string
    apiKey?: string
    timeout?: number
}
