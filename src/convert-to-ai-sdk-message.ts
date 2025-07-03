import type { FlowisePredictionResponse } from './types'
import type { Message, TextUIPart, ToolInvocationUIPart } from '@ai-sdk/ui-utils'

export interface FlowiseChatMessage {
    id: string
    role: 'userMessage' | 'apiMessage'
    content: string
    chatId: string
    chatflowid: string
    createdDate: Date
    sourceDocuments?: string
    usedTools?: string
    fileAnnotations?: string
    agentReasoning?: string
    artifacts?: string
    action?: string
    followUpPrompts?: string
}

interface ConvertToAiSdkMessageOptions {
    allowMessageTypes?: FlowiseChatMessage['role'][]
}

const baseOptions: ConvertToAiSdkMessageOptions = {
    allowMessageTypes: ['userMessage', 'apiMessage']
}

export function convertToAiSdkMessage(messages: FlowiseChatMessage[], options: ConvertToAiSdkMessageOptions = baseOptions): Message[] {
    const allowMessageTypeSet = new Set(options.allowMessageTypes || [])

    return messages
        .filter((message) => allowMessageTypeSet.has(message.role))
        .map((message) => {
            const parts: Array<TextUIPart | ToolInvocationUIPart> = []

            // Add text content
            if (message.content) {
                const textPart: TextUIPart = {
                    type: 'text',
                    text: message.content
                }
                parts.push(textPart)
            }

            // Add reasoning as text if available
            if (message.agentReasoning) {
                try {
                    const reasoning = JSON.parse(message.agentReasoning)
                    if (Array.isArray(reasoning)) {
                        reasoning.forEach((reason) => {
                            if (reason.type === 'text' && reason.text) {
                                parts.push({
                                    type: 'text',
                                    text: `[Reasoning: ${reason.text}]`
                                })
                            }
                        })
                    }
                } catch (e) {
                    // If parsing fails, treat as plain text
                    parts.push({
                        type: 'text',
                        text: `[Reasoning: ${message.agentReasoning}]`
                    })
                }
            }

            // Add tool calls if available
            if (message.usedTools) {
                try {
                    const tools = JSON.parse(message.usedTools)
                    if (Array.isArray(tools)) {
                        tools.forEach((tool) => {
                            if (tool.toolCallId && tool.toolName) {
                                parts.push({
                                    type: 'tool-invocation',
                                    toolInvocation: {
                                        state: 'call',
                                        toolCallId: tool.toolCallId,
                                        toolName: tool.toolName,
                                        args: tool.args || {}
                                    }
                                })
                            }
                        })
                    }
                } catch (e) {
                    // Skip if parsing fails
                }
            }

            const aiSdkMessage: Message = {
                role: message.role === 'userMessage' ? 'user' : 'assistant',
                content: message.content,
                id: message.id,
                parts: parts.length > 0 ? parts : undefined,
                createdAt: message.createdDate
            }

            return aiSdkMessage
        })
        .sort((a, b) => {
            if (a.createdAt && b.createdAt) {
                return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            }
            return 0
        })
}

/**
 * Convert Flowise prediction response to AI SDK message format
 */
export function convertFlowiseResponseToAiSdkMessage(response: FlowisePredictionResponse): Message {
    // Flowise uses 'apiMessage' for AI responses and 'userMessage' for user inputs
    // The response.text contains the AI's response content
    return {
        role: 'assistant',
        content: response.text,
        id: response.chatMessageId,
        // Include additional Flowise-specific metadata if available
        ...(response.sourceDocuments && { sourceDocuments: response.sourceDocuments }),
        ...(response.usedTools && { usedTools: response.usedTools }),
        ...(response.fileAnnotations && { fileAnnotations: response.fileAnnotations }),
        ...(response.agentReasoning && { agentReasoning: response.agentReasoning }),
        ...(response.artifacts && { artifacts: response.artifacts }),
        ...(response.action && { action: response.action }),
        ...(response.followUpPrompts && { followUpPrompts: response.followUpPrompts }),
        ...(response.flowVariables && { flowVariables: response.flowVariables }),
        ...(response.executionId && { executionId: response.executionId }),
        ...(response.agentFlowExecutedData && { agentFlowExecutedData: response.agentFlowExecutedData })
    }
}

/**
 * Convert AI SDK message to Flowise message format
 */
export function convertFromAiSdkMessage(message: Message): { role: 'apiMessage' | 'userMessage'; content: string } {
    // Map AI SDK roles to Flowise roles
    switch (message.role) {
        case 'assistant':
            return { role: 'apiMessage', content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content) }
        case 'user':
            return { role: 'userMessage', content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content) }
        case 'system':
            // System messages are typically converted to apiMessage in Flowise
            return { role: 'apiMessage', content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content) }
        default:
            // Default to user message for unknown roles
            return { role: 'userMessage', content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content) }
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
        isError: result.isError
    }))
}
