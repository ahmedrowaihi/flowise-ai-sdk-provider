export interface FlowiseMessage {
    role: 'user' | 'assistant' | 'system'
    content: string
}

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

export interface FlowisePredictionResponse {
    text: string
    question: string
    chatId: string
    chatMessageId: string
    sessionId?: string
    memoryType?: string
    sourceDocuments?: any[]
    usedTools?: any[]
    fileAnnotations?: any[]
    artifacts?: any[]
    agentReasoning?: any[]
    action?: any
    flowVariables?: Record<string, any>
    followUpPrompts?: string
    isStreamValid?: boolean
    executionId?: string
    agentFlowExecutedData?: any
}

export interface FlowiseStreamingResponse {
    type: 'text' | 'tool-call' | 'tool-result' | 'error' | 'end'
    data?: any
    text?: string
    toolCallId?: string
    toolName?: string
    args?: any
    result?: any
    error?: string
}

// AI SDK compatible streaming chunk types
export interface FlowiseStreamingChunk {
    type: 'text-delta' | 'start' | 'metadata'
    textDelta?: string
    event?: string
    data?: any
}

export interface FlowiseClientOptions {
    baseUrl: string
    apiKey?: string
    timeout?: number
}
