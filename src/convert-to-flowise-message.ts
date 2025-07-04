import type { LanguageModelV2Prompt } from '@ai-sdk/provider'

export function convertToFlowiseMessage(prompt: LanguageModelV2Prompt): string {
    // For simple single-message prompts, return the user message
    if (prompt.length === 1 && prompt[0]?.role === 'user') {
        const message = prompt[0]!
        if (Array.isArray(message.content)) {
            return message.content
                .map((content: { type: string; text?: string }) => {
                    if (content.type === 'text') {
                        return content.text
                    }
                    throw new Error(`Content type ${content.type} not supported`)
                })
                .join('')
        }
        return message.content as string
    }

    // For conversation history, format as a conversation
    const conversation = prompt
        .map((message: { role: string; content: any }) => {
            let content: string

            if (Array.isArray(message.content)) {
                content = message.content
                    .map((content: { type: string; text?: string }) => {
                        if (content.type === 'text') {
                            return content.text
                        }
                        throw new Error(`Content type ${content.type} not supported`)
                    })
                    .join('')
            } else {
                content = message.content as string
            }

            return `${message.role === 'user' ? 'User' : 'Assistant'}: ${content}`
        })
        .join('\n')

    return conversation
}
