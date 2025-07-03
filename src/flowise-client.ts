import type { FlowiseClientOptions, FlowisePredictionRequest, FlowisePredictionResponse, FlowiseStreamingChunk } from './types'

export class FlowiseClient {
    private baseUrl: string
    private apiKey?: string
    private timeout: number

    constructor(options: FlowiseClientOptions) {
        this.baseUrl = options.baseUrl
        this.apiKey = options.apiKey
        this.timeout = options.timeout || 30000
    }

    private getHeaders(extra?: Record<string, string>) {
        return {
            'Content-Type': 'application/json',
            ...(this.apiKey && { Authorization: `Bearer ${this.apiKey}` }),
            ...extra,
        }
    }

    private withTimeout<T>(promise: Promise<T>): Promise<T> {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('Request timed out')), this.timeout)
            promise.then(
                (val) => {
                    clearTimeout(timer)
                    resolve(val)
                },
                (err) => {
                    clearTimeout(timer)
                    reject(err)
                }
            )
        })
    }

    async predict(chatflowId: string, request: FlowisePredictionRequest): Promise<FlowisePredictionResponse> {
        try {
            const res = await this.withTimeout(
                fetch(`${this.baseUrl}/api/v1/prediction/${chatflowId}`, {
                    method: 'POST',
                    headers: this.getHeaders(),
                    body: JSON.stringify(request),
                })
            )
            if (!res.ok) {
                let message = `HTTP error: ${res.status}`
                try {
                    const data = await res.json()
                    message = data?.message || message
                } catch {}
                throw new Error(`Flowise API error: ${message}`)
            }
            return await res.json()
        } catch (error) {
            throw new Error(`Flowise API error: ${error instanceof Error ? error.message : String(error)}`)
        }
    }

    async predictStream(chatflowId: string, request: FlowisePredictionRequest): Promise<ReadableStream<FlowiseStreamingChunk>> {
        const streamRequest = { ...request, streaming: true }
        try {
            const res = await this.withTimeout(
                fetch(`${this.baseUrl}/api/v1/prediction/${chatflowId}`, {
                    method: 'POST',
                    headers: this.getHeaders({
                        Accept: 'text/event-stream',
                        'Cache-Control': 'no-cache',
                        Connection: 'keep-alive',
                    }),
                    body: JSON.stringify(streamRequest),
                })
            )
            if (!res.body) throw new Error('No response body for streaming')
            const reader = res.body.getReader()
            return new ReadableStream({
                async start(controller) {
                    let buffer = ''
                    while (true) {
                        const { done, value } = await reader.read()
                        if (done) break
                        buffer += new TextDecoder().decode(value)
                        let lines = buffer.split('\n')
                        buffer = lines.pop() || ''
                        for (const line of lines) {
                            if (line.startsWith('data:')) {
                                const data = line.slice(5)
                                if (data === '[DONE]') {
                                    controller.close()
                                    return
                                }
                                try {
                                    const parsed = JSON.parse(data)
                                    if (parsed.event === 'token') {
                                        if (parsed.data && typeof parsed.data === 'string') {
                                            controller.enqueue({ type: 'text-delta', textDelta: parsed.data })
                                        }
                                    } else if (parsed.event === 'start') {
                                        controller.enqueue({ type: 'start' })
                                    } else if (parsed.event === 'metadata') {
                                        controller.enqueue(parsed)
                                    }
                                } catch {}
                            }
                        }
                    }
                    controller.close()
                },
            })
        } catch (error) {
            throw new Error(`Flowise streaming error: ${error instanceof Error ? error.message : String(error)}`)
        }
    }

    async checkChatflowStreaming(chatflowId: string): Promise<{ isStreaming: boolean }> {
        try {
            const res = await this.withTimeout(
                fetch(`${this.baseUrl}/api/v1/chatflows-streaming/${chatflowId}`, {
                    method: 'GET',
                    headers: this.getHeaders(),
                })
            )
            if (!res.ok) {
                let message = `HTTP error: ${res.status}`
                try {
                    const data = await res.json()
                    message = data?.message || message
                } catch {}
                throw new Error(`Flowise API error: ${message}`)
            }
            return await res.json()
        } catch (error) {
            throw new Error(`Flowise API error: ${error instanceof Error ? error.message : String(error)}`)
        }
    }

    async getChatflow(chatflowId: string): Promise<any> {
        try {
            const res = await this.withTimeout(
                fetch(`${this.baseUrl}/api/v1/chatflows/${chatflowId}`, {
                    method: 'GET',
                    headers: this.getHeaders(),
                })
            )
            if (!res.ok) {
                let message = `HTTP error: ${res.status}`
                try {
                    const data = await res.json()
                    message = data?.message || message
                } catch {}
                throw new Error(`Flowise API error: ${message}`)
            }
            return await res.json()
        } catch (error) {
            throw new Error(`Flowise API error: ${error instanceof Error ? error.message : String(error)}`)
        }
    }
}
