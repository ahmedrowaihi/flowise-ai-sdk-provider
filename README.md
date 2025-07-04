[![pkg.pr.new](https://pkg.pr.new/badge/ahmedrowaihi/flowise-ai-sdk-provider)](https://pkg.pr.new/~/ahmedrowaihi/flowise-ai-sdk-provider)

# AI SDK - Flowise Provider

![NPM Version](https://img.shields.io/npm/v/@ahmedrowaihi/flowise-vercel-ai-sdk-provider)

## Setup

The Flowise provider is available in the `@ahmedrowaihi/flowise-vercel-ai-sdk-provider` module. You can install it with

```bash
npm i @ahmedrowaihi/flowise-vercel-ai-sdk-provider
```

> **Note:** This package is dependency-free and requires **Node.js 18+** for native `fetch` support.

## Usage Patterns

The Flowise provider supports two usage patterns:

### 1. Reusable Provider (Recommended for multiple chatflows)

Create a provider instance that can be reused for multiple chatflows:

```ts
import { createFlowiseProvider } from "@ahmedrowaihi/flowise-vercel-ai-sdk-provider";
```

### 2. One-shot Model (Convenient for single chatflow)

Create a model instance directly with credentials and chatflow ID:

```ts
import { createFlowiseModel } from "@ahmedrowaihi/flowise-vercel-ai-sdk-provider";
```

## Quick Start

### Using Reusable Provider

Create a file called `.env.local` and add your Flowise configuration:

```text
FLOWISE_BASE_URL=https://your-flowise-instance.com
FLOWISE_API_KEY=your_api_key_optional
```

```ts
import { createFlowiseProvider } from "@ahmedrowaihi/flowise-vercel-ai-sdk-provider";
import { generateText } from "ai";

const flowise = createFlowiseProvider({
  baseUrl: process.env.FLOWISE_BASE_URL,
  apiKey: process.env.FLOWISE_API_KEY,
});

const { text } = await generateText({
  model: flowise("your-chatflow-id"),
  prompt: "Write a vegetarian lasagna recipe for 4 people.",
});
```

### Using One-shot Model

```ts
import { createFlowiseModel } from "@ahmedrowaihi/flowise-vercel-ai-sdk-provider";
import { generateText } from "ai";

const { text } = await generateText({
  model: createFlowiseModel({
    baseUrl: process.env.FLOWISE_BASE_URL,
    apiKey: process.env.FLOWISE_API_KEY,
    chatflowId: "your-chatflow-id",
  }),
  prompt: "Write a vegetarian lasagna recipe for 4 people.",
});
```

### Local Flowise instance (<http://localhost:3000>)

**With reusable provider:**

```ts
import { createFlowiseProvider } from "@ahmedrowaihi/flowise-vercel-ai-sdk-provider";
import { generateText } from "ai";

const flowise = createFlowiseProvider({
  baseUrl: "http://localhost:3000",
});

const { text } = await generateText({
  model: flowise("your-chatflow-id"),
  prompt: "Write a vegetarian lasagna recipe for 4 people.",
});
```

**With one-shot model:**

```ts
import { createFlowiseModel } from "@ahmedrowaihi/flowise-vercel-ai-sdk-provider";
import { generateText } from "ai";

const { text } = await generateText({
  model: createFlowiseModel({
    baseUrl: "http://localhost:3000",
    chatflowId: "your-chatflow-id",
  }),
  prompt: "Write a vegetarian lasagna recipe for 4 people.",
});
```

### Using Streaming

**With reusable provider:**

```ts
import { streamText } from "ai";
import { createFlowiseProvider } from "@ahmedrowaihi/flowise-vercel-ai-sdk-provider";

const flowise = createFlowiseProvider({
  baseUrl: process.env.FLOWISE_BASE_URL,
  apiKey: process.env.FLOWISE_API_KEY,
});

const result = streamText({
  model: flowise("your-chatflow-id"),
  prompt: "Write a story about a robot learning to cook.",
});

return result.toDataStreamResponse();
```

**With one-shot model:**

```ts
import { streamText } from "ai";
import { createFlowiseModel } from "@ahmedrowaihi/flowise-vercel-ai-sdk-provider";

const result = streamText({
  model: createFlowiseModel({
    baseUrl: process.env.FLOWISE_BASE_URL,
    apiKey: process.env.FLOWISE_API_KEY,
    chatflowId: "your-chatflow-id",
  }),
  prompt: "Write a story about a robot learning to cook.",
});

return result.toDataStreamResponse();
```

### Using other Flowise Client Functions

The `vercel-ai-sdk-provider` extends the Flowise client, you can access the operations directly by using `flowise.client` or your custom generated client:

```ts
import { createFlowiseProvider } from "@ahmedrowaihi/flowise-vercel-ai-sdk-provider";

const flowise = createFlowiseProvider({
  baseUrl: process.env.FLOWISE_BASE_URL,
  apiKey: process.env.FLOWISE_API_KEY,
});

// Check if a chatflow supports streaming
const streamingInfo = await flowise.client.checkChatflowStreaming(
  "your-chatflow-id"
);

// Get chatflow details
const chatflow = await flowise.client.getChatflow("your-chatflow-id");
```

## Environment Variables

| Variable           | Description                           | Default |
| ------------------ | ------------------------------------- | ------- |
| `FLOWISE_BASE_URL` | The base URL of your Flowise instance | -       |
| `FLOWISE_API_KEY`  | Your Flowise API key (optional)       | -       |

> **Note:** Environment variables are not read automatically by the package. You must pass them explicitly to `createFlowiseProvider` or `createFlowiseModel` if you want to use them.

## Features

- ✅ **Chatflow Execution**: Execute any Flowise chatflow as a language model
- ✅ **Streaming Support**: Real-time streaming responses from Flowise
- ✅ **Non-Streaming Support**: Support for standard (non-streaming) responses from Flowise
- ✅ **File Uploads**: Supported — Native file uploads, including PDF/text extraction via Flowise attachment API
- ⚠️ **Custom Variables**: Not supported in the SDK
- ⚠️ **Memory Support**: Not supported in the SDK
- ⚠️ **Tool Calls**: Not supported in the SDK
- ⚠️ **Error Handling**: Only basic error handling (API errors are thrown)

## File Uploads & Attachments

The Flowise provider now natively supports file uploads in prompts. You can include any valid AI SDK `FilePart` (Buffer, Uint8Array, ArrayBuffer, base64 string, data URL, or URL) in your prompt, and the SDK will:

- Automatically convert and upload files as needed
- Dynamically select the correct upload type (e.g., `file:full` for PDFs)
- Preprocess files via the Flowise attachment API for extraction (e.g., extract text from PDFs)
- Handle chat session IDs (`chatId`) for multi-turn conversations or file association

**Minimal Example:**

```ts
import { createFlowiseProvider } from "@ahmedrowaihi/flowise-vercel-ai-sdk-provider";
import { generateText } from "ai";

const flowise = createFlowiseProvider({
  baseUrl: process.env.FLOWISE_BASE_URL,
  apiKey: process.env.FLOWISE_API_KEY,
});

const fileBuffer = Buffer.from(
  "This is a test file for Flowise upload.",
  "utf-8"
);

const { text } = await generateText({
  model: flowise("your-chatflow-id"),
  prompt: [
    {
      role: "user",
      content: [
        { type: "text", text: "Please analyze the attached file." },
        {
          type: "file",
          filename: "test.txt",
          data: fileBuffer, // Buffer, ArrayBuffer, base64, or URL
          mediaType: "text/plain",
        },
      ],
    },
  ],
});
console.log("AI response:", text);
```

**PDF Example:**

```ts
const pdfBuffer = fs.readFileSync("./sample.pdf");
const { text } = await generateText({
  model: flowise("your-chatflow-id"),
  prompt: [
    {
      role: "user",
      content: [
        { type: "text", text: "Summarize the PDF." },
        {
          type: "file",
          filename: "sample.pdf",
          data: pdfBuffer,
          mediaType: "application/pdf",
        },
      ],
    },
  ],
});
```

**Session Control:**

You can control chat session continuity by passing a `chatId` in `providerOptions`:

```ts
const { text } = await generateText({
  model: flowise("your-chatflow-id"),
  providerOptions: {
    chatId: "your-session-uuid" // optional
  },
  prompt: [...]
});
```

The SDK will use this `chatId` for both file extraction and prediction, ensuring session continuity.

> **Note:**
> The `chatId` is **optional**. If you do not provide one, the SDK will automatically generate a unique `chatId` as needed (for file uploads or session continuity). You only need to specify `chatId` if you want to control or resume a specific chat session.

---

**Type Safety & Modularity:**

This SDK is now fully type-safe and modular. All upload, config, and attachment logic is decoupled into separate utilities for maintainability and extensibility. Advanced users can extend or swap out these modules as needed.

## API Reference

### `createFlowiseProvider(options)`

Creates a new Flowise provider instance that can be reused for multiple chatflows.

**Options:**

- `baseUrl: string` - The base URL of your Flowise instance (required)
- `apiKey?: string` - Your Flowise API key (optional)
- `timeout?: number` - Request timeout in milliseconds (default: 30000)

**Returns:** A provider function that accepts a `chatflowId` and returns a model instance.

### `createFlowiseModel(options)`

Creates a Flowise model instance directly with credentials and chatflow ID.

**Options:**

- `baseUrl: string` - The base URL of your Flowise instance (required)
- `apiKey?: string` - Your Flowise API key (optional)
- `timeout?: number` - Request timeout in milliseconds (default: 30000)
- `chatflowId: string` - The ID of the chatflow to use (required)

**Returns:** A model instance ready to use with AI SDK functions.

### `convertToAiSdkMessage(messages, options)`

Converts Flowise chat messages to AI SDK format.

### `convertToFlowiseMessage(prompt)`

Converts AI SDK prompts to Flowise message format.

## Examples

### Next.js API Route with Streaming

**With reusable provider:**

```ts
// app/api/chat/route.ts
import { streamText } from "ai";
import { createFlowiseProvider } from "@ahmedrowaihi/flowise-vercel-ai-sdk-provider";

const flowise = createFlowiseProvider({
  baseUrl: process.env.FLOWISE_BASE_URL,
  apiKey: process.env.FLOWISE_API_KEY,
});

export async function POST(req: Request) {
  const { messages } = await req.json();

  if (!process.env.FLOWISE_CHATFLOW_ID) {
    throw new Error("Missing FLOWISE_CHATFLOW_ID environment variable");
  }

  const result = streamText({
    model: flowise(process.env.FLOWISE_CHATFLOW_ID),
    messages,
  });

  return result.toDataStreamResponse();
}
```

**With one-shot model:**

```ts
// app/api/chat/route.ts
import { streamText } from "ai";
import { createFlowiseModel } from "@ahmedrowaihi/flowise-vercel-ai-sdk-provider";

export async function POST(req: Request) {
  const { messages } = await req.json();

  if (!process.env.FLOWISE_CHATFLOW_ID) {
    throw new Error("Missing FLOWISE_CHATFLOW_ID environment variable");
  }

  const result = streamText({
    model: createFlowiseModel({
      baseUrl: process.env.FLOWISE_BASE_URL,
      apiKey: process.env.FLOWISE_API_KEY,
      chatflowId: process.env.FLOWISE_CHATFLOW_ID,
    }),
    messages,
  });

  return result.toDataStreamResponse();
}
```

### React Component with useChat

**With reusable provider:**

```tsx
// components/Chat.tsx
"use client";

import { useChat } from "@ai-sdk/react";
import { createFlowiseProvider } from "@ahmedrowaihi/flowise-vercel-ai-sdk-provider";

const flowise = createFlowiseProvider({
  baseUrl: process.env.FLOWISE_BASE_URL,
  apiKey: process.env.FLOWISE_API_KEY,
});

export function Chat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: "/api/chat",
  });

  return (
    <div>
      {messages.map((message) => (
        <div key={message.id}>
          {message.role === "user" ? "User: " : "AI: "}
          {message.content}
        </div>
      ))}

      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Say something..."
        />
      </form>
    </div>
  );
}
```

## More Examples

Check out our examples in the [examples directory](examples/) for more detailed usage patterns.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Contributors

- **[Ahmed Rowaihi](https://github.com/ahmedrowaihi)** - _Initial work_ - [@ahmedrowaihi](https://github.com/ahmedrowaihi)

## Acknowledgments

was inspired by [@letta-ai/vercel-ai-sdk-provider](https://www.npmjs.com/package/@letta-ai/vercel-ai-sdk-provider) maintained by [cpacker](mailto:packercharles@gmail.com) and [4shub](mailto:shub@shub.club). Their excellent work on the Letta AI SDK provider served as a reference for implementing this Flowise provider.

## PR Preview Packages

Every pull request automatically builds a preview package. To install a preview from a PR, use the link provided in the PR comment by pkg.pr.new, for example:

```
npm i https://pkg.pr.new/ahmedrowaihi/flowise-ai-sdk-provider/flowise-ai-sdk-provider@<commit>
```

Replace `<commit>` with the commit hash from the PR comment.

---

### File Upload Modes

Flowise supports several file upload modes, which determine how files are processed and made available to the LLM:

| Mode        | Description                                                                       | SDK Support  |
| ----------- | --------------------------------------------------------------------------------- | ------------ |
| `file`      | Standard file upload (e.g., images, text files)                                   | ✅ Yes       |
| `file:full` | Full file extraction (e.g., PDFs, DOCX; content is extracted and sent to the LLM) | ✅ Yes       |
| `file:rag`  | Retrieval-augmented generation (RAG) file upload (for chunked retrieval)          | ✅ Yes       |
| `audio`     | Audio file upload (for transcription, if supported by chatflow)                   | ⚠️ Partial\* |

\*Audio uploads are supported if your Flowise chatflow is configured to process audio files, but the SDK does not perform audio transcription itself.

#### How the SDK Chooses the Upload Mode

The SDK automatically determines the correct upload mode for each file based on your chatflow's configuration:

- If `fullFileUpload.status` is enabled, files like PDFs are uploaded as `file:full` and preprocessed via the Flowise attachment API for content extraction.
- If RAG is enabled, files are uploaded as `file:rag`.
- Images and standard files use `file` mode.
- The SDK validates file type and size against your chatflow's constraints and will warn if a file is not allowed.

You do not need to manually specify the upload mode—the SDK handles this for you.

---
