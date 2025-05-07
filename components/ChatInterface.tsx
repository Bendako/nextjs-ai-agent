"use client";

import { useEffect, useRef, useState } from "react";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { ChatRequestBody, StreamMessageType } from "@/lib/types";
import WelcomeMessage from "@/components/WelcomeMessage";
import { createSSEParser } from "@/lib/SSEParser";
import { MessageBubble } from "@/components/MessageBubble";
import { ArrowRight } from "lucide-react";
import { getConvexClient } from "@/lib/convex";
import { api } from "@/convex/_generated/api";

interface ChatInterfaceProps {
  chatId: Id<"chats">;
  initialMessages: Doc<"messages">[];
}

export default function ChatInterface({
  chatId,
  initialMessages,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Doc<"messages">[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamedResponse, setStreamedResponse] = useState("");
  const [currentTool, setCurrentTool] = useState<{
    name: string;
    input: unknown;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamedResponse]);

  const formatToolOutput = (output: unknown): string => {
    if (typeof output === "string") return output;
    return JSON.stringify(output, null, 2);
  };

  const formatTerminalOutput = (
    tool: string,
    input: unknown,
    output: unknown
  ) => {
    const terminalHtml = `<div class="bg-[#1e1e1e] text-white font-mono p-2 rounded-md my-2 overflow-x-auto whitespace-normal max-w-[600px]">
      <div class="flex items-center gap-1.5 border-b border-gray-700 pb-1">
        <span class="text-red-500">●</span>
        <span class="text-yellow-500">●</span>
        <span class="text-green-500">●</span>
        <span class="text-gray-400 ml-1 text-sm">~/${tool}</span>
      </div>
      <div class="text-gray-400 mt-1">$ Input</div>
      <pre class="text-yellow-400 mt-0.5 whitespace-pre-wrap overflow-x-auto">${formatToolOutput(input)}</pre>
      <div class="text-gray-400 mt-2">$ Output</div>
      <pre class="text-green-400 mt-0.5 whitespace-pre-wrap overflow-x-auto">${formatToolOutput(output)}</pre>
    </div>`;

    return `---START---\n${terminalHtml}\n---END---`;
  };

  /**
   * Processes a ReadableStream from the SSE response.
   * This function continuously reads chunks of data from the stream until it's done.
   * Each chunk is decoded from Uint8Array to string and passed to the callback.
   */
  const processStream = async (
    reader: ReadableStreamDefaultReader<Uint8Array>,
    onChunk: (chunk: string) => Promise<void>
  ) => {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = new TextDecoder().decode(value);
        console.log('[SSE] Raw chunk received:', chunk);
        await onChunk(chunk);
      }
    } finally {
      reader.releaseLock();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    // Reset UI state for new message
    setInput("");
    setStreamedResponse("");
    setCurrentTool(null);
    setIsLoading(true);

    // Save the user message to the database first
    const convex = getConvexClient();
    const userMessageStoreResult = await convex.mutation(api.messages.store, {
      chatId,
      content: trimmedInput,
      role: "user",
    });

    // Assume userMessageStoreResult contains at least the _id (or messageId)
    // and chatId. Based on previous logs for assistant messages, Convex returns messageId and chatId.
    const returnedUserData = userMessageStoreResult as unknown as { messageId: Id<"messages">; chatId: Id<"chats">; role: string };

    const userMessageForState: Doc<"messages"> = {
      _id: returnedUserData.messageId,
      chatId: returnedUserData.chatId || chatId, // Prefer returned chatId, fallback to component's chatId
      content: trimmedInput,                     // CRITICAL: Use the original trimmedInput for content
      role: "user",
      _creationTime: Date.now(),                 // Fallback, as Convex might not return this for the UI
      createdAt: Date.now(),                     // Fallback, as per previous linter fixes and type requirements
    };

    // Update messages with the correctly constructed user message
    setMessages((prev) => [...prev, userMessageForState]);

    // Track complete response for saving to database
    let fullResponse = "";

    try {
      // Prepare chat history and new message for API
      const requestBody: ChatRequestBody = {
        messages: [
          ...messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          {
            role: "user" as const,
            content: trimmedInput,
          }
        ],
        newMessage: trimmedInput,
        chatId,
      };

      console.log('[Chat] Sending request:', requestBody);

      // Initialize SSE connection
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) throw new Error(await response.text());
      if (!response.body) throw new Error("No response body available");

      // Create SSE parser and stream reader
      const parser = createSSEParser();
      const reader = response.body.getReader();

      // Process the stream chunks
      await processStream(reader, async (chunk) => {
        // Parse SSE messages from the chunk
        const messages = parser.parse(chunk);
        console.log('[Chat] Parsed messages:', messages);

        // Handle each message based on its type
        for (const message of messages) {
          console.log('[Chat] Processing message:', message);
          switch (message.type) {
            case StreamMessageType.Token:
              console.log("[Chat] Received token:", message.token);
              setStreamedResponse((prev) => {
                console.log('[Chat] Previous response:', prev);
                const newResponse = prev + message.token;
                console.log('[Chat] New response:', newResponse);
                return newResponse;
              });
              fullResponse += message.token;
              break;

            case StreamMessageType.ToolStart:
              // Handle start of tool execution (e.g. API calls, file operations)
              if ("tool" in message) {
                console.log('[Chat] Tool started:', message.tool);
                setCurrentTool({
                  name: message.tool,
                  input: message.input,
                });
                fullResponse += formatTerminalOutput(
                  message.tool,
                  message.input,
                  "Processing..."
                );
                setStreamedResponse(fullResponse);
              }
              break;

            case StreamMessageType.ToolEnd:
              // Handle completion of tool execution
              if ("tool" in message && currentTool) {
                console.log('[Chat] Tool ended:', message.tool);
                // Replace the "Processing..." message with actual output
                const lastTerminalIndex = fullResponse.lastIndexOf(
                  '<div class="bg-[#1e1e1e]'
                );
                if (lastTerminalIndex !== -1) {
                  fullResponse =
                    fullResponse.substring(0, lastTerminalIndex) +
                    formatTerminalOutput(
                      message.tool,
                      currentTool.input,
                      message.output
                    );
                  setStreamedResponse(fullResponse);
                }
                setCurrentTool(null);
              }
              break;

            case StreamMessageType.Error:
              // Handle error messages from the stream
              if ("error" in message) {
                console.error('[Chat] Error message received:', message.error);
                throw new Error(message.error);
              }
              break;

            case StreamMessageType.Done:
              console.log('[Chat] Stream completed');
              // Only store the assistant message if the response is not empty
              if (fullResponse.trim().length > 0) {
                const storeMutationResult = await convex.mutation(api.messages.store, {
                  chatId,
                  content: fullResponse,
                  role: "assistant",
                });

                // Assuming storeMutationResult contains at least the _id (or messageId) and other identifiers.
                // Based on logs: { messageId: Id<"messages">, chatId: Id<"chats">, role: "assistant" }
                // We need to ensure the object added to state is a complete Doc<"messages">.
                // Let's assume the result object has a 'messageId' field for the ID.
                const returnedData = storeMutationResult as unknown as { messageId: Id<"messages">; chatId: Id<"chats">; role: string /* and potentially other fields */ };

                const newAssistantMessageForState: Doc<"messages"> = {
                  _id: returnedData.messageId,
                  chatId: returnedData.chatId || chatId,
                  role: "assistant",
                  content: fullResponse,
                  _creationTime: Date.now(),
                  createdAt: Date.now(),
                };

                // Update messages with the correctly constructed assistant message
                setMessages((prev) => [...prev, newAssistantMessageForState]);
                setStreamedResponse("");
              } else {
                // Show an error message in the chat if the assistant response is empty
                setStreamedResponse(
                  formatTerminalOutput(
                    "error",
                    "Assistant did not return a response.",
                    "No response generated. Please try again or rephrase your question."
                  )
                );
              }
              return;
          }
        }
      });
    } catch (error) {
      // Handle any errors during streaming
      console.error("Error sending message:", error);
      // Remove the optimistic user message if there was an error
      setMessages((prev) =>
        prev.filter((msg) => msg._id !== userMessageForState._id)
      );
      setStreamedResponse(
        formatTerminalOutput(
          "error",
          "Failed to process message",
          error instanceof Error ? error.message : "Unknown error"
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main 
      className="flex flex-col h-[calc(100vh-theme(spacing.14))]"
      suppressHydrationWarning
    >
      {/* Messages container */}
      <section className="flex-1 overflow-y-auto bg-gray-50 p-2 md:p-0">
        <div className="max-w-4xl mx-auto p-4 space-y-3">
          {messages?.length === 0 && <WelcomeMessage />}

          {messages?.map((message, index) => (
            <MessageBubble
              key={message._id?.toString() || `msg_${index}`}
              content={message.content}
              isUser={message.role === "user"}
            />
          ))}

          {streamedResponse && <MessageBubble content={streamedResponse} />}

          {/* Loading indicator */}
          {isLoading && !streamedResponse && (
            <div className="flex justify-start animate-in fade-in-0">
              <div className="rounded-2xl px-4 py-3 bg-white text-gray-900 rounded-bl-none shadow-sm ring-1 ring-inset ring-gray-200">
                <div className="flex items-center gap-1.5">
                  {[0.3, 0.15, 0].map((delay, i) => (
                    <div
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce"
                      style={{ animationDelay: `-${delay}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </section>

      {/* Input form */}
      <footer className="border-t bg-white p-4">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative">
          <div className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message AI Agent..."
              className="flex-1 py-3 px-4 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12 bg-gray-50 placeholder:text-gray-500"
              disabled={isLoading}
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              className={`absolute right-1.5 rounded-xl h-9 w-9 p-0 flex items-center justify-center transition-all ${
                input.trim()
                  ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              <ArrowRight />
            </Button>
          </div>
        </form>
      </footer>
    </main>
  );
}
